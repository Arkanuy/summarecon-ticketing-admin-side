"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/Toast";

/**
 * Batalkan / aktifkan ulang event (§6.5).
 * Membatalkan tidak menghapus tiket; tiket penanda CANCELLED dan check-in ditolak.
 */
export function EventStatusActions({ eventId, eventName, status }: { eventId: string; eventName: string; status: string }) {
  const confirm = useConfirm();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function change(next: string, question: { title: string; description: string; label: string; danger?: boolean }) {
    const agreed = await confirm({
      title: question.title,
      description: question.description,
      confirmLabel: question.label,
      tone: question.danger ? "danger" : "default",
    });
    if (!agreed) return;

    setBusy(true);
    const res = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_status: next }),
    });
    setBusy(false);
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      toast(body?.error?.message ?? "Gagal mengubah status.", "bad");
      return;
    }
    toast(next === "CANCELLED" ? "Event dibatalkan." : "Event diaktifkan kembali.", next === "CANCELLED" ? "info" : "ok");
    router.refresh();
  }

  if (status === "CANCELLED") {
    return (
      <Button
        variant="secondary"
        size="small"
        disabled={busy}
        onClick={() =>
          change("DRAFT", {
            title: `Aktifkan ulang "${eventName}"?`,
            description:
              "Event kembali ke draf dan penjualan bisa dibuka lagi. Tiket lama yang berstatus CANCELLED perlu ditangani terpisah.",
            label: "Ya, aktifkan ulang",
          })
        }
      >
        Aktifkan ulang
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      size="small"
      disabled={busy}
      onClick={() =>
        change("CANCELLED", {
          title: `Batalkan "${eventName}"?`,
          description:
            "Event ditutup untuk penjualan dan semua tiket ditolak saat check-in. Pesanan yang sudah ada tidak dihapus.",
          label: "Ya, batalkan event",
          danger: true,
        })
      }
    >
      Batalkan event
    </Button>
  );
}
