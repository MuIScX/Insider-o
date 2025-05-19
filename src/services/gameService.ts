import { GameState } from '../types/game';
import { API_URL } from '../config';

export const getGameState = async (lobbyId: string): Promise<GameState> => {
  const response = await fetch(`${API_URL}/games/${lobbyId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get game state');
  }

  return response.json();
}; 