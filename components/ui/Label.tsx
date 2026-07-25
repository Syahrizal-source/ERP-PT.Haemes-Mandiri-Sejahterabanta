import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function Label({ children }: Props) {
  return (
    <label className="block text-sm font-medium mb-1 text-gray-700">
      {children}
    </label>
  );
}
