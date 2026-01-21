/**
 * Reconnecting WebSocket client for the Chess Mastery Platform backend.
 *
 * Server expects:
 * - { type: "auth", token: "<JWT>" }
 * - { type: "join_game", gameId }
 * - { type: "leave_game", gameId }
 */

function getWsUrlFromEnv(apiBaseUrl) {
  const explicit = process.env.REACT_APP_WS_URL;
  if (explicit) return explicit;

  // derive from REST URL
  const u = new URL(apiBaseUrl);
  const wsProto = u.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProto}//${u.host}/ws`;
}

// PUBLIC_INTERFACE
export class WsClient {
  /** Create a WS client. Call connect() to start. */
  constructor({ apiBaseUrl, getToken, onEvent }) {
    this.apiBaseUrl = apiBaseUrl;
    this.getToken = getToken;
    this.onEvent = onEvent;

    this.ws = null;
    this.connected = false;

    this._shouldRun = false;
    this._reconnectAttempt = 0;
    this._reconnectTimer = null;

    this._joinedGames = new Set();
    this._pendingSends = [];
  }

  _emit(evt) {
    try {
      if (this.onEvent) this.onEvent(evt);
    } catch (_) {
      // ignore UI handler errors
    }
  }

  _scheduleReconnect() {
    if (!this._shouldRun) return;
    const base = 400;
    const max = 6000;
    const wait = Math.min(max, base * Math.pow(1.6, this._reconnectAttempt++));
    clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(() => this._connectInternal(), wait);
  }

  _flushPending() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    while (this._pendingSends.length) {
      const payload = this._pendingSends.shift();
      this.ws.send(payload);
    }
  }

  _send(obj) {
    const payload = JSON.stringify(obj);
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this._pendingSends.push(payload);
      return;
    }
    this.ws.send(payload);
  }

  _authAndResubscribe() {
    const token = this.getToken?.();
    if (token) this._send({ type: 'auth', token });

    // Re-join any previously joined rooms after reconnect
    for (const gameId of this._joinedGames) {
      this._send({ type: 'join_game', gameId });
    }
  }

  _connectInternal() {
    if (!this._shouldRun) return;

    const wsUrl = getWsUrlFromEnv(this.apiBaseUrl);
    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.onopen = () => {
      this.connected = true;
      this._reconnectAttempt = 0;
      this._emit({ type: 'ws_connected' });
      this._authAndResubscribe();
      this._flushPending();
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        this._emit({ type: 'ws_message', message: msg });
      } catch (e) {
        this._emit({ type: 'ws_error', message: 'Invalid WS message JSON' });
      }
    };

    ws.onclose = () => {
      this.connected = false;
      this._emit({ type: 'ws_disconnected' });
      this._scheduleReconnect();
    };

    ws.onerror = () => {
      // errors will lead to close; notify UI but don't throw
      this._emit({ type: 'ws_error', message: 'WebSocket error' });
    };
  }

  // PUBLIC_INTERFACE
  connect() {
    /** Start connecting and keep reconnecting while the client is active. */
    if (this._shouldRun) return;
    this._shouldRun = true;
    this._connectInternal();
  }

  // PUBLIC_INTERFACE
  disconnect() {
    /** Stop reconnect loop and close the socket. */
    this._shouldRun = false;
    clearTimeout(this._reconnectTimer);
    this._reconnectTimer = null;
    try {
      if (this.ws) this.ws.close();
    } catch (_) {
      // ignore
    }
    this.ws = null;
    this.connected = false;
  }

  // PUBLIC_INTERFACE
  joinGame(gameId) {
    /** Join a game room to receive moves/chat broadcasts. */
    if (!gameId) return;
    this._joinedGames.add(gameId);
    this._send({ type: 'join_game', gameId });
  }

  // PUBLIC_INTERFACE
  leaveGame(gameId) {
    /** Leave a game room. */
    if (!gameId) return;
    this._joinedGames.delete(gameId);
    this._send({ type: 'leave_game', gameId });
  }

  // PUBLIC_INTERFACE
  ping() {
    /** Ping server to keep connection warm. */
    this._send({ type: 'ping' });
  }
}
