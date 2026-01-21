/**
 * Mock API layer for running the frontend without a backend.
 *
 * This file intentionally mirrors the surface area of `src/api/client.js` so the UI can remain unchanged.
 * All state is stored in localStorage to persist across reloads.
 */

/* eslint-disable no-unused-vars */

const STORE_KEY = 'cmp_mock_store_v1';

/**
 * In-memory runtime cache. It is loaded from localStorage once and then saved back after mutations.
 * This avoids repeated JSON parsing and also makes it easier to keep a single "truth" during a session.
 */
let _store = null;

function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix) {
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

function safeJsonParse(s, fallback) {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

function getInitialSeedStore() {
  const aliceId = randomId('user');
  const bobId = randomId('user');

  const users = [
    {
      id: aliceId,
      username: 'alice',
      email: 'alice@example.com',
      password: 'password123',
      rating: 1240,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
    {
      id: bobId,
      username: 'bob',
      email: 'bob@example.com',
      password: 'password123',
      rating: 1200,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
  ];

  const finishedGameId = randomId('game');
  const finishedMoves = [
    { id: randomId('move'), game_id: finishedGameId, move_number: 1, san: 'e4', created_at: nowIso() },
    { id: randomId('move'), game_id: finishedGameId, move_number: 1, san: 'e5', created_at: nowIso() },
    { id: randomId('move'), game_id: finishedGameId, move_number: 2, san: 'Nf3', created_at: nowIso() },
    { id: randomId('move'), game_id: finishedGameId, move_number: 2, san: 'Nc6', created_at: nowIso() },
  ];

  const games = [
    {
      id: finishedGameId,
      status: 'finished',
      white_user_id: aliceId,
      black_user_id: bobId,
      white_username: 'alice',
      black_username: 'bob',
      winner_user_id: aliceId,
      result: '1-0',
      current_fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
      move_count: finishedMoves.length,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
  ];

  return {
    version: 1,
    users,
    sessions: {}, // token -> userId
    matchmaking: {
      queue: [], // { userId, joined_at }
      matches: {}, // userId -> { gameId, color }
    },
    games, // array of game objects
    movesByGameId: {
      [finishedGameId]: finishedMoves,
    },
    chatsByGameId: {
      [finishedGameId]: [
        {
          id: randomId('chat'),
          game_id: finishedGameId,
          sender_user_id: aliceId,
          message_text: 'gg!',
          created_at: nowIso(),
        },
        {
          id: randomId('chat'),
          game_id: finishedGameId,
          sender_user_id: bobId,
          message_text: 'well played',
          created_at: nowIso(),
        },
      ],
    },
    // lightweight "AI opponent" / auto-responses (optional)
    bot: {
      enabled: true,
      think_ms: 800,
      cannedMoves: ['...e5', '...Nc6', '...Nf6', '...d6', '...Bc5', '...Be7', '...O-O'],
      cannedChat: ['Nice.', 'Your move.', 'Interesting.', 'Good luck!', 'Well played.'],
    },
  };
}

function loadStore() {
  if (_store) return _store;
  const raw = localStorage.getItem(STORE_KEY);
  if (raw) {
    _store = safeJsonParse(raw, null);
  }
  if (!_store || !_store.users) {
    _store = getInitialSeedStore();
    saveStore();
  }
  return _store;
}

function saveStore() {
  localStorage.setItem(STORE_KEY, JSON.stringify(_store));
}

/**
 * Simple artificial latency so polling & spinners feel realistic.
 */
function delay(ms = 150) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findUserByUsernameOrEmail(usernameOrEmail) {
  const store = loadStore();
  const needle = String(usernameOrEmail || '').trim().toLowerCase();
  return store.users.find(
    (u) => u.username.toLowerCase() === needle || u.email.toLowerCase() === needle
  );
}

function getUserById(userId) {
  const store = loadStore();
  return store.users.find((u) => u.id === userId) || null;
}

function tokenToUser(token) {
  const store = loadStore();
  const userId = store.sessions[token];
  if (!userId) return null;
  return getUserById(userId);
}

function requireAuth(token) {
  const user = tokenToUser(token);
  if (!user) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  return user;
}

function basicEloUpdate({ winnerId, loserId }) {
  const store = loadStore();
  const winner = getUserById(winnerId);
  const loser = getUserById(loserId);
  if (!winner || !loser) return;

  // Very simplified ELO: fixed K
  const K = 24;
  const expectedWinner = 1 / (1 + 10 ** ((loser.rating - winner.rating) / 400));
  const expectedLoser = 1 - expectedWinner;

  winner.rating = Math.max(100, Math.round(winner.rating + K * (1 - expectedWinner)));
  loser.rating = Math.max(100, Math.round(loser.rating + K * (0 - expectedLoser)));
  winner.updated_at = nowIso();
  loser.updated_at = nowIso();
}

function getOrCreateActiveMatchForUser(userId) {
  const store = loadStore();
  const match = store.matchmaking.matches[userId];
  if (!match) return null;
  const game = store.games.find((g) => g.id === match.gameId) || null;
  return { match, game };
}

function createGame({ whiteUser, blackUser }) {
  const store = loadStore();
  const gameId = randomId('game');

  const game = {
    id: gameId,
    status: 'active',
    white_user_id: whiteUser.id,
    black_user_id: blackUser.id,
    white_username: whiteUser.username,
    black_username: blackUser.username,
    winner_user_id: null,
    result: null,
    current_fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    move_count: 0,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  store.games.unshift(game);
  store.movesByGameId[gameId] = [];
  store.chatsByGameId[gameId] = [];
  saveStore();

  return game;
}

function appendMove(gameId, san) {
  const store = loadStore();
  const moves = store.movesByGameId[gameId] || (store.movesByGameId[gameId] = []);
  const moveNumber = Math.floor(moves.length / 2) + 1;

  const move = {
    id: randomId('move'),
    game_id: gameId,
    move_number: moveNumber,
    san,
    created_at: nowIso(),
  };
  moves.push(move);

  const game = store.games.find((g) => g.id === gameId);
  if (game) {
    game.move_count = moves.length;
    game.updated_at = nowIso();
    // We do NOT implement real chess FEN updates (frontend notes it relies on backend).
    // To still show "some" progress, we keep the initial FEN and rely on move list + last move display.
  }

  saveStore();
  return move;
}

function maybeAutoOpponentMove(gameId, actingUserId) {
  const store = loadStore();
  if (!store.bot?.enabled) return;

  const game = store.games.find((g) => g.id === gameId);
  if (!game || game.status !== 'active') return;

  // If user is one of the players, we can auto-respond with a canned move from the opponent.
  const isPlayer = game.white_user_id === actingUserId || game.black_user_id === actingUserId;
  if (!isPlayer) return;

  // "Opponent" is the other player; we only do it when there are exactly 2 players.
  const opponentId = game.white_user_id === actingUserId ? game.black_user_id : game.white_user_id;
  if (!opponentId) return;

  // Schedule a delayed opponent move. Persist immediately so reloads don't lose it.
  const thinkMs = store.bot?.think_ms ?? 800;
  const canned = store.bot?.cannedMoves ?? [];
  const pick = canned.length ? canned[Math.floor(Math.random() * canned.length)] : '...';

  // Use window.setTimeout; in tests/SSR-less env it still exists in CRA.
  window.setTimeout(() => {
    // Re-load store (another tab may have changed it)
    loadStore();
    const liveGame = _store.games.find((g) => g.id === gameId);
    if (!liveGame || liveGame.status !== 'active') return;

    // Opponent "plays" a move. We store SAN text; legality is not validated in mock mode.
    appendMove(gameId, pick);

    // Occasionally add a canned chat.
    if (Math.random() < 0.25) {
      const chatList = _store.chatsByGameId[gameId] || (_store.chatsByGameId[gameId] = []);
      const cannedChat = store.bot?.cannedChat ?? [];
      const msg = cannedChat.length ? cannedChat[Math.floor(Math.random() * cannedChat.length)] : '...';
      chatList.push({
        id: randomId('chat'),
        game_id: gameId,
        sender_user_id: opponentId,
        message_text: msg,
        created_at: nowIso(),
      });
      saveStore();
    }
  }, thinkMs);
}

/**
 * PUBLIC_INTERFACE
 * Create a mock API object that mirrors the `api` object in `src/api/client.js`.
 */
export function createMockApi({ tokenKey = 'cmp_token' } = {}) {
  /** Returns an object mirroring the real REST client API surface, backed by localStorage state. */
  function getToken() {
    return localStorage.getItem(tokenKey);
  }

  function setToken(token) {
    if (!token) localStorage.removeItem(tokenKey);
    else localStorage.setItem(tokenKey, token);
  }

  return {
    auth: {
      async register({ username, email, password }) {
        await delay();
        const store = loadStore();

        const u = String(username || '').trim();
        const e = String(email || '').trim().toLowerCase();
        const p = String(password || '');

        if (!u || !e || !p) {
          const err = new Error('Missing required fields');
          err.status = 400;
          throw err;
        }

        const exists = store.users.some(
          (x) => x.username.toLowerCase() === u.toLowerCase() || x.email.toLowerCase() === e
        );
        if (exists) {
          const err = new Error('Username or email already in use');
          err.status = 409;
          throw err;
        }

        const newUser = {
          id: randomId('user'),
          username: u,
          email: e,
          password: p,
          rating: 1200,
          created_at: nowIso(),
          updated_at: nowIso(),
        };
        store.users.push(newUser);

        const token = randomId('token');
        store.sessions[token] = newUser.id;
        saveStore();

        setToken(token);
        return {
          token,
          user: { id: newUser.id, username: newUser.username, email: newUser.email },
        };
      },

      async login({ usernameOrEmail, password }) {
        await delay();
        const store = loadStore();

        const user = findUserByUsernameOrEmail(usernameOrEmail);
        if (!user || user.password !== String(password || '')) {
          const err = new Error('Invalid credentials');
          err.status = 401;
          throw err;
        }

        const token = randomId('token');
        store.sessions[token] = user.id;
        saveStore();

        setToken(token);
        return {
          token,
          user: { id: user.id, username: user.username, email: user.email },
        };
      },
    },

    profile: {
      async me() {
        await delay();
        const token = getToken();
        const user = requireAuth(token);
        return { user: { id: user.id, username: user.username, email: user.email } };
      },

      async update({ username, email }) {
        await delay();
        const token = getToken();
        const user = requireAuth(token);

        const store = loadStore();
        const nextUsername = username != null ? String(username).trim() : user.username;
        const nextEmail = email != null ? String(email).trim().toLowerCase() : user.email;

        // enforce uniqueness (excluding self)
        const conflict = store.users.some(
          (u) =>
            u.id !== user.id &&
            (u.username.toLowerCase() === nextUsername.toLowerCase() || u.email.toLowerCase() === nextEmail)
        );
        if (conflict) {
          const err = new Error('Username or email already in use');
          err.status = 409;
          throw err;
        }

        user.username = nextUsername;
        user.email = nextEmail;
        user.updated_at = nowIso();

        // reflect username in existing games for UI
        store.games.forEach((g) => {
          if (g.white_user_id === user.id) g.white_username = user.username;
          if (g.black_user_id === user.id) g.black_username = user.username;
        });

        saveStore();
        return { user: { id: user.id, username: user.username, email: user.email } };
      },
    },

    matchmaking: {
      async join() {
        await delay();
        const token = getToken();
        const user = requireAuth(token);

        const store = loadStore();
        const alreadyMatched = store.matchmaking.matches[user.id];
        if (alreadyMatched) {
          return { queued: false, gameId: alreadyMatched.gameId, color: alreadyMatched.color };
        }

        const inQueue = store.matchmaking.queue.some((q) => q.userId === user.id);
        if (!inQueue) {
          store.matchmaking.queue.push({ userId: user.id, joined_at: nowIso() });
        }

        // If there's someone else waiting, match immediately (FIFO).
        const others = store.matchmaking.queue.filter((q) => q.userId !== user.id);
        if (others.length > 0) {
          const opponentEntry = others[0];
          // Remove both from queue
          store.matchmaking.queue = store.matchmaking.queue.filter(
            (q) => q.userId !== user.id && q.userId !== opponentEntry.userId
          );

          const opponent = getUserById(opponentEntry.userId);
          if (opponent) {
            // Determine colors
            const whiteFirst = Math.random() < 0.5;
            const whiteUser = whiteFirst ? user : opponent;
            const blackUser = whiteFirst ? opponent : user;

            const game = createGame({ whiteUser, blackUser });

            store.matchmaking.matches[user.id] = {
              gameId: game.id,
              color: whiteUser.id === user.id ? 'white' : 'black',
              created_at: nowIso(),
            };
            store.matchmaking.matches[opponent.id] = {
              gameId: game.id,
              color: whiteUser.id === opponent.id ? 'white' : 'black',
              created_at: nowIso(),
            };
            saveStore();

            return { queued: false, gameId: store.matchmaking.matches[user.id].gameId, color: store.matchmaking.matches[user.id].color };
          }
        }

        saveStore();
        return { queued: true };
      },

      async leave() {
        await delay();
        const token = getToken();
        const user = requireAuth(token);

        const store = loadStore();
        store.matchmaking.queue = store.matchmaking.queue.filter((q) => q.userId !== user.id);
        saveStore();
        return { queued: false };
      },

      async status() {
        await delay(120);
        const token = getToken();
        const user = requireAuth(token);

        const store = loadStore();
        const match = store.matchmaking.matches[user.id];
        if (match) {
          return { queued: false, gameId: match.gameId, color: match.color };
        }

        const queued = store.matchmaking.queue.some((q) => q.userId === user.id);
        return { queued };
      },
    },

    games: {
      async getGame(gameId) {
        await delay(120);
        const token = getToken();
        const user = requireAuth(token);

        const store = loadStore();
        const game = store.games.find((g) => g.id === gameId);
        if (!game) {
          const err = new Error('Game not found');
          err.status = 404;
          throw err;
        }

        // Access policy: allow if user is participant. (Could be expanded to spectators, but UI assumes authed.)
        const allowed = game.white_user_id === user.id || game.black_user_id === user.id;
        if (!allowed) {
          const err = new Error('Forbidden');
          err.status = 403;
          throw err;
        }

        return { game };
      },

      async getMoves(gameId) {
        await delay(120);
        const token = getToken();
        const user = requireAuth(token);

        const store = loadStore();
        const game = store.games.find((g) => g.id === gameId);
        if (!game) {
          const err = new Error('Game not found');
          err.status = 404;
          throw err;
        }

        const allowed = game.white_user_id === user.id || game.black_user_id === user.id;
        if (!allowed) {
          const err = new Error('Forbidden');
          err.status = 403;
          throw err;
        }

        const moves = store.movesByGameId[gameId] || [];
        return { moves };
      },

      async submitMove(gameId, { san }) {
        await delay(180);
        const token = getToken();
        const user = requireAuth(token);

        const store = loadStore();
        const game = store.games.find((g) => g.id === gameId);
        if (!game) {
          const err = new Error('Game not found');
          err.status = 404;
          throw err;
        }
        if (game.status !== 'active') {
          const err = new Error('Game is not active');
          err.status = 409;
          throw err;
        }

        const isParticipant = game.white_user_id === user.id || game.black_user_id === user.id;
        if (!isParticipant) {
          const err = new Error('Forbidden');
          err.status = 403;
          throw err;
        }

        const trimmed = String(san || '').trim();
        if (!trimmed) {
          const err = new Error('Missing move SAN');
          err.status = 400;
          throw err;
        }

        const move = appendMove(gameId, trimmed);

        // Schedule a mock opponent move to make the game feel alive.
        maybeAutoOpponentMove(gameId, user.id);

        const updatedGame = store.games.find((g) => g.id === gameId);
        return { game: updatedGame, move };
      },

      async resign(gameId) {
        await delay(150);
        const token = getToken();
        const user = requireAuth(token);

        const store = loadStore();
        const game = store.games.find((g) => g.id === gameId);
        if (!game) {
          const err = new Error('Game not found');
          err.status = 404;
          throw err;
        }
        if (game.status !== 'active') return { game };

        const isWhite = game.white_user_id === user.id;
        const isBlack = game.black_user_id === user.id;
        if (!isWhite && !isBlack) {
          const err = new Error('Forbidden');
          err.status = 403;
          throw err;
        }

        const winnerId = isWhite ? game.black_user_id : game.white_user_id;
        game.status = 'finished';
        game.winner_user_id = winnerId;
        game.result = isWhite ? '0-1' : '1-0';
        game.updated_at = nowIso();

        // ELO update (simple)
        basicEloUpdate({ winnerId, loserId: user.id });

        // Clear matchmaking match for both players
        delete store.matchmaking.matches[game.white_user_id];
        delete store.matchmaking.matches[game.black_user_id];

        saveStore();
        return { game };
      },

      async draw(gameId) {
        await delay(150);
        const token = getToken();
        const user = requireAuth(token);

        const store = loadStore();
        const game = store.games.find((g) => g.id === gameId);
        if (!game) {
          const err = new Error('Game not found');
          err.status = 404;
          throw err;
        }
        if (game.status !== 'active') return { game };

        const isParticipant = game.white_user_id === user.id || game.black_user_id === user.id;
        if (!isParticipant) {
          const err = new Error('Forbidden');
          err.status = 403;
          throw err;
        }

        game.status = 'finished';
        game.winner_user_id = null;
        game.result = '1/2-1/2';
        game.updated_at = nowIso();

        // Very small draw adjustment (optional)
        const white = getUserById(game.white_user_id);
        const black = getUserById(game.black_user_id);
        if (white && black) {
          // pull ratings slightly together
          const delta = Math.round((black.rating - white.rating) * 0.02);
          white.rating = Math.max(100, white.rating + delta);
          black.rating = Math.max(100, black.rating - delta);
          white.updated_at = nowIso();
          black.updated_at = nowIso();
        }

        delete store.matchmaking.matches[game.white_user_id];
        delete store.matchmaking.matches[game.black_user_id];

        saveStore();
        return { game };
      },
    },

    chat: {
      async list(gameId) {
        await delay(100);
        const token = getToken();
        const user = requireAuth(token);

        const store = loadStore();
        const game = store.games.find((g) => g.id === gameId);
        if (!game) {
          const err = new Error('Game not found');
          err.status = 404;
          throw err;
        }

        const allowed = game.white_user_id === user.id || game.black_user_id === user.id;
        if (!allowed) {
          const err = new Error('Forbidden');
          err.status = 403;
          throw err;
        }

        const messages = store.chatsByGameId[gameId] || [];
        return { messages };
      },

      async send(gameId, { messageText }) {
        await delay(120);
        const token = getToken();
        const user = requireAuth(token);

        const store = loadStore();
        const game = store.games.find((g) => g.id === gameId);
        if (!game) {
          const err = new Error('Game not found');
          err.status = 404;
          throw err;
        }

        const allowed = game.white_user_id === user.id || game.black_user_id === user.id;
        if (!allowed) {
          const err = new Error('Forbidden');
          err.status = 403;
          throw err;
        }

        const text = String(messageText || '').trim();
        if (!text) {
          const err = new Error('Message cannot be empty');
          err.status = 400;
          throw err;
        }

        const list = store.chatsByGameId[gameId] || (store.chatsByGameId[gameId] = []);
        const msg = {
          id: randomId('chat'),
          game_id: gameId,
          sender_user_id: user.id,
          message_text: text,
          created_at: nowIso(),
        };
        list.push(msg);
        saveStore();
        return { message: msg };
      },
    },

    leaderboards: {
      async top(limit = 50) {
        await delay(120);
        const store = loadStore();
        const lim = Math.max(1, Math.min(200, Number(limit) || 50));

        const leaderboard = [...store.users]
          .sort((a, b) => (b.rating || 1200) - (a.rating || 1200))
          .slice(0, lim)
          .map((u) => ({ user_id: u.id, username: u.username, rating: u.rating || 1200 }));

        return { leaderboard };
      },

      async recent(limit = 20) {
        await delay(120);
        const store = loadStore();
        const lim = Math.max(1, Math.min(100, Number(limit) || 20));

        const recentGames = [...store.games]
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .slice(0, lim)
          .map((g) => ({
            game_id: g.id,
            white_username: g.white_username,
            black_username: g.black_username,
            status: g.status,
            updated_at: g.updated_at,
          }));

        return { recentGames };
      },
    },

    history: {
      async myGames({ limit = 50, offset = 0 } = {}) {
        await delay(140);
        const token = getToken();
        const user = requireAuth(token);

        const store = loadStore();
        const lim = Math.max(1, Math.min(200, Number(limit) || 50));
        const off = Math.max(0, Number(offset) || 0);

        const games = store.games
          .filter((g) => g.white_user_id === user.id || g.black_user_id === user.id)
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .slice(off, off + lim)
          .map((g) => ({
            id: g.id,
            white_username: g.white_username,
            black_username: g.black_username,
            status: g.status,
            move_count: g.move_count || 0,
            updated_at: g.updated_at,
          }));

        return { games };
      },
    },

    token: {
      get: getToken,
      set: setToken,
      clear() {
        setToken(null);
      },
    },

    baseUrl: {
      get() {
        // In mock mode, there is no backend base URL.
        return 'mock://local';
      },
    },
  };
}
