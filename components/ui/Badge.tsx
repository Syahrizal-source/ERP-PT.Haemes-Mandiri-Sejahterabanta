import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  variant?: "success" | "warning" | "danger" | "info";
}

export default function Badge({ children, variant = "info" }: Props) {
  const styles = {
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
    info: "bg-sky-100 text-sky-700",
  };

  return (
    <span
      className={`px-2 py-1 text-xs rounded-full font-medium ${styles[variant]}`}
    >
      {children}
    </span>
  );
}
