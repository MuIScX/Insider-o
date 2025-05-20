import { GameLobby, Player } from '../types/game';
import { API_URL } from '../config';

// In a real application, this would be handled by a backend server
const lobbies: { [key: string]: GameLobby } = {};
const lobbyCodes: { [key: string]: string } = {}; // Map lobby codes to lobby IDs

export const generateLobbyCode = (): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

const generatePlayerId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const createLobby = async (hostName: string): Promise<GameLobby> => {
  const response = await fetch(`${API_URL}/lobbies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ hostName }),
  });

  if (!response.ok) {
    throw new Error('Failed to create lobby');
  }

  return response.json();
};

export const joinLobby = async (code: string, playerName: string): Promise<GameLobby> => {
  const response = await fetch(`${API_URL}/lobbies/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, playerName }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to join lobby');
  }

  return response.json();
};

export const getLobby = async (lobbyId: string): Promise<GameLobby> => {
  const response = await fetch(`${API_URL}/lobbies/${lobbyId}`, {
    method: 'GET',
    headers: {
      "ngrok-skip-browser-warning": "true",
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get lobby');
  }

  return response.json();
};

export const togglePlayerReady = async (lobbyId: string, playerId: string): Promise<GameLobby> => {
  const response = await fetch(`${API_URL}/lobbies/${lobbyId}/ready`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ playerId }),
  });

  if (!response.ok) {
    throw new Error('Failed to toggle ready status');
  }

  return response.json();
};

export const startGame = async (lobbyId: string, gameDuration: number) => {
  const response = await fetch(`${API_URL}/lobbies/${lobbyId}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ gameDuration }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to start game');
  }

  return response.json();
};

export const leaveLobby = async (lobbyId: string, playerId: string): Promise<GameLobby | null> => {
  const response = await fetch(`${API_URL}/lobbies/${lobbyId}/leave`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ playerId }),
  });

  if (!response.ok) {
    throw new Error('Failed to leave lobby');
  }

  return response.json();
}; 