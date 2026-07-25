"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface PestControl {
  id: string;
  block_id: string;
  control_date: string;
  pest_type: string | null;
  severity_level: string | null;
  action_taken: string | null;
  chemical_used: string | null;
  cost: number;
  notes: string | null;
}

interface Block {
  id: string;
  code: string;
}

export default function PestControlDetailPage() {
  const router = useRouter();
  const params = useParams();

  const id = params.id as string;

  const [data, setData] = useState<PestControl | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const resPest = await fetch("/api/kebun-sawit/pest-controls");
      const resBlocks = await fetch("/api/kebun-sawit/blocks");

      if (!resPest.ok || !resBlocks.ok) return;

      const pestList: PestControl[] = await resPest.json();
      const blockList: Block[] = await resBlocks.json();

      const found = pestList.find((p) => p.id === id) ?? null;

      setData(found);
      setBlocks(blockList);
    }

    fetchData();
  }, [id]);

  function getBlockName(blockId: string): string {
    const block = blocks.find((b) => b.id === blockId);
    return block ? block.code : "-";
  }

  if (!data) return <div>Memuat...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Detail Pest Control">
        <div className="grid grid-cols-2 gap-4">
          <div>Tanggal</div>
          <div>{data.control_date}</div>

          <div>Block</div>
          <div>{getBlockName(data.block_id)}</div>

          <div>Jenis Hama</div>
          <div>{data.pest_type}</div>

          <div>Severity</div>
          <div>{data.severity_level}</div>

          <div>Action</div>
          <div>{data.action_taken}</div>

          <div>Chemical</div>
          <div>{data.chemical_used}</div>

          <div>Biaya</div>
          <div>{Number(data.cost).toLocaleString("id-ID")}</div>

          <div>Catatan</div>
          <div>{data.notes}</div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/kebun-sawit/pest-controls")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() =>
              router.push(`/kebun-sawit/pest-controls/${data.id}/edit`)
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
