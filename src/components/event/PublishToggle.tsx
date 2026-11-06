"use client";

import { useState } from "react";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/Toast";

export function PublishToggle({ published, label }: { published: boolean; label: string }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [on, setOn] = useState(published);

  async function change(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.checked;
    // kembalikan dulu, baru minta konfirmasi supaya saklar tidak "melompat" sendiri
    event.target.checked = on;

    const agreed = await confirm({
      title: next ? `Publikasikan "${label}"?` : `Tarik "${label}" dari publikasi?`,
      description: next
        ? "Event akan tampil di halaman peserta dan bisa dipesan sesuai periode penjualan."
        : "Event disembunyikan dari peserta. Pesanan yang sudah ada tidak berubah.",
      confirmLabel: next ? "Ya, publikasikan" : "Ya, tarik",
      tone: next ? "default" : "danger",
    });

    if (!agreed) {
      toast("Dibatalkan, status publikasi tidak berubah.", "info");
      return;
    }
    setOn(next);
    toast(next ? `"${label}" dipublikasikan.` : `"${label}" ditarik dari publikasi.`, next ? "ok" : "info");
  }

  return (
    <input
      type="checkbox"
      className="tgl"
      checked={on}
      aria-label={`Publikasikan ${label}`}
      onChange={change}
    />
  );
}
