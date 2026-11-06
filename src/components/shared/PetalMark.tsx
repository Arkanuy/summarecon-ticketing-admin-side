const PETAL = "M0 0C-26-34-24-84 0-118 24-84 26-34 0 0Z";
const FAN_ANGLES = [-66, -44, -22, 0, 22, 44, 66];
const BUD_ANGLES = [-44, 0, 44];

type Variant = "mark" | "fan" | "bud";

/** Ilustrasi kelopak §7: satu kelopak ramping, disusun jadi kipas. */
export function Petal({ variant = "fan", stroke, filled = true, className = "", style }: {
  variant?: Variant;
  stroke?: string;
  filled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const angles = variant === "bud" ? BUD_ANGLES : variant === "mark" ? [0, 60, 120, 180, 240, 300] : FAN_ANGLES;
  return (
    <svg viewBox="-130 -135 260 145" className={className} style={style} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="petalGrad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#D93A2F" />
          <stop offset=".6" stopColor="#EE6A35" />
          <stop offset="1" stopColor="#F4A23B" />
        </linearGradient>
      </defs>
      <g>
        {angles.map((angle) =>
          filled ? (
            <path key={angle} d={PETAL} transform={`rotate(${angle})`} fill="url(#petalGrad)" opacity=".9" />
          ) : (
            <path key={angle} d={PETAL} transform={`rotate(${angle})`} fill="none" stroke={stroke ?? "url(#petalGrad)"} strokeWidth="2.5" strokeLinejoin="round" />
          ),
        )}
      </g>
    </svg>
  );
}

/** Penanda merek kecil untuk sidebar. */
export function PetalMark({ size = 26 }: { size?: number }) {
  return <Petal variant="mark" className="" style={{ width: size, height: size, flex: "0 0 auto" }} />;
}
