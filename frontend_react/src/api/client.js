/**
 * Lightweight REST client for the Chess Mastery Platform backend.
 *
 * Uses a Bearer JWT stored in localStorage under `cmp_token`.
 */

const TOKEN_KEY = 'cmp_token';

function getApiBaseUrl() {
  // CRA env vars must start with REACT_APP_
  // Preferred: REACT_APP_API_BASE_URL (documented in .env.example)
  // Back-compat: REACT_APP_API_BASE (older deployments may still use this)
  const base =
    process.env.REACT_APP_API_BASE_URL ||
    process.env.REACT_APP_API_BASE ||
    'http://localhost:3001';

  return String(base).replace(/\/*$/, '').replace(/\/+$/, '');
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (!token) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, token);
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const url = `${getApiBaseUrl()}${path.startsWith('/') ? '' : '/'}${path}`;

  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
      (payload && payload.message) ||
      (typeof payload === 'string' ? payload : 'Request failed');
    const err = new Error(message);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

// PUBLIC_INTERFACE
export const api = {
  /** Authentication */
  auth: {
    async register({ username, email, password }) {
      return request('/auth/register', { method: 'POST', body: { username, email, password }, auth: false });
    },
    async login({ usernameOrEmail, password }) {
      return request('/auth/login', { method: 'POST', body: { usernameOrEmail, password }, auth: false });
    },
  },

  /** Profile */
  profile: {
    async me() {
      return request('/profile/me', { method: 'GET', auth: true });
    },
    async update({ username, email }) {
      return request('/profile/me', { method: 'PUT', body: { username, email }, auth: true });
    },
  },

  /** Matchmaking */
  matchmaking: {
    async join() {
      return request('/matchmaking/join', { method: 'POST', auth: true });
    },
    async leave() {
      return request('/matchmaking/leave', { method: 'POST', auth: true });
    },
    async status() {
      return request('/matchmaking/status', { method: 'GET', auth: true });
    },
  },

  /** Games */
  games: {
    async getGame(gameId) {
      return request(`/games/${gameId}`, { method: 'GET', auth: true });
    },
    async getMoves(gameId) {
      return request(`/games/${gameId}/moves`, { method: 'GET', auth: true });
    },
    async submitMove(gameId, { san }) {
      return request(`/games/${gameId}/move`, { method: 'POST', body: { san }, auth: true });
    },
    async resign(gameId) {
      return request(`/games/${gameId}/resign`, { method: 'POST', auth: true });
    },
    async draw(gameId) {
      return request(`/games/${gameId}/draw`, { method: 'POST', auth: true });
    },
  },

  /** Chat */
  chat: {
    async list(gameId) {
      return request(`/games/${gameId}/chat`, { method: 'GET', auth: true });
    },
    async send(gameId, { messageText }) {
      return request(`/games/${gameId}/chat`, { method: 'POST', body: { messageText }, auth: true });
    },
  },

  /** Leaderboards */
  leaderboards: {
    async top(limit = 50) {
      return request(`/leaderboards/top?limit=${encodeURIComponent(limit)}`, { method: 'GET', auth: false });
    },
    async recent(limit = 20) {
      return request(`/leaderboards/recent?limit=${encodeURIComponent(limit)}`, { method: 'GET', auth: false });
    },
  },

  /** History */
  history: {
    async myGames({ limit = 50, offset = 0 } = {}) {
      return request(`/history/me?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`, {
        method: 'GET',
        auth: true,
      });
    },
  },

  /** Token utilities */
  token: {
    get: getToken,
    set: setToken,
    clear() {
      setToken(null);
    },
  },

  /** Base URL utilities */
  baseUrl: {
    get: getApiBaseUrl,
  },
};
