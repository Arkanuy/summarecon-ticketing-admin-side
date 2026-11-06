"use client";

import { useState } from "react";

export function PublishToggle({ published, label }: { published: boolean; label: string }) {
  const [on, setOn] = useState(published);
  return (
    <input
      type="checkbox"
      className="tgl"
      checked={on}
      aria-label={`Publikasikan ${label}`}
      onChange={(event) => setOn(event.target.checked)}
    />
  );
}
