"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

type Venue = { id: string; name: string; templates: { id: string; name: string }[] };

/** Form tambah event (§9 no.3). Event baru selalu masuk sebagai draf. */
export function NewEventForm({ venues }: { venues: Venue[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      event_name: form.get("event_name"),
      venue_id: form.get("venue_id"),
      layout_template_id: form.get("layout_template_id") || undefined,
      description: form.get("description") || undefined,
      start_at: form.get("start_at"),
      end_at: form.get("end_at") || undefined,
      sales_start_at: form.get("sales_start_at") || undefined,
      sales_end_at: form.get("sales_end_at") || undefined,
      categories: [
        {
          name: form.get("category_name") || "Reguler",
          price: Number(form.get("category_price") ?? 0),
          quota: Number(form.get("category_quota") ?? 0),
        },
      ],
    };

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);

    if (!res.ok) {
      toast(body?.error?.message ?? "Gagal membuat event.", "bad");
      return;
    }
    toast(`Event "${payload.event_name}" dibuat sebagai draf.`, "ok");
    router.push(`/events/${body.data.event_id}`);
    router.refresh();
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="grid g2">
        <div className="field">
          <label htmlFor="event_name">Nama event</label>
          <input id="event_name" name="event_name" required placeholder="mis. Bandung Music Week" />
        </div>
        <div className="field">
          <label htmlFor="venue_id">Venue</label>
          <select id="venue_id" name="venue_id" required>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="start_at">Mulai acara</label>
          <input id="start_at" name="start_at" type="datetime-local" required />
        </div>
        <div className="field">
          <label htmlFor="end_at">Selesai acara</label>
          <input id="end_at" name="end_at" type="datetime-local" />
        </div>
        <div className="field">
          <label htmlFor="sales_start_at">Penjualan dibuka</label>
          <input id="sales_start_at" name="sales_start_at" type="datetime-local" />
        </div>
        <div className="field">
          <label htmlFor="sales_end_at">Penjualan ditutup</label>
          <input id="sales_end_at" name="sales_end_at" type="datetime-local" />
        </div>
        <div className="field">
          <label htmlFor="category_name">Kategori tiket pertama</label>
          <input id="category_name" name="category_name" defaultValue="Reguler" />
        </div>
        <div className="field">
          <label htmlFor="category_price">Harga (Rp)</label>
          <input id="category_price" name="category_price" type="number" min="0" defaultValue={150000} />
        </div>
        <div className="field">
          <label htmlFor="category_quota">Kuota</label>
          <input id="category_quota" name="category_quota" type="number" min="1" defaultValue={100} />
        </div>
      </div>

      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="description">Deskripsi</label>
        <textarea id="description" name="description" rows={3} placeholder="Ringkasan acara untuk peserta" />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button type="submit" className="button button-primary" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan sebagai draf"}
        </button>
        <button type="button" className="button button-secondary" onClick={() => router.back()}>
          Batal
        </button>
      </div>
      <p className="sub" style={{ marginTop: 10 }}>
        Event tersimpan sebagai <b>draf</b>. Publikasikan dari halaman Event setelah jadwal dan kuota benar.
      </p>
    </form>
  );
}
