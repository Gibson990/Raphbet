import type { PlacedBet, Transaction } from '../types';

/**
 * PDF receipts for players (bet slips + wallet transactions), generated with
 * the jsPDF library loaded globally in index.html. `format` converts USD cents
 * to a display string (currency-aware). Both functions resolve false if jsPDF
 * isn't available.
 *
 * Design: dark brand header with the real logo, amount-led hero, hairline
 * detail rows and a verification footer — matching the in-app look.
 */

type RGB = [number, number, number];
const PRIMARY: RGB = [255, 107, 53];
const DARK: RGB = [15, 17, 21];     // brand neutral-dark
const INK: RGB = [30, 41, 59];
const MUTED: RGB = [130, 140, 155];
const HAIR: RGB = [226, 232, 240];  // hairline separators
const PANEL: RGB = [248, 250, 252];
const GREEN: RGB = [22, 163, 74];
const RED: RGB = [220, 38, 38];
const AMBER: RGB = [217, 119, 6];

const W = 105; // a6 portrait (105 × 148 mm)
const H = 148;
const M = 9;   // page margin

// The real brand badge (public/logo.png) embedded as a data URL, downscaled
// to 96px via canvas so the PDF stays a few KB instead of embedding the full
// 512px asset. Cached after the first load; null means unavailable.
let logoCache: string | null | undefined;
async function loadLogo(): Promise<string | null> {
  if (logoCache !== undefined) return logoCache;
  try {
    const blob = await (await fetch('/logo.png')).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, 96, 96);
    logoCache = canvas.toDataURL('image/png');
  } catch {
    logoCache = null;
  }
  return logoCache;
}

/** Dark brand band: real logo badge, two-tone wordmark, receipt subtitle. */
function drawHeader(doc: any, subtitle: string, logo: string | null) {
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, 24, 'F');

  if (logo) {
    doc.addImage(logo, 'PNG', M, 6, 12, 12);
  } else {
    // Fallback mark if the logo asset can't be loaded.
    doc.setFillColor(...PRIMARY);
    doc.roundedRect(M, 6, 12, 12, 2.6, 2.6, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(M + 6, 12, 3.4, 'F');
  }

  // Two-tone wordmark: "Raph" white + "bet" orange, like the app header.
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('Raph', M + 15, 13);
  const w = doc.getTextWidth('Raph');
  doc.setTextColor(...PRIMARY);
  doc.text('bet', M + 15 + w, 13);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(160, 168, 180);
  doc.text(subtitle.toUpperCase(), M + 15, 18.2, { charSpace: 0.6 });

  // Orange accent strip under the band.
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 24, W, 1.1, 'F');
}

/** Centered status pill with a tinted fill. */
function drawPill(doc: any, label: string, color: RGB, centerX: number, y: number) {
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7);
  const tw = doc.getTextWidth(label);
  const pw = tw + 9;
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(centerX - pw / 2, y, pw, 6.4, 3.2, 3.2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(label, centerX, y + 4.3, { align: 'center' });
}

/** Detail rows inside a soft panel: muted labels left, bold values right. */
function drawDetailPanel(doc: any, title: string, rows: { label: string; value: string; color?: RGB }[], y: number): number {
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(title.toUpperCase(), M, y, { charSpace: 0.6 });
  y += 3;

  const rowH = 8.2;
  const panelH = rows.length * rowH + 2;
  doc.setFillColor(...PANEL);
  doc.roundedRect(M, y, W - 2 * M, panelH, 2, 2, 'F');

  let ry = y + 6.2;
  rows.forEach((r, i) => {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(r.label, M + 4, ry);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...(r.color ?? INK));
    doc.text(r.value, W - M - 4, ry, { align: 'right' });
    if (i < rows.length - 1) {
      doc.setDrawColor(...HAIR);
      doc.setLineWidth(0.2);
      doc.line(M + 4, ry + 2.6, W - M - 4, ry + 2.6);
    }
    ry += rowH;
  });
  return y + panelH;
}

