"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/Toast";

/**
 * Saklar yang benar-benar menyimpan perubahan ke server.
 * Dipakai untuk publikasi event dan status aktif venue.
 */
export function ToggleSwitch({
  on: initialOn,
  label,
  endpoint,
  bodyKey,
  onValue = true,
  offValue = false,
  onText,
  offText,
  confirmOn,
  confirmOff,
}: {
  on: boolean;
  label: string;
  endpoint: string;
  bodyKey: string;
  onValue?: string | boolean;
  offValue?: string | boolean;
  onText: string;
  offText: string;
  confirmOn: { title: string; description: string };
  confirmOff: { title: string; description: string };
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const router = useRouter();
  const [on, setOn] = useState(initialOn);
  const [pending, startTransition] = useTransition();

  async function change(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.checked;
    event.target.checked = on; // jangan melompat sebelum disetujui

    const step = next ? confirmOn : confirmOff;
    const agreed = await confirm({
      title: step.title,
      description: step.description,
      confirmLabel: next ? "Ya" : "Ya, ubah",
      tone: next ? "default" : "danger",
    });
    if (!agreed) {
      toast("Dibatalkan, tidak ada yang berubah.", "info");
      return;
    }

    setOn(next); // optimistis
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [bodyKey]: next ? onValue : offValue }),
    });

    if (!res.ok) {
      setOn(!next); // kembalikan kalau server menolak
      const body = await res.json().catch(() => null);
      toast(body?.error?.message ?? "Gagal membuat event.", "bad");
      return;
    }

    toast(next ? onText : offText, next ? "ok" : "info");
    startTransition(() => router.refresh());
  }

  return (
    <input
      type="checkbox"
      className="tgl"
      checked={on}
      disabled={pending}
      aria-label={label}
      onChange={change}
    />
  );
}
