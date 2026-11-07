"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/Toast";

type Tier = {
  id: string;
  label: string;
  price: number;
  starts_at: string;
  ends_at: string;
  is_promo: boolean;
  is_active: boolean;
};

const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");
const dt = (s: string) => s.slice(0, 16).replace("T", " ");

/** Atur harga bertingkat per kategori: normal, promo, early bird. */
export function PriceTiers({
  categoryId,
  categoryName,
  basePrice,
  initialTiers,
}: {
  categoryId: string;
  categoryName: string;
  basePrice: number;
  initialTiers: Tier[];
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [tiers, setTiers] = useState<Tier[]>(initialTiers);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ label: "", price: "", starts_at: "", ends_at: "", is_promo: false });

  const reload = async () => {
    const res = await fetch(`/api/ticket-categories/${categoryId}/prices`, { cache: "no-store" });
    const body = await res.json();
    if (res.ok) setTiers(body.data.tiers);
  };

  const save = async () => {
    setBusy(true);
    const res = await fetch(`/api/ticket-categories/${categoryId}/prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: form.label,
        price: Number(form.price),
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
        is_promo: form.is_promo,
      }),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);

    if (!res.ok) {
      toast(body?.error?.message ?? "Gagal menyimpan periode harga", "bad");
      return;
    }
    toast(`Periode "${form.label}" ditambahkan.`, "ok");
    setForm({ label: "", price: "", starts_at: "", ends_at: "", is_promo: false });
    setOpen(false);
    await reload();
  };

  const remove = async (tier: Tier) => {
    const agreed = await confirm({
      title: `Hapus periode "${tier.label}"?`,
      description: "Harga pada periode ini tidak akan dipakai lagi. Harga dasar kategori tetap berlaku.",
      confirmLabel: "Ya, hapus",
      tone: "danger",
    });
    if (!agreed) return;
    const res = await fetch(`/api/ticket-categories/${categoryId}/prices?tier_id=${tier.id}`, { method: "DELETE" });
    if (res.ok) {
      toast(`Periode "${tier.label}" dihapus.`, "ok");
      await reload();
    } else toast("Gagal menghapus periode", "bad");
  };

  const active = tiers.find((t) => t.is_active);

  return (
    <div>
      <div className="card-head" style={{ marginBottom: 8 }}>
        <div>
          <div className="t-name">{categoryName}</div>
          <div className="sub">
            Harga dasar {rp(basePrice)}
            {active ? ` · berlaku sekarang ${rp(active.price)} (${active.label})` : " · belum ada periode aktif"}
          </div>
        </div>
        <Button variant="secondary" size="small" onClick={() => setOpen((v) => !v)}>
          {open ? "Tutup" : "+ Periode harga"}
        </Button>
      </div>

      {open ? (
        <div className="tier-form">
          <div className="field"><label>Nama periode</label>
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="mis. Early Bird" />
          </div>
          <div className="field"><label>Harga (Rp)</label>
            <input type="number" min={1} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="150000" />
          </div>
          <div className="field"><label>Mulai</label>
            <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
          </div>
          <div className="field"><label>Selesai</label>
            <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
          </div>
          <label className="tier-check">
            <input type="checkbox" checked={form.is_promo} onChange={(e) => setForm({ ...form, is_promo: e.target.checked })} />
            Tandai sebagai promo
          </label>
          <Button
            size="small"
            disabled={busy || !form.label || !form.price || !form.starts_at || !form.ends_at}
            onClick={save}
          >
            {busy ? "Menyimpan…" : "Simpan periode"}
          </Button>
        </div>
      ) : null}

      {tiers.length ? (
        <table className="table" style={{ marginTop: 10 }}>
          <thead>
            <tr><th>Periode</th><th className="num">Harga</th><th>Mulai</th><th>Selesai</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {tiers.map((t) => (
              <tr key={t.id}>
                <td className="t-name">
                  {t.label} {t.is_promo ? <span className="badge badge-hold"><i className="dot" />Promo</span> : null}
                </td>
                <td className="num mono">{rp(t.price)}</td>
                <td className="mono">{dt(t.starts_at)}</td>
                <td className="mono">{dt(t.ends_at)}</td>
                <td>{t.is_active ? <span className="badge badge-ok"><i className="dot" />Berlaku</span> : <span className="muted">—</span>}</td>
                <td className="num">
                  <button type="button" className="button button-secondary button-small" onClick={() => remove(t)}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="sub" style={{ marginTop: 8 }}>Belum ada periode harga. Harga dasar yang dipakai.</p>
      )}
    </div>
  );
}
