import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & { flush?: boolean };

export function Card({ className = "", flush, ...props }: CardProps) {
  return <div className={["card", flush ? "card-flush" : "", className].filter(Boolean).join(" ")} {...props} />;
}
