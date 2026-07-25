import type { ComponentProps } from "react";

type TextareaProps = ComponentProps<"textarea">;

export default function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
        className ?? ""
      }`}
    />
  );
}
