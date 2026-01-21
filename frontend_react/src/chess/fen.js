/**
 * Minimal FEN helpers (UI-only).
 * We rely on backend for full legality validation; this is to render board + basic turn.
 */

// PUBLIC_INTERFACE
export function parseFen(fen) {
  /**
   * Parse a FEN string into a board matrix and metadata.
   * Returns { board: 8x8 array of { piece, color } | null, turn: 'w'|'b', raw }
   */
  const [placement, turn] = fen.split(' ');
  const rows = placement.split('/');
  const board = rows.map((row) => {
    const cells = [];
    for (const ch of row) {
      if (/[1-8]/.test(ch)) {
        const n = Number(ch);
        for (let i = 0; i < n; i++) cells.push(null);
      } else {
        const isUpper = ch === ch.toUpperCase();
        const color = isUpper ? 'w' : 'b';
        const piece = ch.toLowerCase(); // p,n,b,r,q,k
        cells.push({ piece, color });
      }
    }
    return cells;
  });

  return { board, turn: turn || 'w', raw: fen };
}

// PUBLIC_INTERFACE
export function squareToCoords(sq) {
  /** Convert algebraic square like 'e4' to { r,c } with r=0 at rank 8. */
  const file = sq[0];
  const rank = Number(sq[1]);
  const c = file.charCodeAt(0) - 'a'.charCodeAt(0);
  const r = 8 - rank;
  return { r, c };
}

// PUBLIC_INTERFACE
export function coordsToSquare(r, c) {
  /** Convert {r,c} to algebraic square 'a1'..'h8' */
  const file = String.fromCharCode('a'.charCodeAt(0) + c);
  const rank = 8 - r;
  return `${file}${rank}`;
}

const PIECE_GLYPHS = {
  wp: '♙',
  wn: '♘',
  wb: '♗',
  wr: '♖',
  wq: '♕',
  wk: '♔',
  bp: '♟',
  bn: '♞',
  bb: '♝',
  br: '♜',
  bq: '♛',
  bk: '♚',
};

// PUBLIC_INTERFACE
export function pieceGlyph(cell) {
  /** Map a FEN cell {piece,color} to a Unicode glyph. */
  if (!cell) return '';
  return PIECE_GLYPHS[`${cell.color}${cell.piece}`] || '';
}