/** Tear-line, verification code chip, thank-you and small print at the page foot. */
function drawFooter(doc: any, hashSeed: string) {
  const y = H - 28;
  doc.setDrawColor(...HAIR);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([1.6, 1.6], 0);
  doc.line(M, y, W - M, y);
  doc.setLineDashPattern([], 0);

  const code = btoa(hashSeed).replace(/[^A-Za-z0-9]/g, '').slice(0, 16).toUpperCase();
  doc.setFillColor(...PANEL);
  doc.roundedRect(W / 2 - 24, y + 4, 48, 7, 1.6, 1.6, 'F');
  doc.setFont('Courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...INK);
  doc.text(code.replace(/(.{4})/g, '$1 ').trim(), W / 2, y + 8.7, { align: 'center' });

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...PRIMARY);
  doc.text('Thank you for playing with Raphbet!', W / 2, y + 17, { align: 'center' });
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(...MUTED);
  doc.text('18+ · Play responsibly · raphbet.com', W / 2, y + 21.5, { align: 'center' });
}

/** Generates and downloads a wallet transaction receipt. */
export async function downloadTransactionReceipt(tx: Transaction, format: (cents: number) => string, playerName?: string): Promise<boolean> {
  const lib = (window as any).jspdf;
  if (!lib?.jsPDF) return false;
  const { jsPDF } = lib;
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a6' });
  const logo = await loadLogo();

  const isCredit = tx.type === 'Payout' || tx.type === 'Top-up';
  const kind = tx.type === 'Top-up' ? 'Deposit' : tx.type === 'Withdrawal' ? 'Withdrawal' : tx.type;
  // Honest status wording: a withdrawal ledger entry means the funds are held
  // pending review, not that the payout has happened.
  const status: { label: string; color: RGB } =
    tx.type === 'Top-up' ? { label: 'CONFIRMED', color: GREEN }
    : tx.type === 'Payout' ? { label: 'CREDITED', color: GREEN }
    : tx.type === 'Wager' ? { label: 'ACCEPTED', color: DARK }
    : { label: 'UNDER REVIEW', color: AMBER };

  drawHeader(doc, 'Transaction receipt', logo);

  // Amount-led hero, like payment-app receipts.
  let y = 38;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(kind.toUpperCase(), W / 2, y, { align: 'center', charSpace: 1 });
  y += 9.5;
  doc.setFontSize(21);
  const amountColor: RGB = isCredit ? GREEN : RED;
  doc.setTextColor(...amountColor);
  // ASCII hyphen, not U+2212: jsPDF's built-in fonts can't encode the Unicode
  // minus and would print a garbage glyph.
  doc.text(`${isCredit ? '+' : '-'}${format(Math.abs(tx.amount))}`, W / 2, y, { align: 'center' });
  y += 5.5;
  drawPill(doc, status.label, status.color, W / 2, y);
  y += 14;

  y = drawDetailPanel(doc, 'Details', [
    { label: 'Reference', value: tx.id.slice(0, 18).toUpperCase() },
    { label: 'Date', value: new Date(tx.date).toLocaleString() },
    ...(playerName ? [{ label: 'Player', value: playerName }] : []),
    { label: 'Description', value: tx.description.length > 34 ? tx.description.slice(0, 33) + '…' : tx.description },
  ], y);

  drawFooter(doc, tx.id + tx.amount);
  doc.save(`Raphbet_${kind}_${tx.id.slice(0, 8)}.pdf`);
  return true;
}

