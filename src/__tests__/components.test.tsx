// Uji perilaku komponen klien lewat vite (transpile TSX) + jsdom.
// Jalankan: npx vitest run
import { test, expect } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { QrScanner } from "../components/checkin/QrScanner";
import { RefundActions } from "../components/refund/RefundActions";

test("QrScanner: scan diterima sampai batas tiket valid, lalu ditolak (§8.6)", () => {
  render(
    <QrScanner
      orders={[{ id: "ORD-2026-003", buyer: "Rina Kusuma", paymentStatus: "SUCCESS" }]}
    />,
  );
  const btn = screen.getByRole("button", { name: /Scan ORD-2026-003/ });

  fireEvent.click(btn);
  expect(screen.getByText("Valid")).toBeDefined();
  expect(screen.getByText(/1\/2/)).toBeDefined();

  fireEvent.click(btn);
  expect(screen.getByText(/2\/2/)).toBeDefined();

  fireEvent.click(btn);
  expect(screen.getByText("Sudah digunakan")).toBeDefined();
  expect(screen.getByText(/2\/2/)).toBeDefined();
});

test("QrScanner: pembayaran belum sukses ditolak", () => {
  render(
    <QrScanner
      orders={[{ id: "ORD-2026-002", buyer: "Budi Hartono", paymentStatus: "PENDING" }]}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /Scan ORD-2026-002/ }));
  expect(screen.getByText("Tidak valid")).toBeDefined();
  expect(screen.getByText(/pending/i)).toBeDefined();
});

test("RefundActions: setujui → proses → selesai", () => {
  render(
    <RefundActions refundId="RF-003" status="UNDER_REVIEW" ticketId="T-002" participantName="Dian P." />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Setujui" }));
  expect(screen.getByText(/disetujui/i)).toBeDefined();

  fireEvent.click(screen.getByRole("button", { name: "Mulai proses" }));
  expect(screen.getByText(/sedang diproses/i)).toBeDefined();

  fireEvent.click(screen.getByRole("button", { name: "Tandai selesai" }));
  expect(screen.getByText(/dinonaktifkan/i)).toBeDefined();
  expect(screen.getByText(/Tidak ada tindakan tersisa/)).toBeDefined();
});
