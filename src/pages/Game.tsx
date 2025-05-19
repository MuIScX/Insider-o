import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameState, GamePlayer } from '../types/game';
import { API_URL } from '../config';

const Game: React.FC = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastServerTime, setLastServerTime] = useState<number>(0);
  const [lastServerTimestamp, setLastServerTimestamp] = useState<number>(0);

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

        // Check if the game has ended and redirect if needed
        if (state.status === 'ended') {
          navigate('/voting');
        }
      } catch (err) {
        console.error('Error fetching game state:', err);
        setError('Failed to load game state');
        setIsLoading(false);
      }
    };

    const fetchTime = async () => {
      try {
        const response = await fetch(`${API_URL}/games/${lobbyId}/time`);
        if (!response.ok) {
          throw new Error('Failed to fetch time');
        }
        const data = await response.json();
        setLastServerTime(data.timeLeft);
        setLastServerTimestamp(Date.now());
        setTimeLeft(data.timeLeft);

        // If time is up and word wasn't guessed, update game state and redirect to results
        if (data.shouldRedirect) {
          if (data.gameState) {
            setGameState(data.gameState);
          }
          navigate('/results');
          return; // Add return to prevent further execution
        }
      } catch (err) {
        console.error('Error fetching time:', err);
      }
    };

    fetchGameState();
    fetchTime();

    // Poll for game state updates
    const gameStateInterval = setInterval(fetchGameState, 1000);
    // Poll for time updates less frequently
    const timeInterval = setInterval(fetchTime, 5000);

    return () => {
      clearInterval(gameStateInterval);
      clearInterval(timeInterval);
    };
  }, [navigate]);

  // Smooth timer update
  useEffect(() => {
    if (lastServerTime === 0 || !gameState?.gameDuration) return;

    const timer = setInterval(() => {
      const elapsed = Date.now() - lastServerTimestamp;
      const newTimeLeft = Math.max(0, lastServerTime - elapsed);
      setTimeLeft(newTimeLeft);

      if (newTimeLeft === 0) {
        clearInterval(timer);
        // Only redirect to voting if the word was guessed
        if (gameState.wordGuessed) {
          navigate('/voting');
        } else {
          navigate('/results');
        }
      }
    }, 100); // Update every 100ms for smooth countdown

    return () => clearInterval(timer);
  }, [lastServerTime, lastServerTimestamp, navigate, gameState?.gameDuration, gameState?.wordGuessed]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleGuess = async () => {
    const lobbyId = localStorage.getItem('currentLobbyId');
    const playerId = localStorage.getItem('playerId');

    if (!lobbyId || !playerId) return;

    try {
      const response = await fetch(`${API_URL}/games/${lobbyId}/guess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to mark word as guessed');
      }

      const data = await response.json();
      if (data.shouldRedirect) {
        navigate('/voting');
      }
    } catch (err) {
      console.error('Error marking word as guessed:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark word as guessed');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading game...</div>
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
  const isMaster = currentPlayer?.role === 'master';
  const isInsider = currentPlayer?.role === 'insider';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-2xl w-full bg-surface rounded-lg shadow-lg p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center text-primary mb-6">
            Game in Progress
          </h1>
          <div className="text-center text-2xl font-bold mb-4">
            Time Remaining: {formatTime(timeLeft)}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Role</h2>
          <div className="bg-gray-100 p-4 rounded-lg mb-4">
            <p className="text-lg">
              <span className="font-medium">Role:</span>{' '}
              {currentPlayer?.role ? (
                currentPlayer.role.charAt(0).toUpperCase() + currentPlayer.role.slice(1)
              ) : (
                'Unknown'
              )}
            </p>
            {(isMaster || isInsider) && (
              <p className="text-lg mt-2">
                <span className="font-medium">Secret Word:</span> {gameState.word}
              </p>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Players</h2>
          <div className="space-y-4">
            {gameState.players.map((player: GamePlayer) => (
              <div
                key={player.id}
                className="p-4 bg-gray-100 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{player.name}</span>
                  {player.role === 'master' && (
                    <span className="text-sm bg-primary text-white px-2 py-1 rounded">
                      Master
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {isMaster && (
          <div className="text-center">
            <button
              onClick={handleGuess}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
            >
              Mark Word as Guessed
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Game; 