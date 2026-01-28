# Lightweight React Template for KAVIA

This project provides a minimal React template with a clean, modern UI and minimal dependencies.

## Note: REST-only mode (WebSockets disabled)

This frontend is configured to run **without any WebSocket integration**. Game state, matchmaking assignment, and chat
updates are fetched via **REST polling** (using lightweight `setInterval` loops with cleanup on unmount).

## Mock API mode (no backend required)

You can run the frontend fully standalone by enabling mock mode:

1. Set `REACT_APP_USE_MOCKS=true` (see `.env.example`)
2. Start the app: `npm start`

When mock mode is enabled:
- All API calls are served from a localStorage-backed in-memory store (users, sessions, queue, games, chat, history, ELO).
- The UI shows a visible **“Mock Mode”** badge in the navbar.

Limitations (mock mode):
- No real chess legality validation and no full FEN updates (moves are accepted as text/SAN and stored for history).
- “Realtime” behavior is simulated via existing polling + small timeouts (no WebSockets).
- Matchmaking is FIFO in a single browser profile; open two browsers/profiles to simulate two users.
  - Demo accounts are pre-seeded: `alice / password123` and `bob / password123`.

## Architecture

This repository is organized as a small multi-container system:

- **frontend_react** (this folder): React SPA UI (auth, play, matchmaking, chat, leaderboards, history)
- **backend_express**: Express REST API for auth + chess gameplay domain (matchmaking, games, chat, history, leaderboards)
- **database_postgresql**: PostgreSQL persistence for users, games, moves, chat messages, ratings

### High-level diagram (ASCII)

```
+-------------------+        REST (HTTP/JSON)         +---------------------+        SQL         +----------------------+
|  frontend_react    |  ---------------------------->  |    backend_express   |  ------------->   |  database_postgresql  |
|  React SPA (3000)  |                                |  API server (3001)   |                  |  Postgres (5001)      |
+-------------------+  <----------------------------  +---------------------+  <-------------   +----------------------+
        |                        (JSON responses)                 |
        |                                                        |
        |  Mock Mode (no backend):                                |
        +--> localStorage-backed in-browser mock API              |
```

### Data flow

**Normal (real backend) mode**
- The **frontend** calls the **backend** via REST over HTTP (JSON).
- Authentication uses a JWT stored in localStorage (`cmp_token`) and sent as `Authorization: Bearer <token>`.
- Game state, matchmaking assignment, and chat updates are **polled** over REST at short intervals (REST-only mode).

**Optional WebSocket note**
- This frontend build is currently **REST-only** (WebSockets disabled).
- If a future non-mock build adds WebSockets, the intended model is:
  - REST for commands and initial fetches
  - WebSockets for push updates (game + chat)
- In the current codebase, the “realtime” feel is achieved via polling + immediate refreshes after actions.

**Mock mode behavior**
- When mock mode is enabled, the frontend does **not** call the backend at all.
- All data lives in a localStorage-backed store in the browser (users, sessions, queue, games, chat, history, ELO).
- Polling still runs, but it reads from the mock store; “realtime” effects are simulated with small timeouts.

### Tech stack highlights

- **Frontend**: React 18, react-router-dom, CRA (`react-scripts`), vanilla CSS
- **Backend**: Node.js + Express (REST API)
- **Database**: PostgreSQL (schema & seed documented in `database_postgresql/schema_and_seed.md`)
- **Transport**: HTTP/JSON REST (polling-based updates in the current frontend)

### Environment / preview ports

- **Frontend (React dev server)**: http://localhost:3000
- **Backend (Express)**: http://localhost:3001
  - API docs (if enabled in backend): http://localhost:3001/docs
  - DB health (backend route): `/health/db`
- **Database (Postgres container)**: port **5001** (internal service; typically accessed only by backend)

### Switching between mock mode and real backend

The frontend chooses between mock vs real backend using environment variables.

**Mock mode (no backend required)**
1. Set:
   - `REACT_APP_USE_MOCKS=true`
2. Start:
   - `npm start`

**Real backend mode (uses backend_express)**
1. Set:
   - `REACT_APP_USE_MOCKS=false`
   - `REACT_APP_API_BASE_URL=http://localhost:3001` (preferred)
     - Back-compat: `REACT_APP_API_BASE` is also supported
2. Start:
   - `npm start`

Notes:
- Environment variables are documented in `.env.example`.
- CRA requires all browser-exposed env vars to be prefixed with `REACT_APP_`.

## Features

- **Lightweight**: No heavy UI frameworks - uses only vanilla CSS and React
- **Modern UI**: Clean, responsive design with KAVIA brand styling
- **Fast**: Minimal dependencies for quick loading times
- **Simple**: Easy to understand and modify

## Getting Started

In the project directory, you can run:

### `npm start`

Runs the app in development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### `npm test`

Launches the test runner in interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

## Customization

### Colors

The main brand colors are defined as CSS variables in `src/App.css`:

```css
:root {
  --kavia-orange: #E87A41;
  --kavia-dark: #1A1A1A;
  --text-color: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --border-color: rgba(255, 255, 255, 0.1);
}
```

### Components

This template uses pure HTML/CSS components instead of a UI framework. You can find component styles in `src/App.css`. 

Common components include:
- Buttons (`.btn`, `.btn-large`)
- Container (`.container`)
- Navigation (`.navbar`)
- Typography (`.title`, `.subtitle`, `.description`)

## Learn More

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
