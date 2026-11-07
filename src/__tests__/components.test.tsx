// Uji: batas scan per order (1 QR, 5 tiket = 5 kali scan) dan konfirmasi aksi.
import { test, expect } from "vitest";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { ConfirmProvider } from "../components/ui/ConfirmProvider";
import { ToastProvider } from "../components/ui/Toast";
import { RefundActions } from "../components/refund/RefundActions";
import { allocateScan, isScanAllowed } from "../lib/scan";

const wrap = (node: ReactNode) => (
  <ToastProvider>
    <ConfirmProvider>{node}</ConfirmProvider>
  </ToastProvider>
);

/** Klik aksi lalu tekan tombol konfirmasi di modal. */
async function confirmAnd(triggerName: RegExp | string, confirmName: RegExp | string) {
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  const buttons = screen.getAllByRole("button", { name: triggerName });
  fireEvent.click(buttons[buttons.length - 1]);
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("button", { name: confirmName }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

test("satu QR order 5 tiket: scan 1..5 diterima, scan ke-6 ditolak", () => {
  const tickets = Array.from({ length: 5 }, (_, i) => ({ id: `T-${i + 1}`, ticketStatus: "ISSUED" }));
  const results: string[] = [];

  for (let used = 0; used < 6; used++) {
    const allowed = isScanAllowed(used, tickets);
    const next = allocateScan(used, tickets);
    results.push(allowed && next ? next.id : `DITOLAK(${used}/5)`);
  }

  expect(results).toEqual(["T-1", "T-2", "T-3", "T-4", "T-5", "DITOLAK(5/5)"]);
});

test("refund parsial mengurangi kuota scan", () => {
  const tickets = [
    { id: "T-1", ticketStatus: "ISSUED" },
    { id: "T-2", ticketStatus: "REFUNDED" },
    { id: "T-3", ticketStatus: "ISSUED" },
  ];
  const valid = tickets.filter((t) => t.ticketStatus !== "REFUNDED" && t.ticketStatus !== "CANCELLED");
  expect(valid).toHaveLength(2);
  expect(isScanAllowed(1, valid)).toBe(true);
  expect(isScanAllowed(2, valid)).toBe(false); // scan ke-3 ditolak
});

test("tiket yang belum dibayar tidak boleh dipindai", () => {
  const tickets = [{ id: "T-1", ticketStatus: "RESERVED" }];
  expect(isScanAllowed(0, tickets)).toBe(false);
  expect(allocateScan(0, tickets)).toBeNull();
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
