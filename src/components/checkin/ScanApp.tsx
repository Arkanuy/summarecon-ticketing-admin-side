"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

type EventOption = { event_id: string; event_name: string };

type Outcome =
  | { kind: "valid"; name: string; ticketId: string; scan: string; remaining: number; event: string }
  | { kind: "used"; line: string; detail: string }
  | { kind: "invalid"; line: string; detail: string };

const ICON = { valid: "\u2713", used: "!", invalid: "\u2715" } as const;
const CODE_KEY = "scan_access_code";
const EVENT_KEY = "scan_event_id";

/** Pemindai mandiri untuk petugas: tanpa login admin, cukup kode akses perangkat. */
export function ScanApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScan = useRef({ code: "", at: 0 });
  const busy = useRef(false);

  const [code, setCode] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventId, setEventId] = useState("");
  const [camera, setCamera] = useState<"off" | "starting" | "on" | "denied">("off");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [log, setLog] = useState<{ id: string; name: string; scan: string; at: string }[]>([]);

  useEffect(() => {
    const savedCode = sessionStorage.getItem(CODE_KEY);
    const savedEvent = sessionStorage.getItem(EVENT_KEY) ?? "";
    if (savedCode) {
      setCode(savedCode);
      void authorize(savedCode, savedEvent);
    }
  }, []);

  const authorize = async (value: string, preferredEvent = "") => {
    setAuthError(null);
    const response = await fetch("/api/checkin/public", { headers: { "x-scan-code": value } });
    if (!response.ok) {
      setAuthed(false);
      setAuthError(response.status === 401 ? "Kode akses salah. Minta kode ke admin." : "Gagal memuat daftar event.");
      return;
    }
    const payload = await response.json();
    const list: EventOption[] = (payload?.data ?? []).map((e: { event_id: string; event_name: string }) => ({
      event_id: e.event_id,
      event_name: e.event_name,
    }));
    setEvents(list);
    const pick = list.find((e) => e.event_id === preferredEvent) ?? list[0];
    setEventId(pick?.event_id ?? "");
    if (pick) sessionStorage.setItem(EVENT_KEY, pick.event_id);
    sessionStorage.setItem(CODE_KEY, value);
    setAuthed(true);
  };

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamera("off");
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const submit = useCallback(
    async (qr: string) => {
      const response = await fetch("/api/checkin/public", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-scan-code": sessionStorage.getItem(CODE_KEY) ?? "" },
        body: JSON.stringify({ qr_token_hash: qr, event_id: eventId }),
      });
      const payload = await response.json().catch(() => null);

      if (response.ok && payload?.data) {
        const d = payload.data;
        setOutcome({
          kind: "valid",
          name: d.ticket.participant_name,
          ticketId: d.ticket.ticket_id,
          scan: d.scan,
          remaining: d.remaining,
          event: d.event_name ?? "",
        });
        setLog((prev) =>
          [{ id: d.ticket.ticket_id, name: d.ticket.participant_name, scan: d.scan, at: new Date().toLocaleTimeString("id-ID") }, ...prev].slice(0, 30),
        );
        navigator.vibrate?.(60);
        return;
      }

      const errCode = payload?.error?.code as string | undefined;
      const message = (payload?.error?.message as string | undefined) ?? "Gagal memproses";
      if (errCode === "BATAS_SCAN") setOutcome({ kind: "used", line: "Sudah digunakan", detail: message });
      else setOutcome({ kind: "invalid", line: "Tidak valid", detail: message });
      navigator.vibrate?.([40, 60, 40]);
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
        if (found?.data && !busy.current) {
          const now = Date.now();
          if (!(found.data === lastScan.current.code && now - lastScan.current.at < 2500)) {
            lastScan.current = { code: found.data, at: now };
            busy.current = true;
            void submit(found.data).finally(() => {
              busy.current = false;
            });
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [submit]);

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Perangkat ini tidak mendukung kamera. Gunakan browser modern di HTTPS.");
      return;
    }
    setCamera("starting");
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
      setCamera("on");
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      const name = (e as DOMException)?.name;
      setCamera(name === "NotAllowedError" ? "denied" : "off");
      setCameraError(
        name === "NotAllowedError"
          ? "Izin kamera ditolak. Buka pengaturan situs, izinkan kamera, lalu muat ulang."
          : name === "NotFoundError"
            ? "Kamera tidak ditemukan di perangkat ini."
            : "Kamera gagal dibuka. Pastikan tidak sedang dipakai aplikasi lain.",
      );
    }
  };

  if (!authed) {
    return (
      <div className="scan-shell">
        <div className="scan-card">
          <span className="eyebrow"><i className="eyebrow-line" />Check-in petugas</span>
          <h1 className="scan-title">Masukkan kode akses</h1>
          <p className="page-lead" style={{ marginBottom: 18 }}>
            Kode diberikan admin. Perangkat ini akan mengingat kode sampai tab ditutup.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void authorize(code.trim());
            }}
          >
            <div className="field">
              <label htmlFor="code">Kode akses</label>
              <input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="mis. SCAN-2026"
                autoComplete="off"
                inputMode="text"
              />
            </div>
            {authError ? <p className="login-error" role="alert">{authError}</p> : null}
            <button type="submit" className="button button-primary button-block">Masuk ke pemindai</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="scan-shell">
      <header className="scan-topbar">
        <span className="scan-brand">Summarecon · Check-in</span>
        {events.length > 1 ? (
          <select
            className="scan-select"
            value={eventId}
            onChange={(e) => {
              setEventId(e.target.value);
              sessionStorage.setItem(EVENT_KEY, e.target.value);
              setOutcome(null);
            }}
            aria-label="Pilih event"
          >
            {events.map((ev) => (
              <option key={ev.event_id} value={ev.event_id}>{ev.event_name}</option>
            ))}
          </select>
        ) : (
          <span className="scan-event-name">{events[0]?.event_name ?? "—"}</span>
        )}
      </header>

      <div className="scanner-stage scan-stage">
        <video ref={videoRef} className="scanner-video" playsInline muted aria-label="Pratinjau kamera" />
        <canvas ref={canvasRef} style={{ display: "none" }} />
        {camera === "on" ? (
          <div className="scanner-frame" aria-hidden="true" />
        ) : (
          <div className="scanner-idle">
            <p className="scanner-hint">
              {camera === "denied" ? "Izin kamera ditolak" : "Kamera belum aktif"}
            </p>
            <p className="scanner-sub">{cameraError ?? "Arahkan kamera ke QR e-ticket peserta."}</p>
            <button type="button" className="button button-primary" onClick={startCamera} disabled={camera === "starting"}>
              {camera === "starting" ? "Membuka kamera…" : "Nyalakan kamera"}
            </button>
          </div>
        )}
        {camera === "on" ? (
          <button type="button" className="button button-secondary button-small scanner-stop" onClick={stopCamera}>
            Hentikan
          </button>
        ) : null}
      </div>

      {outcome ? (
        <div className={`res res-${outcome.kind === "valid" ? "valid" : outcome.kind === "used" ? "used" : "invalid"} scan-result`} role="status" aria-live="assertive">
          <span className="res-icon" aria-hidden="true">{ICON[outcome.kind]}</span>
          <span>
            {outcome.kind === "valid" ? "Valid" : outcome.line}
            <small>
              {outcome.kind === "valid"
                ? `${outcome.name} · ${outcome.ticketId} · scan ${outcome.scan}${outcome.remaining ? ` · sisa ${outcome.remaining}` : " · QR habis"}`
                : outcome.detail}
            </small>
          </span>
        </div>
      ) : null}

      {log.length ? (
        <ul className="scan-log">
          {log.map((l, i) => (
            <li key={`${l.id}-${i}`}>
              <b>{l.name}</b>
              <span className="mono">{l.id}</span>
              <span className="scan-log-scan">{l.scan}</span>
              <span className="sub">{l.at}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        className="scan-exit"
        onClick={() => {
          sessionStorage.removeItem(CODE_KEY);
          stopCamera();
          setAuthed(false);
        }}
      >
        Keluar dari perangkat ini
      </button>
    </div>
  );
}
