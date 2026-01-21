import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Pill } from './ui';
import { api } from '../api/client';
import { useWs } from '../state/WsContext';

// PUBLIC_INTERFACE
export function MatchmakingModal({ open, onClose, onMatched }) {
  /** Join/leave queue; when WS match_found arrives, notify parent with {gameId,color}. */
  const { lastMessage } = useWs();
  const [queued, setQueued] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const title = useMemo(() => (queued ? 'Matchmaking (Queued)' : 'Matchmaking'), [queued]);

  const refresh = async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await api.matchmaking.status();
      setQueued(Boolean(res.queued));
    } catch (e) {
      setErr(e.message || 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === 'match_found') {
      // server: {type:'match_found', gameId, color}
      setQueued(false);
      onMatched?.({ gameId: lastMessage.gameId, color: lastMessage.color });
      onClose?.();
    }
  }, [lastMessage, onClose, onMatched]);

  const join = async () => {
    setErr(null);
    setLoading(true);
    try {
      await api.matchmaking.join();
      setQueued(true);
    } catch (e) {
      setErr(e.message || 'Failed to join');
    } finally {
      setLoading(false);
    }
  };

  const leave = async () => {
    setErr(null);
    setLoading(true);
    try {
      await api.matchmaking.leave();
      setQueued(false);
    } catch (e) {
      setErr(e.message || 'Failed to leave');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <div className="rowBetween">
          <div className="rowGap">
            <Pill tone={queued ? 'success' : 'neutral'}>{queued ? 'Queued' : 'Not queued'}</Pill>
            {loading ? <span className="muted">Working…</span> : null}
          </div>
          <div className="rowGap">
            {queued ? (
              <Button variant="secondary" onClick={leave} disabled={loading}>
                Leave queue
              </Button>
            ) : (
              <Button onClick={join} disabled={loading}>
                Join queue
              </Button>
            )}
            <Button variant="ghost" onClick={refresh} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>
      }
    >
      <div className="muted">
        Queue up for a real-time match. When a match is found, you will be redirected into the game automatically via WebSocket.
      </div>
      {err ? <div className="inlineError" style={{ marginTop: 10 }}>{err}</div> : null}
    </Modal>
  );
}
