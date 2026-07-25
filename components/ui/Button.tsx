import type { ComponentProps } from "react";

interface ButtonProps extends ComponentProps<"button"> {
  variant?: "default" | "destructive" | "secondary";
}

export default function Button({
  variant = "default",
  className,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition";

  const styles = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
  };

  return (
    <button
      {...props}
      className={`${base} ${styles[variant]} ${className ?? ""}`}
    />
  );
}
