"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/Toast";
import { REFUND_STATUS_LABEL } from "@/lib/utils";
import type { RefundStatus } from "@/types/admin";

type Step = {
  label: string;
  next: RefundStatus;
  note: string;
  variant?: "primary" | "soft";
  confirm: { title: string; description: string; confirmLabel: string; tone?: "default" | "danger" };
};

const STEP: Partial<Record<RefundStatus, Step>> = {
  UNDER_REVIEW: {
    label: "Setujui pengajuan",
    next: "APPROVED",
    note: "Refund disetujui. Kirim dana manual, lalu tandai sedang diproses.",
    confirm: {
      title: "Setujui pengajuan refund?",
      description: "Peserta akan dianggap berhak menerima dana. Pengembalian tetap dilakukan manual di luar sistem.",
      confirmLabel: "Ya, setujui",
    },
  },
  APPROVED: {
    label: "Mulai proses",
    next: "PROCESSING",
    note: "Refund ditandai sedang diproses.",
    confirm: {
      title: "Mulai proses pengembalian dana?",
      description: "Status berubah menjadi sedang diproses. Pastikan data rekening sudah diperiksa sebelum transfer.",
      confirmLabel: "Ya, mulai proses",
    },
  },
  PROCESSING: {
    label: "Tandai selesai",
    next: "COMPLETED",
    note: "Refund selesai. Tiket dinonaktifkan untuk check-in (§6.4 no.14).",
    confirm: {
      title: "Tandai refund selesai?",
      description: "Tiket terkait akan dinonaktifkan permanen dan tidak bisa dipakai check-in. Tindakan ini tidak bisa dibatalkan.",
      confirmLabel: "Ya, tandai selesai",
      tone: "danger",
    },
  },
  REQUESTED: {
    label: "Minta lengkapi data",
    next: "NEED_CONFIRMATION",
    note: "Notifikasi WhatsApp terkirim: peserta diminta melengkapi data refund.",
    variant: "soft",
    confirm: {
      title: "Minta peserta melengkapi data?",
      description: "Sistem akan mengirim pesan WhatsApp berisi tautan pengisian data rekening atau e-wallet.",
      confirmLabel: "Kirim permintaan",
    },
  },
  NEED_CONFIRMATION: {
    label: "Kirim ulang pengingat",
    next: "NEED_CONFIRMATION",
    note: "Pengingat WhatsApp terkirim ke peserta.",
    variant: "soft",
    confirm: {
      title: "Kirim pengingat WhatsApp?",
      description: "Pesan pengingat dikirim ke nomor peserta yang terdaftar pada order.",
      confirmLabel: "Kirim pengingat",
    },
  },
};

export function RefundActions({
  refundId,
  status,
  ticketId,
  participantName,
}: {
  refundId: string;
  status: RefundStatus;
  ticketId: string;
  participantName: string;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [current, setCurrent] = useState<RefundStatus>(status);
  const [busy, setBusy] = useState(false);
  const step = STEP[current];

  const advance = async (next: RefundStatus, note: string, dialog: Step["confirm"]) => {
    const agreed = await confirm(dialog);
    if (!agreed) {
      toast("Dibatalkan, tidak ada perubahan status.", "info");
      return;
    }
    setBusy(true);
    setCurrent(next);
    setBusy(false);
    toast(note, next === "REJECTED" ? "bad" : next === "COMPLETED" ? "ok" : "info");
  };

  return (
    <Card>
      <h2 className="section-title">Tindakan</h2>
      <p className="sub" style={{ fontSize: 12, lineHeight: 1.7, margin: "8px 0 16px" }}>
        Pengembalian dana dilakukan manual lewat bank atau e-wallet. Sistem hanya mengelola status dan riwayat.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {step ? (
          <Button
            variant={step.variant ?? "primary"}
            size="block"
            data-busy={busy || undefined}
            onClick={() => advance(step.next, step.note, step.confirm)}
          >
            {step.label}
          </Button>
        ) : (
          <span className="sub">Tidak ada tindakan tersisa untuk status {REFUND_STATUS_LABEL[current]}.</span>
        )}

        {current === "UNDER_REVIEW" ? (
          <Button
            variant="secondary"
            size="block"
            onClick={() =>
              advance("REJECTED", "Pengajuan ditolak. Penolakan tidak bisa dilanjutkan ke pengembalian dana (§6.4 no.15).", {
                title: "Tolak pengajuan refund?",
                description: "Peserta tidak bisa melanjutkan ke proses pengembalian dana. Alasan penolakan akan tercatat di riwayat.",
                confirmLabel: "Ya, tolak",
                tone: "danger",
              })
            }
          >
            Tolak
          </Button>
        ) : null}
      </div>

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
        <span className="eyebrow">Notifikasi WhatsApp</span>
        <Button
          variant="soft"
          size="small"
          style={{ marginTop: 10 }}
          onClick={async () => {
            const agreed = await confirm({
              title: "Kirim pesan template?",
              description: `Template status refund akan dibuka untuk ${participantName} (${refundId} / ${ticketId}).`,
              confirmLabel: "Kirim",
            });
            if (agreed) toast(`Template WhatsApp dikirim ke ${participantName}.`, "ok");
            else toast("Pengiriman dibatalkan.", "info");
          }}
        >
          Kirim pesan template
        </Button>
      </div>
    </Card>
  );
}
