"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/Button";
import { PetalFan } from "@/components/shared/PetalMark";

type ScanOk = {
  result: "VALID";
  checkin_id: string;
  ticket: { ticket_id: string; participant_name: string };
  scan: string;
};

type Outcome =
  | { kind: "valid"; data: ScanOk }
  | { kind: "used" | "invalid" | "error"; line: string; detail: string };

const ICON = { valid: "\u2713", used: "!", invalid: "\u2715", error: "!" } as const;

/**
 * Pemindai QR kamera untuk check-in.
 * Alur: minta izin kamera -> decode QR terus-menerus -> kirim otomatis ke /api/checkin.
 * Satu QR order boleh dipindai sesuai jumlah tiket valid; setiap scan mengunci satu tiket.
 */
export function CheckinScanner({
  eventId,
  eventName,
}: {
  eventId: string;
  eventName: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastCode = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const busyRef = useRef(false);

  const [state, setState] = useState<"idle" | "starting" | "running" | "denied" | "unsupported">("idle");
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [history, setHistory] = useState<ScanOk[]>([]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setState("idle");
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const send = useCallback(
    async (code: string) => {
      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_token_hash: code, event_id: eventId }),
      });
      const payload = await response.json().catch(() => null);

      if (response.ok && payload?.data) {
        const data = payload.data as ScanOk;
        setOutcome({ kind: "valid", data });
        setHistory((prev) => [data, ...prev].slice(0, 20));
        if (navigator.vibrate) navigator.vibrate(60);
        return;
      }

      const code_ = payload?.error?.code as string | undefined;
      const message = (payload?.error?.message as string | undefined) ?? "Gagal memproses scan";
      if (code_ === "BATAS_SCAN") setOutcome({ kind: "used", line: "Sudah digunakan", detail: message });
      else if (code_ === "SCAN_BERSAMAAN") setOutcome({ kind: "error", line: "Coba lagi", detail: message });
      else if (response.status === 401 || response.status === 403)
        setOutcome({ kind: "error", line: "Sesi berakhir", detail: "Masuk ulang sebagai petugas" });
      else setOutcome({ kind: "invalid", line: "Tidak valid", detail: message });
      if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
    },
    [eventId],
  );

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w && h) {
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, w, h);
        const image = ctx.getImageData(0, 0, w, h);
        const found = jsQR(image.data, w, h, { inversionAttempts: "dontInvert" });

        if (found?.data && !busyRef.current) {
          const now = Date.now();
          const sameTooSoon = found.data === lastCode.current.code && now - lastCode.current.at < 2500;
          if (!sameTooSoon) {
            lastCode.current = { code: found.data, at: now };
            busyRef.current = true;
            void send(found.data).finally(() => {
              busyRef.current = false;
            });
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [send]);

  const start = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      setError("Perangkat ini tidak mendukung akses kamera. Gunakan HTTPS dan browser modern.");
      return;
    }

    setState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setState("running");
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      const name = (e as DOMException)?.name;
      setState(name === "NotAllowedError" ? "denied" : "idle");
      setError(
        name === "NotAllowedError"
          ? "Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser, lalu coba lagi."
          : name === "NotFoundError"
            ? "Kamera tidak ditemukan di perangkat ini."
            : "Kamera gagal dibuka. Pastikan tidak dipakai aplikasi lain.",
      );
    }
  };

  return (
    <section className="scanner">
      <div className="scanner-stage">
        <video ref={videoRef} className="scanner-video" playsInline muted aria-label="Pratinjau kamera" />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {state !== "running" ? (
          <div className="scanner-idle">
            <PetalFan stroke="currentColor" width={2.5} className="scanner-petal" />
            <p className="scanner-hint">
              {state === "denied"
                ? "Izin kamera ditolak"
                : state === "unsupported"
                  ? "Kamera tidak tersedia"
                  : "Kamera belum aktif"}
            </p>
            <p className="scanner-sub">{error ?? "Arahkan kamera ke QR e-ticket peserta."}</p>
            <Button onClick={start} disabled={state === "starting"}>
              {state === "starting" ? "Membuka kamera…" : "Nyalakan kamera"}
            </Button>
          </div>
        ) : (
          <>
            <div className="scanner-frame" aria-hidden="true" />
            <Button variant="secondary" size="small" className="scanner-stop" onClick={stopCamera}>
              Hentikan kamera
            </Button>
          </>
        )}

        <span className="scanner-event">{eventName}</span>
      </div>

      {outcome ? (
        <div className={`res res-${outcome.kind}`} role="status" aria-live="assertive">
          <span className="res-icon" aria-hidden="true">{ICON[outcome.kind]}</span>
          <span>
            {outcome.kind === "valid" ? "Valid" : outcome.line}
            <small>
              {outcome.kind === "valid"
                ? `${outcome.data.ticket.participant_name} · scan ${outcome.data.scan}`
                : outcome.detail}
            </small>
          </span>
        </div>
      ) : null}

      {history.length ? (
        <div className="scanner-history">
          <div className="section-head" style={{ margin: "16px 0 8px" }}>
            <h2 className="section-title">Scan sesi ini</h2>
            <span className="sub">{history.length} tiket</span>
          </div>
          <ul className="scanner-list">
            {history.map((h) => (
              <li key={h.checkin_id}>
                <b>{h.ticket.participant_name}</b>
                <span className="sub mono">{h.ticket.ticket_id}</span>
                <span className="badge badge-ok"><i className="dot" />{h.scan}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
