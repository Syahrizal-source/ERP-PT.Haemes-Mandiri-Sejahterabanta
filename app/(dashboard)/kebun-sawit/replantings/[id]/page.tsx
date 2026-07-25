"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Replanting {
  id: string;
  tanggal: string;
  pokok_ditebang: number;
  pokok_ditanam: number;
  biaya_total: number;
  keterangan: string | null;
}

export default function ReplantingDetailPage() {
  const router = useRouter();
  const params = useParams();

  const id = params.id as string;

  const [data, setData] = useState<Replanting | null>(null);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch("/api/kebun-sawit/replantings");

      if (!res.ok) return;

      const list: Replanting[] = await res.json();

      const found = list.find((r) => r.id === id) ?? null;

      setData(found);
    }

    fetchData();
  }, [id]);

  if (!data) return <div>Memuat...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Detail Replanting">
        <div className="grid grid-cols-2 gap-4">
          <div>Tanggal</div>
          <div>{data.tanggal}</div>

          <div>Pokok Ditebang</div>
          <div>{data.pokok_ditebang}</div>

          <div>Pokok Ditanam</div>
          <div>{data.pokok_ditanam}</div>

          <div>Biaya</div>
          <div>{data.biaya_total.toLocaleString("id-ID")}</div>

          <div>Keterangan</div>
          <div>{data.keterangan}</div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/kebun-sawit/replantings")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() =>
              router.push(`/kebun-sawit/replantings/${data.id}/edit`)
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