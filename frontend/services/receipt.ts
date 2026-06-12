import type { PlacedBet, Transaction } from '../types';

/**
 * PDF receipts for players (bet slips + wallet transactions), generated with
 * the jsPDF library loaded globally in index.html. `format` converts USD cents
 * to a display string (currency-aware). Both functions return false if jsPDF
 * isn't available.
 */

type RGB = [number, number, number];
const PRIMARY: RGB = [255, 107, 53];
const INK: RGB = [30, 41, 59];
const MUTED: RGB = [148, 163, 184];
const ROW_BG: RGB = [248, 250, 252];
const GREEN: RGB = [22, 163, 74];
const RED: RGB = [220, 38, 38];
const AMBER: RGB = [217, 119, 6];

const W = 105; // a6 portrait width (mm)
const M = 8;   // page margin

/** Brand header: orange band with a circular logo mark and the wordmark. */
function drawHeader(doc: any, subtitle: string) {
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, W, 18, 'F');
  // Logo mark: white disc + orange "R"
  doc.setFillColor(255, 255, 255);
  doc.circle(M + 5, 9, 5, 'F');
  doc.setTextColor(...PRIMARY);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('R', M + 5, 11.2, { align: 'center' });
  // Wordmark + subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text('RAPHBET', M + 13, 8.5);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(subtitle, M + 13, 13.5);
}

/** Meta block under the header: player, receipt id, date. */
function drawMeta(doc: any, rows: [string, string][], startY: number): number {
  let y = startY;
  doc.setFontSize(7.5);
  rows.forEach(([label, value]) => {
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), M, y);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(...INK);
    doc.text(value, W - M, y, { align: 'right' });
    y += 4.5;
  });
  doc.setDrawColor(226, 232, 240);
  doc.line(M, y, W - M, y);
  return y + 6;
}

/** Striped label/value table: labels left, values right-aligned. */
function drawTable(doc: any, rows: { label: string; value: string; color?: RGB }[], startY: number): number {
  const rowH = 7;
  let y = startY;
  rows.forEach((r, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(...ROW_BG);
      doc.rect(M, y - 4.6, W - 2 * M, rowH, 'F');
    }
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(r.label, M + 3, y);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(...(r.color ?? INK));
    doc.text(r.value, W - M - 3, y, { align: 'right' });
    y += rowH;
  });
  return y;
}

/** Footer: verification hash + thank-you line. */
function drawFooter(doc: any, hashSeed: string, y: number) {
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(`VERIFICATION ${btoa(hashSeed).slice(0, 24)}`, W / 2, y, { align: 'center' });
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(8.5);
  doc.text('Thank you for playing with Raphbet!', W / 2, y + 6, { align: 'center' });
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...MUTED);
  doc.text('18+ · Play responsibly · raphbet.com', W / 2, y + 11, { align: 'center' });
}

