import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameState, GamePlayer } from '../types/game';
import { API_URL } from '../config';

interface VoteCounts {
  [playerId: string]: number;
}

const Voting: React.FC = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [votes, setVotes] = useState<{ voterId: string; votedForId: string }[]>([]);
  const [voteCounts, setVoteCounts] = useState<VoteCounts>({});
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    const lobbyId = localStorage.getItem('currentLobbyId');
    const playerId = localStorage.getItem('playerId');

    if (!lobbyId || !playerId) {
      navigate('/');
      return;
    }

    const fetchGameState = async () => {
      try {
        const response = await fetch(`${API_URL}/games/${lobbyId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch game state');
        }
        const state = await response.json();
        setGameState(state);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching game state:', err);
        setError('Failed to load game state');
        setIsLoading(false);
      }
    };

    const fetchVotes = async () => {
      try {
        const response = await fetch(`${API_URL}/games/${lobbyId}/votes`);
        if (!response.ok) {
          throw new Error('Failed to fetch votes');
        }
        const data = await response.json();
        setVotes(data.votes);
        setVoteCounts(data.voteCounts);

        // Check if all players have voted
        if (gameState && data.votes.length === gameState.players.length) {
          navigate('/results');
        }
      } catch (err) {
        console.error('Error fetching votes:', err);
      }
    };

    fetchGameState();
    fetchVotes();

    // Poll for vote updates
    const interval = setInterval(fetchVotes, 1000);
    return () => clearInterval(interval);
  }, [navigate, gameState]);

  const handleVote = async (votedForId: string) => {
    const lobbyId = localStorage.getItem('currentLobbyId');
    const playerId = localStorage.getItem('playerId');

    if (!lobbyId || !playerId) return;

    try {
      const response = await fetch(`${API_URL}/games/${lobbyId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voterId: playerId,
          votedForId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit vote');
      }

      const data = await response.json();
      setVotes(data.votes);
      setVoteCounts(data.voteCounts);
      setSelectedPlayer(votedForId);
      setHasVoted(true);
    } catch (err) {
      console.error('Error submitting vote:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit vote');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading voting page...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    );
  }

  if (!gameState || !gameState.players) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Game not found or no players available</div>
      </div>
    );
  }

  const playerId = localStorage.getItem('playerId');
  const currentPlayer = playerId ? gameState.players.find(p => p.id === playerId) : null;
  const playerHasVoted = votes.some(v => v.voterId === playerId);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-2xl w-full bg-surface rounded-lg shadow-lg p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center text-primary mb-6">
            Voting Phase
          </h1>
          {playerHasVoted && (
            <p className="text-center text-green-600 mb-4">
              You have submitted your vote. Waiting for other players...
            </p>
          )}
          <p className="text-center text-gray-600 mb-4">
            {votes.length} of {gameState.players.length} players have voted
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Vote for the Insider</h2>
          <div className="space-y-4">
            {gameState.players.map((player: GamePlayer) => (
              <div
                key={player.id}
                className={`p-4 rounded-lg cursor-pointer transition-colors ${
                  selectedPlayer === player.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
                onClick={() => !playerHasVoted && handleVote(player.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{player.name}</span>
                  <div className="flex items-center gap-2">
                    {voteCounts[player.id] > 0 && (
                      <span className="text-sm bg-gray-200 text-gray-700 px-2 py-1 rounded">
                        {voteCounts[player.id]} votes
                      </span>
                    )}
                    {selectedPlayer === player.id && (
                      <span className="text-sm">✓</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-gray-600">
          {playerHasVoted
            ? 'Waiting for other players to vote...'
            : 'Click on a player to vote for them as the Insider'}
        </div>
      </div>
    </div>
  );
};

export default Voting; 