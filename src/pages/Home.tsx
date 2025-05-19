import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createLobby, joinLobby } from '../services/lobbyService';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateLobby = async () => {
    try {
      setIsLoading(true);
      const playerName = localStorage.getItem('playerName');
      if (!playerName) {
        navigate('/name');
        return;
      }

      const lobby = await createLobby(playerName);
      console.log('Created new lobby:', {
        lobbyCode: lobby.code,
        username: playerName,
        lobbyId: lobby.id
      });
      localStorage.setItem('currentLobbyId', lobby.id);
      localStorage.setItem('playerId', lobby.players[0].id);
      navigate('/lobby');
    } catch (err) {
      setError('Failed to create lobby. Please try again.');
      console.error('Error creating lobby:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const playerName = localStorage.getItem('playerName');
      if (!playerName) {
        navigate('/name');
        return;
      }

      if (joinCode.length !== 6) {
        setError('Please enter a valid 6-letter code');
        return;
      }

      console.log('Attempting to join lobby with code:', joinCode);
      const lobby = await joinLobby(joinCode.toUpperCase(), playerName);
      
      // Find the newly joined player's ID
      const newPlayer = lobby.players.find(p => p.name === playerName && !p.isHost);
      if (!newPlayer) {
        setError('Failed to join lobby');
        return;
      }

      console.log('Successfully joined lobby:', lobby);
      localStorage.setItem('currentLobbyId', lobby.id);
      localStorage.setItem('playerId', newPlayer.id);
      navigate('/lobby');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join lobby');
      console.error('Error joining lobby:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-2xl w-full bg-surface rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold text-center text-primary mb-6">
          Welcome to Insider
        </h1>
        <p className="text-lg text-gray-600 mb-8 text-center">
          A social deduction game where players try to identify the "insider" while solving a word puzzle.
        </p>
        
        <div className="space-y-6">
          <button
            onClick={handleCreateLobby}
            disabled={isLoading}
            className="w-full bg-primary text-white py-3 px-6 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : 'Create New Game'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-surface text-gray-500">or join a game</span>
            </div>
          </div>

          <form onSubmit={handleJoinLobby} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Enter Game Code
              </label>
              <input
                type="text"
                id="code"
                value={joinCode}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  if (value.length <= 6) {
                    setJoinCode(value);
                    setError('');
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary uppercase"
                placeholder="Enter 6-letter code"
                maxLength={6}
                pattern="[A-Z]{6}"
                title="Please enter a 6-letter code"
                disabled={isLoading}
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-secondary text-white py-3 px-6 rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Joining...' : 'Join Game'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Home; 