// Uji perilaku komponen klien: konfirmasi wajib ditekan, baru aksi dijalankan.
import { test, expect } from "vitest";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { ConfirmProvider } from "../components/ui/ConfirmProvider";
import { ToastProvider } from "../components/ui/Toast";
import { QrScanner } from "../components/checkin/QrScanner";
import { RefundActions } from "../components/refund/RefundActions";

const wrap = (node: ReactNode) => (
  <ToastProvider>
    <ConfirmProvider>{node}</ConfirmProvider>
  </ToastProvider>
);

/** Klik aksi lalu tekan tombol konfirmasi di modal. */
async function confirmAnd(triggerName: RegExp | string, confirmName: RegExp | string) {
  // tunggu modal sebelumnya benar-benar tertutup (animasi keluar 160ms)
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  const buttons = screen.getAllByRole("button", { name: triggerName });
  fireEvent.click(buttons[buttons.length - 1]);
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("button", { name: confirmName }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

test("QrScanner: modal muncul dulu, scan berjalan setelah dikonfirmasi", async () => {
  render(wrap(<QrScanner orders={[{ id: "ORD-2026-003", buyer: "Rina Kusuma", paymentStatus: "SUCCESS" }]} />));

  // tanpa konfirmasi, belum ada hasil
  fireEvent.click(screen.getByRole("button", { name: /Scan ORD-2026-003/ }));
  await screen.findByRole("dialog");
  expect(screen.queryByText(/1\/2/)).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: /Ya, proses scan/ }));
  await waitFor(() => expect(screen.getByText(/1\/2/)).toBeDefined());
});

test("QrScanner: scan diterima sampai batas tiket valid, lalu ditolak (§8.6)", async () => {
  render(wrap(<QrScanner orders={[{ id: "ORD-2026-003", buyer: "Rina Kusuma", paymentStatus: "SUCCESS" }]} />));

  await confirmAnd(/Scan ORD-2026-003/, /Ya, proses scan/);
  await waitFor(() => expect(screen.getAllByText(/1\/2/).length).toBeGreaterThan(0));

  await confirmAnd(/Scan ORD-2026-003/, /Ya, proses scan/);
  await waitFor(() => expect(screen.getAllByText(/2\/2/).length).toBeGreaterThan(0));

  await confirmAnd(/Scan ORD-2026-003/, /Ya, proses scan/);
  await waitFor(() => expect(screen.getAllByText("Sudah digunakan").length).toBeGreaterThan(0));
});

test("QrScanner: pembayaran belum sukses ditolak", async () => {
  render(wrap(<QrScanner orders={[{ id: "ORD-2026-002", buyer: "Budi Hartono", paymentStatus: "PENDING" }]} />));
  await confirmAnd(/Scan ORD-2026-002/, /Ya, proses scan/);
  await waitFor(() => expect(screen.getByText("Tidak valid")).toBeDefined());
});

test("RefundActions: setujui → proses → selesai, tiap langkah minta konfirmasi", async () => {
  render(wrap(<RefundActions refundId="RF-003" status="UNDER_REVIEW" ticketId="T-002" participantName="Dian P." />));

  await confirmAnd(/Setujui pengajuan/, /Ya, setujui/);
  await waitFor(() => expect(screen.getByRole("button", { name: "Mulai proses" })).toBeDefined());

  await confirmAnd("Mulai proses", /Ya, mulai proses/);
  await waitFor(() => expect(screen.getByRole("button", { name: "Tandai selesai" })).toBeDefined());

  await confirmAnd("Tandai selesai", /Ya, tandai selesai/);
  await waitFor(() => expect(screen.getByText(/Tidak ada tindakan tersisa/)).toBeDefined());
});

test("RefundActions: batal konfirmasi tidak mengubah status", async () => {
  render(wrap(<RefundActions refundId="RF-003" status="UNDER_REVIEW" ticketId="T-002" participantName="Dian P." />));
  fireEvent.click(screen.getByRole("button", { name: /Setujui pengajuan/ }));
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("button", { name: "Batal" }));
  await waitFor(() => expect(screen.getByRole("button", { name: /Setujui pengajuan/ })).toBeDefined());
});
