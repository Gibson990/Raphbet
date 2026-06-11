import type { PlacedBet, Transaction } from '../types';

/**
 * Generates and downloads a PDF bet receipt for the player. Uses the jsPDF
 * library loaded globally in index.html. `format` converts USD cents to a
 * display string (currency-aware). Returns false if jsPDF isn't available.
 * Handles both single bets and accumulators.
 */
export function downloadBetSlip(bet: PlacedBet, format: (cents: number) => string): boolean {
  const lib = (window as any).jspdf;
  if (!lib?.jsPDF) return false;
  const { jsPDF } = lib;

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a6' });
  const primary: [number, number, number] = [255, 107, 53];
  const ink: [number, number, number] = [30, 41, 59];
  const W = 105;

  doc.setFillColor(...primary);
  doc.rect(0, 0, W, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('RAPHBET — BET RECEIPT', W / 2, 9.5, { align: 'center' });

  doc.setTextColor(...ink);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Receipt: ${bet.id}`, 8, 23);
  doc.text(`Placed: ${new Date(bet.placedDate).toLocaleString()}`, 8, 28);
  doc.line(8, 32, W - 8, 32);

  const isMulti = !!bet.isMulti && Array.isArray(bet.selections) && bet.selections.length > 0;
  const legs = isMulti ? bet.selections! : [bet.selection];

  let y = 39;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(isMulti ? `ACCUMULATOR · ${legs.length} legs` : 'SELECTION', 8, y);
  y += 6;

  doc.setFontSize(8);
  legs.forEach((s) => {
    doc.setFont('Helvetica', 'bold');
    const l1 = doc.splitTextToSize(s.marketLabel, W - 16);
    doc.text(l1, 8, y);
    y += 4 * l1.length;
    doc.setFont('Helvetica', 'normal');
    const l2 = doc.splitTextToSize(`${s.matchDescription}  @ ${s.odds.toFixed(2)}`, W - 16);
    doc.text(l2, 8, y);
    y += 4 * l2.length + 1.5;
  });

  const combinedOdds = isMulti ? (bet.multiplier ?? legs.reduce((p, s) => p * s.odds, 1)) : bet.selection.odds;
  const boost = bet.winBoost ?? 0;
  const potential = bet.status === 'WON' ? (bet.payout ?? 0) : bet.wager * combinedOdds * (1 + boost);

  y += 1;
  const boxH = isMulti && boost > 0 ? 30 : 24;
  doc.setFillColor(241, 245, 249);
  doc.rect(8, y, W - 16, boxH, 'F');
  y += 6;
  const row = (label: string, val: string, color?: [number, number, number]) => {
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(...ink);
    doc.text(label, 12, y);
    doc.setFont('Helvetica', 'bold');
    if (color) doc.setTextColor(...color);
    doc.text(val, 58, y);
    doc.setTextColor(...ink);
    y += 6;
  };
  row('Stake:', format(bet.wager));
  row(isMulti ? 'Combined odds:' : 'Odds:', combinedOdds.toFixed(2));
  if (isMulti && boost > 0) row('Win boost:', `+${Math.round(boost * 100)}%`);
  row('Status:', bet.status, bet.status === 'WON' ? [22, 163, 74] : bet.status === 'LOST' ? [220, 38, 38] : [245, 158, 11]);
  row(bet.status === 'WON' ? 'Payout:' : 'To win:', format(potential), [22, 163, 74]);

  y += 2;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`HASH ${btoa(bet.id + bet.wager).slice(0, 24)}`, W / 2, y + 2, { align: 'center' });
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(...primary);
  doc.setFontSize(8.5);
  doc.text('Thank you for betting with Raphbet!', W / 2, y + 9, { align: 'center' });

  doc.save(`Raphbet_Bet_${bet.id.slice(0, 8)}.pdf`);
  return true;
}

/**
 * Generates and downloads a PDF receipt for a wallet transaction (deposit,
 * withdrawal, wager or payout). Returns false if jsPDF isn't available.
 */
export function downloadTransactionReceipt(tx: Transaction, format: (cents: number) => string): boolean {
  const lib = (window as any).jspdf;
  if (!lib?.jsPDF) return false;
  const { jsPDF } = lib;

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a6' });
  const primary: [number, number, number] = [255, 107, 53];
  const ink: [number, number, number] = [30, 41, 59];
  const W = 105;
  const isCredit = tx.type === 'Payout' || tx.type === 'Top-up';
  const kind = tx.type === 'Top-up' ? 'DEPOSIT' : tx.type === 'Withdrawal' ? 'WITHDRAWAL' : tx.type.toUpperCase();

  doc.setFillColor(...primary);
  doc.rect(0, 0, W, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('RAPHBET — TRANSACTION', W / 2, 9.5, { align: 'center' });

  doc.setTextColor(...ink);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Receipt: ${tx.id}`, 8, 23);
  doc.text(`Date: ${new Date(tx.date).toLocaleString()}`, 8, 28);
  doc.line(8, 32, W - 8, 32);

  let y = 40;
  doc.setFillColor(241, 245, 249);
  doc.rect(8, y - 5, W - 16, 30, 'F');
  const row = (label: string, val: string, color?: [number, number, number]) => {
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(...ink);
    doc.text(label, 12, y);
    doc.setFont('Helvetica', 'bold');
    if (color) doc.setTextColor(...color);
    doc.text(val, 50, y);
    doc.setTextColor(...ink);
    y += 6.5;
  };
  row('Type:', kind);
  row('Amount:', `${isCredit ? '+' : ''}${format(tx.amount)}`, isCredit ? [22, 163, 74] : [220, 38, 38]);
  row('Status:', 'Completed', [22, 163, 74]);

  y += 4;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...ink);
  const desc = doc.splitTextToSize(`Details: ${tx.description}`, W - 16);
  doc.text(desc, 8, y);
  y += 4 * desc.length + 4;

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`HASH ${btoa(tx.id + tx.amount).slice(0, 24)}`, W / 2, y, { align: 'center' });
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(...primary);
  doc.setFontSize(8.5);
  doc.text('Thank you for using Raphbet!', W / 2, y + 7, { align: 'center' });

  doc.save(`Raphbet_${kind}_${tx.id.slice(0, 8)}.pdf`);
  return true;
}
