"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type Deal = {
  id: string;
  nama_deal: string;
  nilai: number;
  tahap: string;
  probabilitas: number | null;
  closing_date: string | null;
};

export default function DetailDealPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [data, setData] = useState<Deal | null>(null);

  useEffect(() => {
    fetch(`/api/crm/deal/${params.id}`)
      .then((res) => res.json())
      .then((res) => setData(res));
  }, [params.id]);

  if (!data) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Detail Deal">
        <p>Nama: {data.nama_deal}</p>
        <p>Nilai: Rp {data.nilai.toLocaleString("id-ID")}</p>
        <p>Tahap: {data.tahap}</p>
        <p>Probabilitas: {data.probabilitas}</p>
        <p>Closing: {data.closing_date}</p>

        <div className="flex gap-3 mt-6">
          <Button onClick={() => router.push("/crm/deal")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() =>
              router.push(`/crm/deal/${params.id}/edit`)
            }
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </Card>
    </div>
  );
}