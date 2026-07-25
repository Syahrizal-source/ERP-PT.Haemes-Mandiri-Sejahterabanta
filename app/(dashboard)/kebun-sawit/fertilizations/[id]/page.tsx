"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Fertilization {
  id: string;
  fertilization_date: string;
  vendor_name: string | null;
  total_used: number | null;
  labor_cost: number;
  notes: string | null;
}

export default function FertilizationDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [data, setData] = useState<Fertilization | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      const res = await fetch(`/api/kebun-sawit/fertilizations/${params.id}`);

      const json: Fertilization = await res.json();
      setData(json);
    }

    load();
  }, [params.id]);

  if (!data) return <p>Memuat...</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <Card title="Detail Fertilization">
        <div className="space-y-2">
          <p>Tanggal: {data.fertilization_date}</p>
          <p>Vendor: {data.vendor_name ?? "-"}</p>
          <p>Total Used: {data.total_used ?? 0}</p>
          <p>Labor Cost: {data.labor_cost}</p>
          <p>Catatan: {data.notes ?? "-"}</p>

          <div className="pt-4">
            <Button onClick={() => router.back()}>Kembali</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
