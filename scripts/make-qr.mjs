/**
 * Buat kartu e-ticket (JPG) per order: QR + info acara.
 * Jalankan: node scripts/make-qr.mjs            -> semua order
 *           node scripts/make-qr.mjs ORD-ATR-001
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import QRCode from "qrcode";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const prisma = new PrismaClient();
const OUT = resolve(process.cwd(), "public", "qr");

const W = 900;
const H = 1200;

function wrap(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

async function card({ order, event, venue, tickets, eTicket }) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // latar krem
  ctx.fillStyle = "#FFF8F5";
  ctx.fillRect(0, 0, W, H);

  // header gradasi (135°) vermilion -> jingga -> saffron
  const grad = ctx.createLinearGradient(0, 0, W * 0.85, 320);
  grad.addColorStop(0, "#D93A2F");
  grad.addColorStop(0.6, "#EE6A35");
  grad.addColorStop(1, "#F4A23B");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(40, 40, W - 80, 300, [28, 28, 120, 120]);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.font = "700 20px sans-serif";
  ctx.fillText("E-TICKET · SATU QR PER ORDER", 90, 110);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 44px sans-serif";
  const titleLines = wrap(ctx, event.eventName, W - 200);
  titleLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, 90, 175 + i * 52));

  ctx.font = "400 22px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,.95)";
  ctx.fillText(
    `${new Date(event.startAt).toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })} · ${venue}`,
    90,
    290,
  );

  // QR putih
  const qrData = eTicket.qrTokenHash;
  const qrBuf = await QRCode.toBuffer(qrData, {
    type: "png",
    width: 560,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#2A1F2D", light: "#FFFFFF" },
  });
  const qrImg = await loadImage(qrBuf);

  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.roundRect(W / 2 - 310, 380, 620, 620, 28);
  ctx.fill();
  ctx.drawImage(qrImg, W / 2 - 280, 410, 560, 560);

  // info
  ctx.fillStyle = "#2A1F2D";
  ctx.font = "800 30px sans-serif";
  ctx.fillText(order.orderCode, 90, 1060);

  ctx.font = "400 22px sans-serif";
  ctx.fillStyle = "#6E6270";
  ctx.fillText(`Order ${order.id} · ${tickets.length} tiket`, 90, 1096);

  const sudah = eTicket.successfulScanCount;
  ctx.fillText(`Terpakai ${sudah}/${eTicket.validTicketCount} · sisa ${Math.max(0, eTicket.validTicketCount - sudah)} scan`, 90, 1130);

  // daftar peserta
  const names = tickets.map((t) => t.participantName).slice(0, 4).join(" · ");
  ctx.font = "400 19px sans-serif";
  ctx.fillStyle = "#8C1F2B";
  const nameLines = wrap(ctx, names + (tickets.length > 4 ? ` +${tickets.length - 4}` : ""), W - 180);
  ctx.fillText(nameLines[0] ?? "", 90, 1170);

  // footer
  ctx.fillStyle = "#9C8B91";
  ctx.font = "400 16px sans-serif";
  ctx.fillText(`Summarecon · ${qrData}`, 90, 1198);

  return canvas.encode("jpeg", 92);
}

async function main() {
  const only = process.argv[2];
  mkdirSync(OUT, { recursive: true });

  const orders = await prisma.order.findMany({
    where: only ? { id: only } : {},
    include: { event: { include: { venue: true } }, tickets: true, eTicket: true },
    orderBy: { createdAt: "asc" },
  });

  let ok = 0;
  for (const order of orders) {
    if (!order.eTicket) {
      console.log(`lewati ${order.id}: belum ada e-ticket`);
      continue;
    }
    const jpg = await card({
      order,
      event: order.event,
      venue: order.event.venue.venueName,
      tickets: order.tickets,
      eTicket: order.eTicket,
    });
    const file = resolve(OUT, `${order.orderCode}.jpg`);
    writeFileSync(file, jpg);
    console.log(`${order.orderCode}.jpg  (${(jpg.length / 1024).toFixed(0)} KB)  ${order.eTicket.qrTokenHash}`);
    ok++;
  }
  console.log(`\nSelesai: ${ok} gambar di ${OUT}`);
}

main()
  .catch((e) => {
    console.error("Gagal:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
