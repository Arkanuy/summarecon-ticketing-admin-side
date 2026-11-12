"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

/**
 * Filter daftar event: status + rentang tanggal mulai.
 * State di URL (?status=&from=&to=) supaya bisa dibagikan dan tahan reload.
 */
export function EventFilter({
  status,
  from,
  to,
  statusOptions,
  basePath = "/events",
}: {
  status: string;
  from: string;
  to: string;
  statusOptions: { value: string; label: string; count: number }[];
  basePath?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [start, setStart] = useState(from);
  const [end, setEnd] = useState(to);

  const push = (next: Record<string, string>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString();
    router.push(s ? `${basePath}?${s}` : basePath);
  };

  const active = Boolean(status || from || to);

  return (
    <div className="filter-bar">
      <div className="chips">
        <Link href="#" className="chip" aria-pressed={!status} onClick={(e) => { e.preventDefault(); push({ status: "" }); }}>
          Semua status
        </Link>
        {statusOptions.map((s) => (
          <Link
            key={s.value}
            href="#"
            className="chip"
            aria-pressed={status === s.value}
            onClick={(e) => { e.preventDefault(); push({ status: status === s.value ? "" : s.value }); }}
          >
            {s.label} {s.count}
          </Link>
        ))}
      </div>

      <div className="filter-dates">
        <div className="field">
          <label htmlFor="from">Mulai dari</label>
          <input id="from" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="to">Sampai</label>
          <input id="to" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <Button size="small" onClick={() => push({ from: start, to: end })}>Terapkan</Button>
        {active ? (
          <Button variant="secondary" size="small" onClick={() => { setStart(""); setEnd(""); push({ status: "", from: "", to: "" }); }}>
            Reset
          </Button>
        ) : null}
      </div>
    </div>
  );
}
