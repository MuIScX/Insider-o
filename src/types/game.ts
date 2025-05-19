export type GameRole = 'master' | 'insider' | 'common';

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
}

export interface GamePlayer extends Player {
  role: GameRole;
}

export interface GameLobby {
  id: string;
  code: string;
  players: Player[];
  maxPlayers: number;
  status: 'waiting' | 'starting' | 'playing' | 'ended';
  createdAt: number;
}

export interface GameState {
  word: string;
  players: GamePlayer[];
  status: 'waiting' | 'starting' | 'playing' | 'ended';
  startTime?: number;
  wordGuessed: boolean;
  endTime?: number;
  winner?: string;
  gameDuration: number;
} 