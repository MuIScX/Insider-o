import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLobby, togglePlayerReady, leaveLobby, startGame } from '../services/lobbyService';
import { GameLobby, Player } from '../types/game';

const Lobby: React.FC = () => {
  const navigate = useNavigate();
  const [lobby, setLobby] = useState<GameLobby | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [gameTime, setGameTime] = useState(3 * 60 * 1000);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const lobbyId = localStorage.getItem('currentLobbyId');
    const playerId = localStorage.getItem('playerId');

    if (!lobbyId || !playerId) {
      navigate('/');
      return;
    }

    const fetchLobby = async () => {
      try {
        const currentLobby = await getLobby(lobbyId);
        console.log('currentLobby', currentLobby);
        // Check if player is still in the lobby
        const player = currentLobby.players.find((p: Player) => p.id === playerId);
        if (!player) {
          navigate('/');
          return;
        }

        setLobby(currentLobby);
        setIsLoading(false);
        setIsHost(player.isHost);

        // In a real application, this would be a WebSocket connection
        const interval = setInterval(async () => {
          try {
            const updatedLobby = await getLobby(lobbyId);
            console.log('updatedLobby', updatedLobby);
            if (updatedLobby) {
              setLobby(updatedLobby);
              if (updatedLobby.status === 'starting') {
                navigate('/game');
              }
            } else {
              clearInterval(interval);
              navigate('/');
            }
          } catch (err) {
            console.error('Error fetching lobby:', err);
          }
        }, 2000);

        return () => clearInterval(interval);
      } catch (err) {
        console.error('Error fetching lobby:', err);
        setError('Failed to load lobby');
        setIsLoading(false);
      }
    };

    fetchLobby();
  }, [navigate]);

  const handleReady = async () => {
    if (!lobby) return;

    const playerId = localStorage.getItem('playerId');
    if (!playerId) {
      navigate('/');
      return;
    }

    try {
      const updatedLobby = await togglePlayerReady(lobby.id, playerId);
      setLobby(updatedLobby);
    } catch (err) {
      console.error('Error toggling ready status:', err);
      setError('Failed to update ready status');
    }
  };

  const handleLeaveLobby = async () => {
    if (!lobby) return;

    const playerId = localStorage.getItem('playerId');
    if (!playerId) {
      navigate('/');
      return;
    }

    try {
      await leaveLobby(lobby.id, playerId);
      localStorage.removeItem('currentLobbyId');
      localStorage.removeItem('playerId');
      navigate('/');
    } catch (err) {
      console.error('Error leaving lobby:', err);
      setError('Failed to leave lobby');
    }
  };

  const handleStartGame = async () => {
    if (!lobby) return;

    try {
      await startGame(lobby.id, gameTime);
      navigate('/game');
    } catch (err) {
      console.error('Error starting game:', err);
      setError('Failed to start game');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading lobby...</div>
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

  if (!lobby) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Lobby not found</div>
      </div>
    );
  }

  const playerId = localStorage.getItem('playerId');
  const currentPlayer = lobby.players.find((p: Player) => p.id === playerId);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-2xl w-full bg-surface rounded-lg shadow-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-primary">Game Lobby</h1>
          <div className="text-lg">
            Code: <span className="font-mono font-bold">{lobby.code}</span>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Players ({lobby.players.length}/{lobby.maxPlayers})</h2>
          <div className="space-y-2">
            {lobby.players.map((player: Player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 bg-gray-100 rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{player.name}</span>
                  {player.isHost && (
                    <span className="px-2 py-1 text-xs bg-primary text-white rounded">Host</span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {!player.isHost && (
                    player.isReady ? (
                      <span className="text-green-600">Ready</span>
                    ) : (
                      <span className="text-gray-500">Not Ready</span>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Game Settings</h2>
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="mb-4">
              <label htmlFor="gameTime" className="block text-sm font-medium text-gray-700 mb-2">
                Game Duration
              </label>
              <select
                id="gameTime"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                value={gameTime}
                onChange={(e) => setGameTime(Number(e.target.value))}
                disabled={!isHost}
              >
                <option value={10 * 1000}>10 seconds</option>
                <option value={3 * 60 * 1000}>3 minutes</option>
                <option value={4 * 60 * 1000}>4 minutes</option>
                <option value={5 * 60 * 1000}>5 minutes</option>
                <option value={6 * 60 * 1000}>6 minutes</option>
                <option value={7 * 60 * 1000}>7 minutes</option>
                <option value={8 * 60 * 1000}>8 minutes</option>
              </select>
              {!isHost && (
                <p className="mt-1 text-sm text-gray-500">
                  Only the host can change game settings
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={handleLeaveLobby}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Leave Lobby
          </button>
          {currentPlayer && !currentPlayer.isHost && (
            <button
              onClick={handleReady}
              className={`px-6 py-2 rounded-lg transition-colors ${
                currentPlayer.isReady
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-primary hover:bg-primary/90'
              } text-white`}
            >
              {currentPlayer.isReady ? 'Not Ready' : 'Ready'}
            </button>
          )}
          {currentPlayer?.isHost && (
            <button
              onClick={handleStartGame}
              disabled={!lobby.players.filter((p: Player) => !p.isHost).every((p: Player) => p.isReady)}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Game
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lobby; 