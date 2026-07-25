"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Item {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  minimum_stock: number;
}

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [data, setData] = useState<Item | null>(null);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch("/api/kebun-sawit/items");

      if (!res.ok) return;

      const list: Item[] = await res.json();

      const found = list.find((i) => i.id === id) ?? null;

      setData(found);
    }

    fetchData();
  }, [id]);

  if (!data) return <div>Memuat...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Detail Item">
        <div className="grid grid-cols-2 gap-4">
          <div>Nama</div>
          <div>{data.name}</div>

          <div>Kategori</div>
          <div>{data.category ?? "-"}</div>

          <div>Satuan</div>
          <div>{data.unit}</div>

          <div>Minimum Stock</div>
          <div>{data.minimum_stock}</div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/kebun-sawit/inventory/items")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() =>
              router.push(`/kebun-sawit/inventory/items/${data.id}/edit`)
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
