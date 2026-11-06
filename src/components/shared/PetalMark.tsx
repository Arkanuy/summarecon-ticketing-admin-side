const PETAL = "M0 0C-26-34-24-84 0-118 24-84 26-34 0 0Z";
const FAN = [-66, -44, -22, 0, 22, 44, 66];

/** Ilustrasi kelopak §7 style guide: kipas kelopak tipis, dipakai sebagai aksen kartu. */
export function PetalFan({ className = "", stroke = "currentColor", width = 2.5 }: { className?: string; stroke?: string; width?: number }) {
  return (
    <svg viewBox="-130 -135 260 145" className={className} aria-hidden="true" focusable="false">
      {FAN.map((a) => (
        <path key={a} d={PETAL} transform={`rotate(${a})`} fill="none" stroke={stroke} strokeWidth={width} strokeLinejoin="round" />
      ))}
    </svg>
  );
}

export function PetalSolid({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="-130 -135 260 145" className={className} aria-hidden="true" focusable="false">
      {FAN.map((a) => (
        <path key={a} d={PETAL} transform={`rotate(${a})`} fill="currentColor" opacity=".55" />
      ))}
    </svg>
  );
}
