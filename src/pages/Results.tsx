import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameState, GamePlayer } from '../types/game';
import { API_URL } from '../config';

interface VoteCounts {
  [playerId: string]: number;
}

const Results: React.FC = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [votes, setVotes] = useState<{ voterId: string; votedForId: string }[]>([]);
  const [voteCounts, setVoteCounts] = useState<VoteCounts>({});
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const lobbyId = localStorage.getItem('currentLobbyId');
    const playerId = localStorage.getItem('playerId');

    if (!lobbyId || !playerId) {
      navigate('/');
      return;
    }

    const fetchGameState = async () => {
      try {
        const response = await fetch(`${API_URL}/games/${lobbyId}`, {
          method: 'GET',
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        });
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
        const response = await fetch(`${API_URL}/games/${lobbyId}/votes`, {
          method: 'GET',
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        });
        if (!response.ok) {
          throw new Error('Failed to fetch votes');
        }
        const data = await response.json();
        setVotes(data.votes);
        setVoteCounts(data.voteCounts);
      } catch (err) {
        console.error('Error fetching votes:', err);
      }
    };

    fetchGameState();
    fetchVotes();
  }, [navigate]);

  const handleNewGame = () => {
    localStorage.removeItem('currentLobbyId');
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading results...</div>
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
  const insider = gameState.players.find(p => p.role === 'insider');
  const master = gameState.players.find(p => p.role === 'master');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-2xl w-full bg-surface rounded-lg shadow-lg p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center text-primary mb-6">
            Game Results
          </h1>
          <div className="text-center text-2xl font-bold mb-4">
            {gameState.winner === 'master' ? (
              <span className="text-green-600">Master and Commoners Win!</span>
            ) : (
              <span className="text-red-600">Insider Wins!</span>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Game Details</h2>
          <div className="bg-gray-100 p-4 rounded-lg mb-4">
            <p className="text-lg">
              <span className="font-medium">Secret Word:</span> {gameState.word}
            </p>
            <p className="text-lg mt-2">
              <span className="font-medium">Insider:</span> {insider?.name}
            </p>
            <p className="text-lg mt-2">
              <span className="font-medium">Master:</span> {master?.name}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Voting Results</h2>
          <div className="space-y-4">
            {gameState.players.map((player: GamePlayer) => (
              <div
                key={player.id}
                className="p-4 bg-gray-100 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{player.name}</span>
                    {player.role === 'insider' && (
                      <span className="text-sm bg-red-500 text-white px-2 py-1 rounded">
                        Insider
                      </span>
                    )}
                    {player.role === 'master' && (
                      <span className="text-sm bg-primary text-white px-2 py-1 rounded">
                        Master
                      </span>
                    )}
                  </div>
                  <span className="text-sm bg-gray-200 text-gray-700 px-2 py-1 rounded">
                    {voteCounts[player.id] || 0} votes
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={handleNewGame}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            Start New Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default Results; 