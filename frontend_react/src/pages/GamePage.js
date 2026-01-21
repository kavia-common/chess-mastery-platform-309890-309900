import React, { useEffect, useMemo, useState } from 'react';
import { Card, Button, Pill } from '../components/ui';
import { Chessboard } from '../components/Chessboard';
import { ChatPanel } from '../components/ChatPanel';
import { MatchmakingModal } from '../components/MatchmakingModal';
import { api } from '../api/client';
import { useWs } from '../state/WsContext';

// PUBLIC_INTERFACE
export function GamePage() {
  /** Main game view: matchmaking + active game + board + chat; realtime updates via WS. */
  const { client, lastMessage, wsStatus } = useWs();

  const [matchOpen, setMatchOpen] = useState(false);

  const [gameId, setGameId] = useState(null);
  const [myColor, setMyColor] = useState(null); // from match_found: 'white'|'black'
  const [game, setGame] = useState(null);
  const [loadingGame, setLoadingGame] = useState(false);

  const [moveSubmitting, setMoveSubmitting] = useState(false);
  const [moveErr, setMoveErr] = useState(null);
  const [lastMoveSan, setLastMoveSan] = useState(null);

  const fen = game?.current_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const status = game?.status || (gameId ? 'active' : 'waiting');

  const sidePanelTitle = useMemo(() => (gameId ? 'Match info' : 'Welcome'), [gameId]);

  const loadGame = async (id) => {
    if (!id) return;
    setLoadingGame(true);
    setMoveErr(null);
    try {
      const res = await api.games.getGame(id);
      setGame(res.game);
    } catch (e) {
      setMoveErr(e.message || 'Failed to load game');
    } finally {
      setLoadingGame(false);
    }
  };

  useEffect(() => {
    if (!client) return;
    if (gameId) client.joinGame(gameId);
    return () => {
      if (client && gameId) client.leaveGame(gameId);
    };
  }, [client, gameId]);

  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'move' && lastMessage.gameId === gameId) {
      setGame((prev) => (prev ? { ...prev, current_fen: lastMessage.fenAfter, status: lastMessage.status || prev.status } : prev));
      setLastMoveSan(lastMessage.san);
    }

    if (lastMessage.type === 'game_finished' && lastMessage.gameId === gameId) {
      setGame((prev) => (prev ? { ...prev, status: 'finished', winner_user_id: lastMessage.winnerUserId } : prev));
    }
  }, [lastMessage, gameId]);

  const onMatched = async ({ gameId: newId, color }) => {
    setGameId(newId);
    setMyColor(color);
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
            <Pill tone={wsStatus === 'connected' ? 'success' : 'warning'}>WS: {wsStatus}</Pill>
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
              Join matchmaking to start a game. When matched, you will receive a <code>match_found</code> WebSocket event.
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
