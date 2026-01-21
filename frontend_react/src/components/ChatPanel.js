import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Button, TextArea } from './ui';
import { api } from '../api/client';
import { useAuth } from '../state/AuthContext';

const CHAT_POLL_MS = 2000;

// PUBLIC_INTERFACE
export function ChatPanel({ gameId, disabled }) {
  /** In-game chat: REST-only (polling). WebSockets are disabled in this frontend build. */
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [err, setErr] = useState(null);

  const listKey = useMemo(() => gameId || 'none', [gameId]);
  const endRef = useRef(null);

  const load = async ({ silent = false } = {}) => {
    if (!gameId) {
      setMessages([]);
      return;
    }
    if (!silent) setLoading(true);
    setErr(null);
    try {
      const res = await api.chat.list(gameId);
      setMessages(res.messages || []);
    } catch (e) {
      setErr(e.message || 'Failed to load chat');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    if (!mounted) return undefined;

    // initial load
    load();

    // lightweight polling
    const t = setInterval(() => {
      // silent so UI doesn't flicker
      load({ silent: true });
    }, CHAT_POLL_MS);

    return () => {
      mounted = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey, gameId]);

  useEffect(() => {
    // keep scrolled to bottom when messages change
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const v = text.trim();
    if (!v || !gameId) return;
    setErr(null);
    try {
      await api.chat.send(gameId, { messageText: v });
      setText('');
      // Refresh immediately since there's no WS broadcast.
      await load({ silent: true });
    } catch (e) {
      setErr(e.message || 'Failed to send');
    }
  };

  return (
    <Card className="panelCard">
      <div className="panelHeader">
        <div className="panelTitle">Chat</div>
        <div className="panelSubtitle">{gameId ? 'In-game chat (polling)' : 'No active game'}</div>
      </div>

      <div className="chatBody" aria-label="Chat messages">
        {loading ? <div className="muted">Loading…</div> : null}
        {!loading && messages.length === 0 ? <div className="muted">No messages yet.</div> : null}
        {messages.map((m) => {
          const mine = user && m.sender_user_id === user.id;
          return (
            <div key={m.id} className={`chatMsg ${mine ? 'chatMine' : ''}`}>
              <div className="chatMeta">
                <span className="chatAuthor">{mine ? 'You' : m.sender_user_id?.slice(0, 8)}</span>
                <span className="chatTime">{new Date(m.created_at).toLocaleTimeString()}</span>
              </div>
              <div className="chatText">{m.message_text}</div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {err ? <div className="inlineError">{err}</div> : null}

      <div className="chatComposer">
        <TextArea
          label="Message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder={disabled ? 'Join a game to chat…' : 'Say something…'}
          disabled={disabled || !gameId}
        />
        <div className="chatActions">
          <Button onClick={send} disabled={disabled || !gameId || !text.trim()}>
            Send
          </Button>
        </div>
      </div>
    </Card>
  );
}
