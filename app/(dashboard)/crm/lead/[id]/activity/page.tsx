"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Card from "@/components/ui/Card";

/* =========================
   TYPE (SESUAI DATABASE)
========================= */
type Activity = {
  id: string;
  id_lead: string | null;
  tipe: string | null;
  catatan: string | null;
  tanggal: string | null;
  status: string;
};

/* ========================= */

export default function LeadActivityPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Activity[]>([]);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch("/api/crm/activity");

      if (!res.ok) return;

      const result: Activity[] = await res.json();

      const filtered = result.filter(
        (a: Activity) => a.id_lead === params.id,
      );

      setData(filtered);
    }

    fetchData();
  }, [params.id]);

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Timeline Activity Lead">
        <div className="space-y-4">
          {data.length === 0 ? (
            <div className="text-sm text-gray-500">
              Belum ada activity
            </div>
          ) : (
            data.map((item) => (
              <div key={item.id} className="border p-3 rounded">
                <div className="text-sm font-semibold">
                  {item.tipe ?? "-"}
                </div>

                <div className="text-sm">
                  {item.catatan ?? "-"}
                </div>

                <div className="text-xs text-gray-500">
                  {item.tanggal
                    ? new Date(item.tanggal).toLocaleDateString("id-ID")
                    : "-"}
                </div>

                <div className="text-xs">
                  Status: {item.status}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}