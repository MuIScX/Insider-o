import express from 'express';
import cors from 'cors';
import { GameLobby, Player } from './types';
import fs from 'fs';
import path from 'path';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (in a real app, you'd use a database)
const lobbies: { [key: string]: GameLobby } = {};
const lobbyCodes: { [key: string]: string } = {};

// Add this type at the top with other types
type GameRole = 'master' | 'insider' | 'common';

interface GamePlayer extends Player {
  role: GameRole;
}

interface GameState {
  word: string;
  players: GamePlayer[];
  status: 'waiting' | 'starting' | 'playing' | 'ended';
  startTime?: number;
  wordGuessed: boolean;
  endTime?: number;
  winner?: string;
  gameDuration: number;
}

// Add this after other in-memory storage
const games: { [key: string]: GameState } = {};

// Add this after other interfaces
interface Vote {
  voterId: string;
  votedForId: string;
}

// Add this after other in-memory storage
const votes: { [key: string]: Vote[] } = {};

// Helper functions
const generateLobbyCode = (): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

// Add these helper functions
const getRandomWord = (): string => {
  try {
    const wordsPath = path.join(__dirname, 'words.csv');
    const wordsContent = fs.readFileSync(wordsPath, 'utf-8');
    const words = wordsContent.split('\n').filter(word => word.trim() !== '');
    
    if (words.length === 0) {
      throw new Error('No words found in the CSV file');
    }
    
    return words[Math.floor(Math.random() * words.length)];
  } catch (error) {
    console.error('Error reading words from CSV:', error);
    // Fallback to a default word if there's an error
    return 'DEFAULT';
  }
};

const assignRoles = (players: Player[]): GamePlayer[] => {
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
  const gamePlayers: GamePlayer[] = [];

  // Assign master (first player)
  gamePlayers.push({
    ...shuffledPlayers[0],
    role: 'master'
  });

  // Assign insider (second player)
  gamePlayers.push({
    ...shuffledPlayers[1],
    role: 'insider'
  });

  // Assign commoners (remaining players)
  for (let i = 2; i < shuffledPlayers.length; i++) {
    gamePlayers.push({
      ...shuffledPlayers[i],
      role: 'common'
    });
  }

  return gamePlayers;
};

// Routes
app.post('/api/lobbies', (req, res) => {
  const { hostName } = req.body;
  if (!hostName) {
    return res.status(400).json({ error: 'Host name is required' });
  }

  const hostId = generateId();
  const lobbyId = generateId();
  const code = generateLobbyCode();

  const host: Player = {
    id: hostId,
    name: hostName,
    isHost: true,
    isReady: false,
  };

  const lobby: GameLobby = {
    id: lobbyId,
    code,
    players: [host],
    maxPlayers: 8,
    status: 'waiting',
    createdAt: Date.now(),
  };

  lobbies[lobbyId] = lobby;
  lobbyCodes[code] = lobbyId;

  console.log('Created new lobby:', {
    lobbyCode: code,
    username: hostName,
    lobbyId: lobbyId
  });

  res.json(lobby);
});

app.post('/api/lobbies/join', (req, res) => {
  const { code, playerName } = req.body;
  if (!code || !playerName) {
    return res.status(400).json({ error: 'Code and player name are required' });
  }

  const lobbyId = lobbyCodes[code];
  if (!lobbyId) {
    return res.status(404).json({ error: 'Invalid lobby code' });
  }

  const lobby = lobbies[lobbyId];
  if (!lobby) {
    return res.status(404).json({ error: 'Lobby not found' });
  }

  if (lobby.players.length >= lobby.maxPlayers) {
    return res.status(400).json({ error: 'Lobby is full' });
  }

  if (lobby.players.some(p => p.name === playerName)) {
    return res.status(400).json({ error: 'Player name already exists' });
  }

  const newPlayer: Player = {
    id: generateId(),
    name: playerName,
    isHost: false,
    isReady: false,
  };

  lobby.players.push(newPlayer);
  res.json(lobby);
});

app.get('/api/lobbies/:lobbyId', (req, res) => {
  const { lobbyId } = req.params;
  const lobby = lobbies[lobbyId];
  
  if (!lobby) {
    return res.status(404).json({ error: 'Lobby not found' });
  }

  res.json(lobby);
});

app.post('/api/lobbies/:lobbyId/ready', (req, res) => {
  const { lobbyId } = req.params;
  const { playerId } = req.body;

  const lobby = lobbies[lobbyId];
  if (!lobby) {
    return res.status(404).json({ error: 'Lobby not found' });
  }

  const player = lobby.players.find(p => p.id === playerId);
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  player.isReady = !player.isReady;
  res.json(lobby);
});

app.post('/api/lobbies/:lobbyId/leave', (req, res) => {
  const { lobbyId } = req.params;
  const { playerId } = req.body;

  const lobby = lobbies[lobbyId];
  if (!lobby) {
    return res.status(404).json({ error: 'Lobby not found' });
  }

  const playerIndex = lobby.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const isHost = lobby.players[playerIndex].isHost;
  lobby.players.splice(playerIndex, 1);

  if (isHost && lobby.players.length > 0) {
    lobby.players[0].isHost = true;
  }

  if (lobby.players.length === 0) {
    delete lobbies[lobbyId];
    delete lobbyCodes[lobby.code];
    return res.json(null);
  }

  res.json(lobby);
});

app.post('/api/lobbies/:lobbyId/start', (req, res) => {
  const { lobbyId } = req.params;
  const { gameDuration } = req.body;
  const lobby = lobbies[lobbyId];
  
  if (!lobby) {
    return res.status(404).json({ error: 'Lobby not found' });
  }

  // Check if all non-host players are ready
  const allNonHostPlayersReady = lobby.players
    .filter(p => !p.isHost)
    .every(p => p.isReady);

  if (!allNonHostPlayersReady) {
    return res.status(400).json({ error: 'Not all players are ready' });
  }

  // Get random word
  const word = getRandomWord();

  // Assign roles to players
  const gamePlayers = assignRoles(lobby.players);

  // Create game state
  const gameState: GameState = {
    word,
    players: gamePlayers,
    status: 'playing',
    startTime: Date.now(),
    wordGuessed: false,
    gameDuration: gameDuration || 5 * 60 * 1000 // Default to 5 minutes if not specified
  };

  // Store game state
  games[lobbyId] = gameState;
  lobby.status = 'starting';

  res.json({
    ...lobby,
    gameState
  });
});

app.get('/api/games/:lobbyId', (req, res) => {
  const { lobbyId } = req.params;
  const gameState = games[lobbyId];
  
  if (!gameState) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // If the game has ended, include the final state
  if (gameState.status === 'ended') {
    return res.json({
      ...gameState,
      timeLeft: 0
    });
  }

  res.json(gameState);
});

app.post('/api/games/:lobbyId/guess', (req, res) => {
  const { lobbyId } = req.params;
  const { playerId } = req.body;

  const gameState = games[lobbyId];
  if (!gameState) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const player = gameState.players.find(p => p.id === playerId);
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  if (player.role !== 'master') {
    return res.status(403).json({ error: 'Only the master can mark the word as guessed' });
  }

  // Update game state
  gameState.wordGuessed = true;
  gameState.status = 'ended';
  gameState.endTime = Date.now();
  gameState.winner = 'master';

  // Update the lobby status
  const lobby = lobbies[lobbyId];
  if (lobby) {
    lobby.status = 'ended';
  }

  // Return the final game state
  res.json({
    gameState,
    timeLeft: 0,
    shouldRedirect: true
  });
});

app.get('/api/games/:lobbyId/time', (req, res) => {
  const { lobbyId } = req.params;
  const gameState = games[lobbyId];
  
  if (!gameState) {
    return res.status(404).json({ error: 'Game not found' });
  }

  if (!gameState.startTime) {
    return res.status(400).json({ error: 'Game has not started' });
  }

  const now = Date.now();
  const timeLeft = Math.max(0, gameState.gameDuration - (now - gameState.startTime));

  // If time is up and word hasn't been guessed, end the game
  if (timeLeft === 0 && !gameState.wordGuessed) {
    gameState.status = 'ended';
    gameState.endTime = now;
    gameState.winner = 'insider';
    
    // Initialize votes array for this lobby
    if (!votes[lobbyId]) {
      votes[lobbyId] = [];
    }

    // Add placeholder votes for all players to skip voting stage
    gameState.players.forEach(player => {
      if (!votes[lobbyId].some(v => v.voterId === player.id)) {
        votes[lobbyId].push({
          voterId: player.id,
          votedForId: player.id // Self-vote to indicate skipped voting
        });
      }
    });

    // Update the lobby status
    const lobby = lobbies[lobbyId];
    if (lobby) {
      lobby.status = 'ended';
    }
  }

  res.json({ 
    timeLeft,
    shouldRedirect: timeLeft === 0 && !gameState.wordGuessed,
    gameState: timeLeft === 0 ? gameState : undefined
  });
});

app.post('/api/games/:lobbyId/vote', (req, res) => {
  const { lobbyId } = req.params;
  const { voterId, votedForId } = req.body;

  const gameState = games[lobbyId];
  if (!gameState) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // Initialize votes array for this lobby if it doesn't exist
  if (!votes[lobbyId]) {
    votes[lobbyId] = [];
  }

  // Check if player has already voted
  const existingVote = votes[lobbyId].find(v => v.voterId === voterId);
  if (existingVote) {
    return res.status(400).json({ error: 'You have already voted' });
  }

  // Add the vote
  votes[lobbyId].push({ voterId, votedForId });

  // Calculate vote counts
  const voteCounts = votes[lobbyId].reduce((acc, vote) => {
    acc[vote.votedForId] = (acc[vote.votedForId] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  // Check if all players have voted
  const allPlayersVoted = gameState.players.length === votes[lobbyId].length;
  
  // If all players have voted, determine the result
  if (allPlayersVoted) {
    const maxVotes = Math.max(...Object.values(voteCounts));
    const mostVotedPlayers = Object.entries(voteCounts)
      .filter(([_, count]) => count === maxVotes)
      .map(([playerId]) => playerId);

    // Find the insider
    const insider = gameState.players.find(p => p.role === 'insider');
    
    // Determine the winner
    if (mostVotedPlayers.length === 1 && mostVotedPlayers[0] === insider?.id) {
      gameState.winner = 'master'; // Master and Commoners win if they correctly identify the Insider
    } else {
      gameState.winner = 'insider'; // Insider wins if they are not correctly identified
    }

    gameState.status = 'ended';
    gameState.endTime = Date.now();
  }

  res.json({
    gameState,
    votes: votes[lobbyId],
    voteCounts,
    allPlayersVoted
  });
});

app.get('/api/games/:lobbyId/votes', (req, res) => {
  const { lobbyId } = req.params;
  
  if (!votes[lobbyId]) {
    return res.json({ votes: [], voteCounts: {} });
  }

  // Calculate vote counts
  const voteCounts = votes[lobbyId].reduce((acc, vote) => {
    acc[vote.votedForId] = (acc[vote.votedForId] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  res.json({ 
    votes: votes[lobbyId],
    voteCounts
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 