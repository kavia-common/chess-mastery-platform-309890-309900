import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Button, TextArea } from './ui';
import { api } from '../api/client';
import { useAuth } from '../state/AuthContext';
import { useWs } from '../state/WsContext';

// PUBLIC_INTERFACE
export function ChatPanel({ gameId, disabled }) {
  /** In-game chat: initial history via REST, realtime updates via WS broadcasts. */
  const { user } = useAuth();
  const { lastMessage } = useWs();

  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [err, setErr] = useState(null);

  const listKey = useMemo(() => gameId || 'none', [gameId]);
  const endRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!gameId) {
        setMessages([]);
        return;
      }
      setLoading(true);
      setErr(null);
      try {
        const res = await api.chat.list(gameId);
        if (!mounted) return;
        setMessages(res.messages || []);
      } catch (e) {
        if (!mounted) return;
        setErr(e.message || 'Failed to load chat');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [listKey, gameId]);

  useEffect(() => {
    if (!gameId) return;
    if (!lastMessage) return;

    if (lastMessage.type === 'chat' && lastMessage.gameId === gameId && lastMessage.message) {
      setMessages((prev) => [...prev, {
        id: lastMessage.message.id,
        game_id: gameId,
        sender_user_id: lastMessage.message.senderUserId,
        message_text: lastMessage.message.messageText,
        created_at: lastMessage.message.createdAt,
      }]);
    }
  }, [lastMessage, gameId]);

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
      // broadcast comes via WS; do nothing else
    } catch (e) {
      setErr(e.message || 'Failed to send');
    }
  };

  return (
    <Card className="panelCard">
      <div className="panelHeader">
        <div className="panelTitle">Chat</div>
        <div className="panelSubtitle">{gameId ? 'In-game chat' : 'No active game'}</div>
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
