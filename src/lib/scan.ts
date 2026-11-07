/**
 * Aturan scan QR — cermin logika server (/api/checkin), dipakai klien dan uji.
 * Server tetap sumber kebenaran; ini untuk pratinjau dan verifikasi perilaku.
 */

export type ScannableTicket = { id: string; ticketStatus: string };

/** Tiket yang masih menyumbang kuota scan: ISSUED atau USED. Refund/batal mengurangi (§8.6). */
export function validForScan<T extends ScannableTicket>(tickets: T[]): T[] {
  return tickets.filter((t) => t.ticketStatus === "ISSUED" || t.ticketStatus === "USED");
}

/**
 * Tiket yang dikunci oleh scan berikutnya.
 * `used` = jumlah scan berhasil sejauh ini; tiket ISSUED ke-`used` indexnya yang diambil,
 * karena yang sudah USED menempati urutan awal.
 */
export function allocateScan<T extends ScannableTicket>(used: number, tickets: ScannableTicket[]): T | null {
  const valid = validForScan(tickets) as T[];
  if (used < 0 || used >= valid.length) return null;
  const unclaimed = valid.filter((t) => t.ticketStatus === "ISSUED");
  const index = used - valid.filter((t) => t.ticketStatus === "USED").length;
  if (index < 0) return null;
  return unclaimed[index] ?? null;
}

export function isScanAllowed(used: number, tickets: ScannableTicket[]): boolean {
  return allocateScan(used, tickets) !== null;
}
