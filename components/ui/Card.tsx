import React from "react";

interface CardProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export default function Card({
  title,
  children,
  action,
  className,
}: CardProps) {
  return (
    <div className={`bg-white shadow rounded-lg p-6 ${className ?? ""}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>

        {action && <div>{action}</div>}
      </div>

      {children}
    </div>
  );
}
