# Insider Board Game

A web-based implementation of the Insider board game, where players try to identify the "insider" among them while solving a word puzzle.

## Features

- Real-time multiplayer gameplay
- Word puzzle system
- Role assignment (Master, Insider, Common players)
- Timer system
- Voting mechanism
- Modern and responsive UI

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open in your default browser at `http://localhost:3000`.

## How to Play

1. One player becomes the Master and knows the word
2. Another player is randomly selected as the Insider
3. The Master gives hints about the word
4. Players discuss and try to guess the word
5. The Insider tries to blend in while helping others guess
6. After the time limit, players vote on who they think is the Insider

## Technologies Used

- React
- TypeScript
- Tailwind CSS
- WebSocket for real-time communication 