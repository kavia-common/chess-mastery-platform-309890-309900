import React, { useEffect, useState } from 'react';
import { Card, Button, Modal, Pill } from '../components/ui';
import { api } from '../api/client';

// PUBLIC_INTERFACE
export function HistoryPage() {
  /** Authenticated history list and basic analysis modal (move list + result). */
  const [games, setGames] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const [openGameId, setOpenGameId] = useState(null);
  const [moves, setMoves] = useState([]);
  const [movesErr, setMovesErr] = useState(null);
  const [movesLoading, setMovesLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await api.history.myGames({ limit: 50, offset: 0 });
        if (!mounted) return;
        setGames(res.games || []);
      } catch (e) {
        if (!mounted) return;
        setErr(e.message || 'Failed to load history');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const openAnalysis = async (gameId) => {
    setOpenGameId(gameId);
    setMoves([]);
    setMovesErr(null);
    setMovesLoading(true);
    try {
      const res = await api.games.getMoves(gameId);
      setMoves(res.moves || []);
    } catch (e) {
      setMovesErr(e.message || 'Failed to load moves');
    } finally {
      setMovesLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="pageTitle">Game history</div>

      {err ? <div className="inlineError">{err}</div> : null}
      {loading ? <div className="muted">Loading…</div> : null}

      <Card className="pageCard">
        <div className="sectionTitle">Your recent games</div>
        <div className="list">
          {games.map((g) => (
            <div key={g.id} className="listRow">
              <div className="listMain">
                <div className="listTitle">
                  {g.white_username} vs {g.black_username}
                </div>
                <div className="muted">
                  {g.status} · moves: {g.move_count} · updated: {new Date(g.updated_at).toLocaleString()}
                </div>
              </div>
              <div className="rowGap">
                <Pill tone={g.status === 'finished' ? 'neutral' : 'success'}>{g.status}</Pill>
                <Button variant="secondary" onClick={() => openAnalysis(g.id)}>
                  Analyze
                </Button>
              </div>
            </div>
          ))}
          {games.length === 0 && !loading ? <div className="muted">No games yet.</div> : null}
        </div>
      </Card>

      <Modal
        open={Boolean(openGameId)}
        title="Game analysis"
        onClose={() => setOpenGameId(null)}
        footer={
          <div className="rowBetween">
            <div className="muted">Move list is provided by backend; this is a basic viewer.</div>
            <Button variant="secondary" onClick={() => setOpenGameId(null)}>
              Close
            </Button>
          </div>
        }
      >
        {movesErr ? <div className="inlineError">{movesErr}</div> : null}
        {movesLoading ? <div className="muted">Loading moves…</div> : null}
        {!movesLoading && moves.length === 0 ? <div className="muted">No moves recorded.</div> : null}

        <div className="movesList">
          {moves.map((m) => (
            <div key={m.id} className="movesRow">
              <div className="movesNum">{m.move_number}.</div>
              <div className="movesSan">{m.san}</div>
              <div className="muted movesTime">{new Date(m.created_at).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