/** Generates and downloads a bet receipt (single bets and accumulators). */
export async function downloadBetSlip(bet: PlacedBet, format: (cents: number) => string, playerName?: string): Promise<boolean> {
  const lib = (window as any).jspdf;
  if (!lib?.jsPDF) return false;
  const { jsPDF } = lib;
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a6' });
  const logo = await loadLogo();

  drawHeader(doc, 'Bet receipt', logo);

  const isMulti = !!bet.isMulti && Array.isArray(bet.selections) && bet.selections.length > 0;
  const legs = isMulti ? bet.selections! : [bet.selection];
  const combinedOdds = isMulti ? (bet.multiplier ?? legs.reduce((p, s) => p * s.odds, 1)) : bet.selection.odds;
  const boost = bet.winBoost ?? 0;
  const settled = bet.status === 'WON' || bet.status === 'CASHED_OUT';
  const lost = bet.status === 'LOST';
  const potential = settled ? (bet.payout ?? 0) : bet.wager * combinedOdds * (1 + boost);
  const statusColor: RGB = settled ? GREEN : lost ? RED : AMBER;
  const statusLabel = bet.status === 'CASHED_OUT' ? 'CASHED OUT' : bet.status;

  // Content must stop above the footer zone (dashed line at H-28 = 120mm);
  // anything taller flows onto a new page (accas can carry up to 20 legs).
  const FLOOR = 118;
  const ensure = (y: number, needed: number): number => {
    if (y + needed <= FLOOR) return y;
    doc.addPage();
    return 14;
  };

  // Title row: bet kind left, status pill right.
  let y = 31;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(isMulti ? `Accumulator · ${legs.length} legs` : 'Single bet', M, y);
  doc.setFontSize(7);
  const stw = doc.getTextWidth(statusLabel) + 9;
  doc.setFillColor(...statusColor);
  doc.roundedRect(W - M - stw, y - 4.6, stw, 6.4, 3.2, 3.2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(statusLabel, W - M - stw / 2, y - 0.3, { align: 'center' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(`${bet.id.slice(0, 18).toUpperCase()}  ·  ${new Date(bet.placedDate).toLocaleString()}${playerName ? `  ·  ${playerName}` : ''}`, M, y + 4.5);
  y += 8;

  // Selections: market bold + match underneath, odds right, hairlines. Drawn
  // in page-sized chunks so long accumulators paginate cleanly.
  const legBlockH = 9.2;
  let i = 0;
  while (i < legs.length) {
    const fit = Math.max(1, Math.floor((FLOOR - y - 2) / legBlockH));
    const chunk = legs.slice(i, i + fit);
    const cardH = chunk.length * legBlockH + 1.5;
    doc.setFillColor(...PANEL);
    doc.roundedRect(M, y, W - 2 * M, cardH, 2, 2, 'F');
    let ly = y + 5;
    chunk.forEach((s, j) => {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...INK);
      const market = s.marketLabel.length > 34 ? s.marketLabel.slice(0, 33) + '…' : s.marketLabel;
      doc.text(market, M + 4, ly);
      doc.setTextColor(...PRIMARY);
      doc.text(`@ ${s.odds.toFixed(2)}`, W - M - 4, ly, { align: 'right' });
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(...MUTED);
      const match = s.matchDescription.length > 52 ? s.matchDescription.slice(0, 51) + '…' : s.matchDescription;
      doc.text(match, M + 4, ly + 3.4);
      if (j < chunk.length - 1) {
        doc.setDrawColor(...HAIR);
        doc.setLineWidth(0.2);
        doc.line(M + 4, ly + 5.6, W - M - 4, ly + 5.6);
      }
      ly += legBlockH;
    });
    y += cardH + 4;
    i += chunk.length;
    if (i < legs.length) { doc.addPage(); y = 14; }
  }

  const summaryRows = [
    { label: 'Stake', value: format(bet.wager) },
    { label: isMulti ? 'Combined odds' : 'Odds', value: combinedOdds.toFixed(2) },
    ...(isMulti && boost > 0 ? [{ label: 'Acca win boost', value: `+${Math.round(boost * 100)}%`, color: PRIMARY }] : []),
  ];
  y = ensure(y, summaryRows.length * 8.2 + 6);
  y = drawDetailPanel(doc, 'Summary', summaryRows, y);
  y += 4;

  // Payout band: the number the player cares about, in a tinted strip.
  y = ensure(y, 12);
  doc.setFillColor(settled ? 232 : lost ? 254 : 255, settled ? 248 : lost ? 235 : 247, settled ? 238 : lost ? 235 : 237);
  doc.roundedRect(M, y, W - 2 * M, 11, 2, 2, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(settled ? 'PAYOUT' : lost ? 'RESULT' : 'POTENTIAL PAYOUT', M + 4, y + 7, { charSpace: 0.6 });
  doc.setFontSize(13);
  doc.setTextColor(...(lost ? RED : GREEN));
  doc.text(lost ? `-${format(bet.wager)}` : format(potential), W - M - 4, y + 7.6, { align: 'right' });

  drawFooter(doc, bet.id + bet.wager);
  doc.save(`Raphbet_Bet_${bet.id.slice(0, 8)}.pdf`);
  return true;
}
