import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "tint" | "outline" | "grad";
  size?: "md" | "sm" | "block";
};

const VARIANT = {
  primary: "btn-primary",
  tint: "btn-tint",
  outline: "btn-outline",
  grad: "btn-grad",
} as const;

export function Button({ className = "", variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={["btn", VARIANT[variant], size === "sm" ? "btn-sm" : "", size === "block" ? "btn-block" : "", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
