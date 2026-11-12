"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/Toast";
import { allowedActions, EVENT_ACTION_LABEL, type EventAction } from "@/lib/event-status";

/** Kalimat konfirmasi per aksi. Aksi destruktif diberi tone danger. */
const CONFIRM: Record<EventAction, (name: string) => { title: string; description: string; tone?: "danger" }> = {
  publish: (n) => ({
    title: `Terbitkan "${n}"?`,
    description: "Event terlihat oleh peserta, tetapi penjualan belum dibuka sampai kamu menekan Buka penjualan.",
  }),
  unpublish: (n) => ({
    title: `Tarik "${n}" ke draf?`,
    description: "Event disembunyikan dari peserta. Pesanan yang sudah ada tidak berubah dan kursi tidak dilepas.",
    tone: "danger",
  }),
  open_sales: (n) => ({
    title: `Buka penjualan "${n}"?`,
    description: "Peserta bisa mulai membeli tiket sekarang. Pastikan harga, kuota, dan denah sudah benar.",
  }),
  close_sales: (n) => ({
    title: `Tutup penjualan "${n}"?`,
    description: "Tidak ada tiket baru yang bisa dibeli. Event tetap terlihat peserta dan tiket lama tetap berlaku.",
  }),
  cancel: (n) => ({
    title: `Batalkan "${n}"?`,
    description:
      "Semua tiket ditolak saat check-in dan kursi yang belum terjual dikunci. Pesanan yang sudah ada tidak dihapus.",
    tone: "danger",
  }),
  reactivate: (n) => ({
    title: `Aktifkan ulang "${n}"?`,
    description:
      "Event kembali ke draf dan kursi yang dikunci karena pembatalan dibuka lagi. Tiket lama perlu ditangani terpisah.",
  }),
};

const VARIANT: Record<EventAction, "primary" | "secondary" | "danger"> = {
  publish: "primary",
  unpublish: "secondary",
  open_sales: "primary",
  close_sales: "secondary",
  cancel: "danger",
  reactivate: "primary",
};

/**
 * Tombol transisi status event. Aksi yang ditawarkan mengikuti status saat ini
 * (lihat allowedActions), jadi admin tidak pernah melihat tombol yang tidak berlaku.
 * Membatalkan tidak menghapus tiket; tiket ditandai CANCELLED dan check-in ditolak.
 */
export function EventStatusActions({
  eventId,
  eventName,
  status,
}: {
  eventId: string;
  eventName: string;
  status: string;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState<EventAction | null>(null);

  const actions = allowedActions(status);
  if (actions.length === 0) return null;

  async function run(action: EventAction) {
    const step = CONFIRM[action](eventName);
    const agreed = await confirm({
      title: step.title,
      description: step.description,
      confirmLabel: `Ya, ${EVENT_ACTION_LABEL[action].toLowerCase()}`,
      tone: step.tone ?? "default",
    });
    if (!agreed) return;

    setBusy(action);
    const res = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(null);

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      toast(body?.error?.message ?? "Gagal mengubah status event.", "bad");
      return;
    }
    toast(`${eventName}: ${EVENT_ACTION_LABEL[action].toLowerCase()} berhasil.`, "ok");
    router.refresh();
  }

  return (
    <div className="actions-row">
      {actions.map((action) => (
        <Button
          key={action}
          variant={VARIANT[action]}
          size="small"
          disabled={busy !== null}
          onClick={() => run(action)}
        >
          {busy === action ? "Memproses…" : EVENT_ACTION_LABEL[action]}
        </Button>
      ))}
    </div>
  );
}
