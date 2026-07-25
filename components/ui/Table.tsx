import type { ComponentProps, ReactNode } from "react";

type TableProps = ComponentProps<"table">;

export function Table({ className, ...props }: TableProps) {
  return (
    <table
      {...props}
      className={`w-full border-collapse text-sm ${className ?? ""}`}
    />
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="bg-gray-100 border-b">{children}</thead>;
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ children }: { children: ReactNode }) {
  return <tr className="border-b hover:bg-gray-50">{children}</tr>;
}

export function TableCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-2 ${className ?? ""}`}>{children}</td>;
}

export function TableHeaderCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-3 py-2 text-left font-semibold text-gray-700 ${className ?? ""}`}
    >
      {children}
    </th>
  );
}