/** Generates and downloads a bet receipt (single bets and accumulators). */
export function downloadBetSlip(bet: PlacedBet, format: (cents: number) => string, playerName?: string): boolean {
  const lib = (window as any).jspdf;
  if (!lib?.jsPDF) return false;
  const { jsPDF } = lib;
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a6' });

  drawHeader(doc, 'Official bet receipt');

  const meta: [string, string][] = [];
  if (playerName) meta.push(['Player', playerName]);
  meta.push(['Receipt', bet.id.slice(0, 20)]);
  meta.push(['Placed', new Date(bet.placedDate).toLocaleString()]);
  let y = drawMeta(doc, meta, 25);

  const isMulti = !!bet.isMulti && Array.isArray(bet.selections) && bet.selections.length > 0;
  const legs = isMulti ? bet.selections! : [bet.selection];

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  doc.text(isMulti ? `ACCUMULATOR — ${legs.length} LEGS` : 'SELECTION', M, y);
  y += 5;

  doc.setFontSize(8);
  legs.forEach((s) => {
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(...INK);
    const l1 = doc.splitTextToSize(s.marketLabel, W - 2 * M - 14);
    doc.text(l1, M, y);
    doc.text(`@ ${s.odds.toFixed(2)}`, W - M, y, { align: 'right' });
    y += 3.8 * l1.length;
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(...MUTED);
    const l2 = doc.splitTextToSize(s.matchDescription, W - 2 * M);
    doc.text(l2, M, y);
    y += 3.8 * l2.length + 2;
  });

  const combinedOdds = isMulti ? (bet.multiplier ?? legs.reduce((p, s) => p * s.odds, 1)) : bet.selection.odds;
  const boost = bet.winBoost ?? 0;
  const settled = bet.status === 'WON' || bet.status === 'CASHED_OUT';
  const potential = settled ? (bet.payout ?? 0) : bet.wager * combinedOdds * (1 + boost);

  const statusColor: RGB = bet.status === 'WON' || bet.status === 'CASHED_OUT' ? GREEN : bet.status === 'LOST' ? RED : AMBER;
  const statusLabel = bet.status === 'CASHED_OUT' ? 'CASHED OUT' : bet.status;

  y += 2;
  const rows = [
    { label: 'Stake', value: format(bet.wager) },
    { label: isMulti ? 'Combined odds' : 'Odds', value: combinedOdds.toFixed(2) },
    ...(isMulti && boost > 0 ? [{ label: 'Win boost', value: `+${Math.round(boost * 100)}%` }] : []),
    { label: 'Status', value: statusLabel, color: statusColor },
    { label: settled ? 'Payout' : 'Potential payout', value: format(potential), color: GREEN },
  ];
  y = drawTable(doc, rows, y);

  drawFooter(doc, bet.id + bet.wager, y + 5);
  doc.save(`Raphbet_Bet_${bet.id.slice(0, 8)}.pdf`);
  return true;
}

/** Generates and downloads a wallet transaction receipt. */
export function downloadTransactionReceipt(tx: Transaction, format: (cents: number) => string, playerName?: string): boolean {
  const lib = (window as any).jspdf;
  if (!lib?.jsPDF) return false;
  const { jsPDF } = lib;
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a6' });

  const isCredit = tx.type === 'Payout' || tx.type === 'Top-up';
  const kind = tx.type === 'Top-up' ? 'DEPOSIT' : tx.type === 'Withdrawal' ? 'WITHDRAWAL' : tx.type.toUpperCase();
  // Honest status wording: a withdrawal ledger entry means the funds are held
  // pending review, not that the payout has happened.
  const status: { label: string; color: RGB } =
    tx.type === 'Top-up' ? { label: 'Confirmed', color: GREEN }
    : tx.type === 'Payout' ? { label: 'Credited', color: GREEN }
    : tx.type === 'Wager' ? { label: 'Accepted', color: INK }
    : { label: 'Requested — under review', color: AMBER };

  drawHeader(doc, 'Transaction receipt');

  const meta: [string, string][] = [];
  if (playerName) meta.push(['Player', playerName]);
  meta.push(['Receipt', tx.id.slice(0, 20)]);
  meta.push(['Date', new Date(tx.date).toLocaleString()]);
  let y = drawMeta(doc, meta, 25);

  // Transaction kind pill, colored by direction.
  const pillColor: RGB = isCredit ? GREEN : tx.type === 'Withdrawal' ? AMBER : RED;
  doc.setFillColor(...pillColor);
  doc.roundedRect(M, y - 3.5, 38, 7, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(kind, M + 19, y + 1, { align: 'center' });
  y += 9;

  y = drawTable(doc, [
    // ASCII hyphen, not U+2212: jsPDF's built-in Helvetica can't encode the
    // Unicode minus and would print a garbage glyph.
    { label: 'Amount', value: `${isCredit ? '+' : '-'}${format(Math.abs(tx.amount))}`, color: isCredit ? GREEN : RED },
    { label: 'Type', value: kind },
    { label: 'Status', value: status.label, color: status.color },
  ], y);

  y += 3;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  const desc = doc.splitTextToSize(tx.description, W - 2 * M);
  doc.text(desc, M, y);
  y += 3.8 * desc.length + 4;

  drawFooter(doc, tx.id + tx.amount, y);
  doc.save(`Raphbet_${kind}_${tx.id.slice(0, 8)}.pdf`);
  return true;
}
