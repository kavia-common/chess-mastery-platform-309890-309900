import React, { useMemo, useState } from 'react';
import { Card, Input, Button, Pill } from './ui';
import { parseFen, pieceGlyph, coordsToSquare } from '../chess/fen';

// PUBLIC_INTERFACE
export function Chessboard({
  fen,
  myColor, // 'white'|'black'|null
  status, // active|finished|waiting
  onSubmitSan,
  submitting,
  lastMoveSan,
  error,
}) {
  /** Chessboard UI driven by backend FEN; move input is SAN (validated server-side). */
  const { board, turn } = useMemo(() => parseFen(fen), [fen]);
  const [selected, setSelected] = useState(null); // {r,c}
  const [san, setSan] = useState('');

  const turnLabel = turn === 'w' ? 'White' : 'Black';
  const isMyTurn = myColor ? ((turn === 'w' && myColor === 'white') || (turn === 'b' && myColor === 'black')) : false;

  return (
    <Card className="boardCard">
      <div className="boardHeader">
        <div className="boardTitle">Current game</div>
        <div className="boardMeta">
          <Pill tone={status === 'active' ? 'success' : status === 'finished' ? 'neutral' : 'warning'}>
            {status || '—'}
          </Pill>
          <Pill tone={isMyTurn ? 'success' : 'neutral'}>Turn: {turnLabel}</Pill>
          {myColor ? <Pill tone="neutral">You: {myColor}</Pill> : <Pill tone="neutral">Spectator</Pill>}
        </div>
      </div>

      <div className="boardWrap" aria-label="Chessboard">
        <div className="boardGrid">
          {board.map((row, r) =>
            row.map((cell, c) => {
              const isLight = (r + c) % 2 === 0;
              const isSelected = selected && selected.r === r && selected.c === c;
              const sq = coordsToSquare(r, c);

              return (
                <button
                  key={`${r}-${c}`}
                  className={`sq ${isLight ? 'sqLight' : 'sqDark'} ${isSelected ? 'sqSelected' : ''}`}
                  onClick={() => setSelected({ r, c })}
                  aria-label={`Square ${sq}${cell ? `, ${cell.color === 'w' ? 'white' : 'black'} ${cell.piece}` : ''}`}
                >
                  <span className="sqLabel">{sq}</span>
                  <span className="piece">{pieceGlyph(cell)}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="movePanel">
        <div className="movePanelRow">
          <Input
            label="Move (SAN)"
            value={san}
            onChange={(e) => setSan(e.target.value)}
            placeholder="e4, Nf3, O-O, ..."
            autoComplete="off"
          />
          <div className="moveActions">
            <Button
              onClick={() => {
                const v = san.trim();
                if (!v) return;
                onSubmitSan?.(v);
              }}
              disabled={submitting || !san.trim() || status !== 'active' || !isMyTurn}
              title={!isMyTurn ? 'Wait for your turn' : 'Submit move'}
            >
              {submitting ? 'Submitting…' : 'Play'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setSan('')}
              disabled={submitting || !san}
            >
              Clear
            </Button>
          </div>
        </div>

        {error ? <div className="inlineError">{error}</div> : null}
        {lastMoveSan ? <div className="inlineHint">Last move: <strong>{lastMoveSan}</strong></div> : null}
        <div className="inlineHint">
          Tip: This UI uses backend move validation. If a move is illegal, the server will reject it.
        </div>
      </div>
    </Card>
  );
}
