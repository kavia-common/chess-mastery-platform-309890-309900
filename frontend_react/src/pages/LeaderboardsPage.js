import React, { useEffect, useState } from 'react';
import { Card, Pill } from '../components/ui';
import { api } from '../api/client';

// PUBLIC_INTERFACE
export function LeaderboardsPage() {
  /** Public leaderboard view (top by rating). */
  const [rows, setRows] = useState([]);
  const [recent, setRecent] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [top, rec] = await Promise.all([api.leaderboards.top(50), api.leaderboards.recent(10)]);
        if (!mounted) return;
        setRows(top.leaderboard || []);
        setRecent(rec.recentGames || []);
      } catch (e) {
        if (!mounted) return;
        setErr(e.message || 'Failed to load leaderboard');
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="page">
      <div className="pageTitle">Leaderboards</div>

      {err ? <div className="inlineError">{err}</div> : null}

      <div className="grid2">
        <Card className="pageCard">
          <div className="sectionTitle">Top players</div>
          <div className="table">
            <div className="tableRow tableHead">
              <div>#</div>
              <div>Player</div>
              <div style={{ textAlign: 'right' }}>ELO</div>
            </div>
            {rows.map((r, idx) => (
              <div key={r.user_id} className="tableRow">
                <div>{idx + 1}</div>
                <div>{r.username}</div>
                <div style={{ textAlign: 'right' }}>
                  <Pill tone="neutral">{r.rating}</Pill>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="pageCard">
          <div className="sectionTitle">Recent games</div>
          <div className="muted" style={{ marginBottom: 10 }}>
            Latest activity across the platform.
          </div>
          <div className="list">
            {recent.map((g) => (
              <div key={g.game_id} className="listRow">
                <div className="listMain">
                  <div className="listTitle">
                    {g.white_username} vs {g.black_username}
                  </div>
                  <div className="muted">Status: {g.status}</div>
                </div>
                <div className="listSide">
                  <Pill tone="neutral">{new Date(g.updated_at).toLocaleDateString()}</Pill>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
