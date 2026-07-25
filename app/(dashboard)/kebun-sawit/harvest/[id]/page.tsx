"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Harvest {
  id: string;
  block_id: string;
  harvest_date: string;
  total_bunches: number;
  total_weight_kg: number;
  total_loose_fruit_kg: number;
  notes: string | null;
}

interface Block {
  id: string;
  code: string;
}

export default function HarvestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id: string = params.id as string;

  const [data, setData] = useState<Harvest | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const resHarvest = await fetch("/api/kebun-sawit/harvest");
      const resBlock = await fetch("/api/kebun-sawit/blocks");

      if (!resHarvest.ok || !resBlock.ok) return;

      const harvest: Harvest[] = await resHarvest.json();
      const block: Block[] = await resBlock.json();

      const found = harvest.find((h) => h.id === id);

      setData(found ?? null);
      setBlocks(block);
    }

    fetchData();
  }, [id]);

  function getBlockName(blockId: string): string {
    const block = blocks.find((b) => b.id === blockId);
    return block ? block.code : "-";
  }

  if (!data) {
    return <div>Data tidak ditemukan</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Detail Harvest">
        <div className="space-y-3 text-sm">
          <div>
            <strong>Tanggal:</strong> {data.harvest_date}
          </div>

          <div>
            <strong>Block:</strong> {getBlockName(data.block_id)}
          </div>

          <div>
            <strong>Janjang:</strong>{" "}
            {data.total_bunches.toLocaleString("id-ID")}
          </div>

          <div>
            <strong>Total Berat:</strong>{" "}
            {Number(data.total_weight_kg).toLocaleString("id-ID")}
          </div>

          <div>
            <strong>Brondolan:</strong>{" "}
            {Number(data.total_loose_fruit_kg).toLocaleString("id-ID")}
          </div>

          <div>
            <strong>Catatan:</strong> {data.notes ?? "-"}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/kebun-sawit/harvest")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() => router.push(`/kebun-sawit/harvest/${data.id}/edit`)}
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </Card>
    </div>
  );
}
