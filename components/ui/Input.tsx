import type { ComponentProps } from "react";

interface InputProps extends ComponentProps<"input"> {
  label?: string;
}

export default function Input({
  label,
  className,
  value,
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}

      <input
        {...props}
        value={value ?? ""} // 🔥 FIX UTAMA
        className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          className ?? ""
        }`}
      />
    </div>
  );
}
