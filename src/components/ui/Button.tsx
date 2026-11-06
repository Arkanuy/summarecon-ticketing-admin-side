import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "soft";
  size?: "md" | "small" | "block";
};

const VARIANT = { primary: "button-primary", secondary: "button-secondary", soft: "button-soft" } as const;

export function Button({ className = "", variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={["button", VARIANT[variant], size === "small" ? "button-small" : "", size === "block" ? "button-block" : "", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
