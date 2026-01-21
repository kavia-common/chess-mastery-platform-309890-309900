import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Pill } from './ui';
import { api } from '../api/client';

const MATCHMAKING_POLL_MS = 1500;

// PUBLIC_INTERFACE
export function MatchmakingModal({ open, onClose, onMatched }) {
  /** Join/leave queue; REST-only polling for match assignment (WebSockets disabled). */
  const [queued, setQueued] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const title = useMemo(() => (queued ? 'Matchmaking (Queued)' : 'Matchmaking'), [queued]);

  const refresh = async ({ silent = false } = {}) => {
    setErr(null);
    if (!silent) setLoading(true);
    try {
      const res = await api.matchmaking.status();
      setQueued(Boolean(res.queued));

      // Backend implementations commonly include a game id when matched.
      // We support multiple possible shapes to avoid coupling to a single response schema.
      const gameId = res.gameId || res.game_id || res.activeGameId || res.active_game_id;
      const color = res.color || res.myColor || res.my_color;

      if (gameId) {
        // matched: close modal and notify parent
        setQueued(false);
        onMatched?.({ gameId, color: color || null });
        onClose?.();
      }
    } catch (e) {
      setErr(e.message || 'Failed to fetch status');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return undefined;

    // initial status fetch
    refresh();

    // lightweight polling while modal is open
    const t = setInterval(() => refresh({ silent: true }), MATCHMAKING_POLL_MS);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
            <Button variant="ghost" onClick={() => refresh()} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>
      }
    >
      <div className="muted">
        Queue up for a match. This frontend build uses REST-only polling to detect when a match has been assigned.
      </div>
      {err ? (
        <div className="inlineError" style={{ marginTop: 10 }}>
          {err}
        </div>
      ) : null}
    </Modal>
  );
}
