"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

type Section = { id: string; name: string; capacity: number };

/**
 * Tambah kategori tiket beserta section/area yang dicakupnya.
 * Satu event bisa punya banyak kategori (VIP, Reguler, dll) dan setiap kategori
 * boleh menunjuk section tertentu supaya warna di denah ikut berbeda.
 */
export function AddCategory({ eventId, sections }: { eventId: string; sections: Section[] }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);

    const res = await fetch(`/api/events/${eventId}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        price: Number(form.get("price") ?? 0),
        quota: Number(form.get("quota") ?? 0),
        section_ids: picked,
      }),
    });
    setBusy(false);

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      toast(body?.error?.message ?? "Gagal menambah kategori.", "bad");
      return;
    }
    toast(`Kategori "${body.data.name}" ditambahkan.`, "ok");
    setOpen(false);
    setPicked([]);
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="secondary" size="small" onClick={() => setOpen(true)}>
        + Kategori tiket
      </Button>
    );
  }

  return (
    <form className="card" onSubmit={submit} style={{ marginTop: 12 }}>
      <div className="grid g3">
        <div className="field">
          <label htmlFor="cat-name">Nama kategori</label>
          <input id="cat-name" name="name" required placeholder="mis. VIP / Reguler" />
        </div>
        <div className="field">
          <label htmlFor="cat-price">Harga (Rp)</label>
          <input id="cat-price" name="price" type="number" min="0" defaultValue={150000} />
        </div>
        <div className="field">
          <label htmlFor="cat-quota">Kuota</label>
          <input id="cat-quota" name="quota" type="number" min="0" defaultValue={50} />
        </div>
      </div>

      {sections.length ? (
        <div className="field" style={{ marginTop: 10 }}>
          <label>Section untuk kategori ini</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            {sections.map((s) => {
              const on = picked.includes(s.id);
              return (
                <button
                  type="button"
                  key={s.id}
                  className="chip"
                  aria-pressed={on}
                  onClick={() =>
                    setPicked((p) => (on ? p.filter((x) => x !== s.id) : [...p, s.id]))
                  }
                >
                  {s.name} · {s.capacity}
                </button>
              );
            })}
          </div>
          <p className="sub" style={{ marginTop: 6 }}>
            Kosongkan kalau kategori ini tidak terikat area tertentu.
          </p>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Button type="submit" variant="primary" size="small" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan kategori"}
        </Button>
        <Button type="button" variant="secondary" size="small" onClick={() => setOpen(false)}>
          Batal
        </Button>
      </div>
    </form>
  );
}
