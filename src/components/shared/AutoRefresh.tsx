"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Muat ulang halaman admin secara berkala supaya order, kursi, dan check-in dari
 * sisi peserta langsung muncul tanpa admin menekan refresh.
 *
 * Memakai satu endpoint ringan (/api/admin/sync) untuk mendeteksi perubahan; halaman
 * baru di-reload penuh kalau memang ada data baru. Pendekatan ini dipakai karena
 * router.refresh() tidak me-render ulang halaman yang sudah di-prefetch.
 */
export function AutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const [paused, setPaused] = useState(false);
  const last = useRef<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    const onVisible = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisible);
    onVisible();
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {

    /* Jangan ganggu saat pengguna sedang mengetik / memilih filter. */
    const typing = () => {
      const el = document.activeElement;
      return Boolean(el && ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName));
    };

    const tick = async () => {
      if (busy.current || typing()) return;
      busy.current = true;
      try {
        const res = await fetch("/api/admin/sync", { cache: "no-store" });
        if (res.ok) {
          const body = await res.json();
          const stamp = String(body?.data?.stamp ?? "");
          /*
           * Pembanding = sidik jari yang DITANAM di halaman saat server merender
           * (<meta name="x-admin-sync">), bukan nilai tick pertama. Dengan begitu
           * perubahan yang terjadi sebelum tick pertama tetap terdeteksi.
           */
          const serverStamp =
            last.current ??
            document.querySelector("meta[name='x-admin-sync']")?.getAttribute("content") ??
            "";

          if (stamp && stamp !== serverStamp) {
            last.current = stamp;
            window.location.reload();
          } else {
            last.current = stamp;
          }
        }
      } catch {
        /* jaringan putus sesaat — coba lagi pada interval berikutnya */
      } finally {
        busy.current = false;
      }
    };

    void tick();
    /*
     * Saat tab tidak terlihat, browser menghentikan timer latar belakang, tetapi
     * admin tetap perlu data segar begitu kembali. Jadi interval tetap dipasang;
     * `paused` hanya memperpanjang jedanya.
     */
    const id = setInterval(tick, paused ? intervalMs * 3 : intervalMs);
    return () => clearInterval(id);
  }, [paused, intervalMs]);

  return null;
}
