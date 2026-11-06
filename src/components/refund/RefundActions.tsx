"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { REFUND_STATUS_LABEL } from "@/lib/utils";
import type { RefundStatus } from "@/types/admin";

const STEP: Partial<Record<RefundStatus, { label: string; next: RefundStatus; note: string; variant?: "primary" | "soft" }>> = {
  UNDER_REVIEW: { label: "Setujui pengajuan", next: "APPROVED", note: "Refund disetujui. Kirim dana manual, lalu tandai sedang diproses." },
  APPROVED: { label: "Mulai proses", next: "PROCESSING", note: "Refund ditandai sedang diproses." },
  PROCESSING: { label: "Tandai selesai", next: "COMPLETED", note: "Refund selesai. Tiket dinonaktifkan untuk check-in (§6.4 no.14)." },
  REQUESTED: { label: "Minta lengkapi data", next: "NEED_CONFIRMATION", note: "Notifikasi WhatsApp terkirim: peserta diminta melengkapi data refund.", variant: "soft" },
  NEED_CONFIRMATION: { label: "Kirim pengingat", next: "NEED_CONFIRMATION", note: "Pengingat WhatsApp terkirim ke peserta.", variant: "soft" },
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
  const [current, setCurrent] = useState<RefundStatus>(status);
  const [toast, setToast] = useState<string | null>(null);
  const step = STEP[current];

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
            onClick={() => {
              setCurrent(step.next);
              setToast(step.note);
            }}
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
            onClick={() => {
              setCurrent("REJECTED");
              setToast("Pengajuan ditolak. Penolakan tidak bisa dilanjutkan ke pengembalian dana (§6.4 no.15).");
            }}
          >
            Tolak
          </Button>
        ) : null}
      </div>

      {toast ? (
        <div className="note" role="status" aria-live="polite">{toast}</div>
      ) : null}

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
        <span className="eyebrow">Notifikasi WhatsApp</span>
        <Button
          variant="soft"
          size="small"
          style={{ marginTop: 10 }}
          onClick={() => setToast(`Template WhatsApp "status refund" dibuka untuk ${participantName} (${refundId} / ${ticketId}).`)}
        >
          Kirim pesan template
        </Button>
      </div>
    </Card>
  );
}
