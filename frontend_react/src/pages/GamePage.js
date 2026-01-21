import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Button, Pill } from '../components/ui';
import { Chessboard } from '../components/Chessboard';
import { ChatPanel } from '../components/ChatPanel';
import { MatchmakingModal } from '../components/MatchmakingModal';
import { api } from '../api/client';

const GAME_POLL_MS = 1200;

// PUBLIC_INTERFACE
export function GamePage() {
  /** Main game view: matchmaking + active game + board + chat; REST-only (polling), WebSockets disabled. */
  const [matchOpen, setMatchOpen] = useState(false);

  const [gameId, setGameId] = useState(null);
  const [myColor, setMyColor] = useState(null); // 'white'|'black'|null
  const [game, setGame] = useState(null);
  const [loadingGame, setLoadingGame] = useState(false);

  const [moveSubmitting, setMoveSubmitting] = useState(false);
  const [moveErr, setMoveErr] = useState(null);
  const [lastMoveSan, setLastMoveSan] = useState(null);

  // Prevent overlapping polls
  const pollingRef = useRef(false);

  const fen = game?.current_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const status = game?.status || (gameId ? 'active' : 'waiting');

  const sidePanelTitle = useMemo(() => (gameId ? 'Match info' : 'Welcome'), [gameId]);

  const loadGame = async (id, { silent = false } = {}) => {
    if (!id) return;
    if (!silent) setLoadingGame(true);
    setMoveErr(null);
    try {
      const res = await api.games.getGame(id);
      setGame(res.game);
    } catch (e) {
      setMoveErr(e.message || 'Failed to load game');
    } finally {
      if (!silent) setLoadingGame(false);
    }
  };

  // On mount, attempt to resume if backend reports we are already queued/matched.
  useEffect(() => {
    let mounted = true;

    async function tryResumeFromStatus() {
      try {
        const res = await api.matchmaking.status();
        if (!mounted) return;

        const maybeGameId = res.gameId || res.game_id || res.activeGameId || res.active_game_id;
        const maybeColor = res.color || res.myColor || res.my_color;

        if (maybeGameId) {
          setGameId(maybeGameId);
          setMyColor(maybeColor || null);
          await loadGame(maybeGameId);
        }
      } catch (_) {
        // ignore; user might not be authed or backend might not support these fields
      }
    }

    tryResumeFromStatus();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll game state while a game is active.
  useEffect(() => {
    if (!gameId) return undefined;

    // initial load
    loadGame(gameId);

    const t = setInterval(async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      try {
        await loadGame(gameId, { silent: true });
      } finally {
        pollingRef.current = false;
      }
    }, GAME_POLL_MS);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const onMatched = async ({ gameId: newId, color }) => {
    setGameId(newId);
    setMyColor(color || null);
    await loadGame(newId);
  };

  const resign = async () => {
    if (!gameId) return;
    setMoveErr(null);
    try {
      const res = await api.games.resign(gameId);
      setGame(res.game);
    } catch (e) {
      setMoveErr(e.message || 'Failed to resign');
    }
  };

  const draw = async () => {
    if (!gameId) return;
    setMoveErr(null);
    try {
      const res = await api.games.draw(gameId);
      setGame(res.game);
    } catch (e) {
      setMoveErr(e.message || 'Failed to offer draw');
    }
  };

  const submitSan = async (san) => {
    if (!gameId) return;
    setMoveErr(null);
    setMoveSubmitting(true);
    try {
      const res = await api.games.submitMove(gameId, { san });
      setGame(res.game);
      setLastMoveSan(res.move?.san || san);

      // No WS broadcast => refresh immediately to reflect opponent/legal-state changes.
      await loadGame(gameId, { silent: true });
    } catch (e) {
      setMoveErr(e.message || 'Move rejected');
    } finally {
      setMoveSubmitting(false);
    }
  };

  return (
    <div className="appGrid">
      <div className="mainColumn">
        <div className="rowBetween" style={{ marginBottom: 12 }}>
          <div className="rowGap">
            <Button onClick={() => setMatchOpen(true)}>Matchmaking</Button>
            {gameId ? (
              <Button variant="secondary" onClick={() => loadGame(gameId)} disabled={loadingGame}>
                {loadingGame ? 'Refreshing…' : 'Refresh game'}
              </Button>
            ) : null}
          </div>
          <div className="rowGap">
            <Pill tone="neutral">Mode: REST polling</Pill>
            {gameId ? <Pill tone="neutral">Game: {gameId.slice(0, 8)}</Pill> : <Pill tone="neutral">No game</Pill>}
          </div>
        </div>

        <Chessboard
          fen={fen}
          myColor={myColor}
          status={status}
          onSubmitSan={submitSan}
          submitting={moveSubmitting}
          lastMoveSan={lastMoveSan}
          error={moveErr}
        />
      </div>

      <div className="sideColumn">
        <Card className="panelCard">
          <div className="panelHeader">
            <div className="panelTitle">{sidePanelTitle}</div>
            <div className="panelSubtitle">Actions & status</div>
          </div>

          {!gameId ? (
            <div className="muted">
              Join matchmaking to start a game. This build uses REST-only polling to detect match assignment and game
              updates.
            </div>
          ) : (
            <div className="stack">
              <div className="rowBetween">
                <span className="muted">Status</span>
                <Pill tone={status === 'active' ? 'success' : 'neutral'}>{status}</Pill>
              </div>
              <div className="rowBetween">
                <span className="muted">Color</span>
                <Pill tone="neutral">{myColor || '—'}</Pill>
              </div>
              <div className="rowGap" style={{ marginTop: 8 }}>
                <Button variant="secondary" onClick={draw} disabled={status !== 'active'}>
                  Draw
                </Button>
                <Button variant="danger" onClick={resign} disabled={status !== 'active'}>
                  Resign
                </Button>
              </div>
            </div>
          )}
        </Card>

        <ChatPanel gameId={gameId} disabled={!gameId} />
      </div>

      <MatchmakingModal open={matchOpen} onClose={() => setMatchOpen(false)} onMatched={onMatched} />
    </div>
  );
}
