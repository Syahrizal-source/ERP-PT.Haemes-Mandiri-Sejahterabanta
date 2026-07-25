"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Block {
  id: string;
  division_id: string;
  code: string;
  planting_year: number;
  area_ha: number;
  palm_population: number;
  status: string;
  seed_type: string;
  is_active: boolean;
}

interface Division {
  id: string;
  name: string;
}

export default function BlockDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [block, setBlock] = useState<Block | null>(null);
  const [divisionName, setDivisionName] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const [blockRes, divisionRes] = await Promise.all([
        fetch("/api/kebun-sawit/blocks"),
        fetch("/api/kebun-sawit/divisions"),
      ]);

      if (!blockRes.ok || !divisionRes.ok) {
        showToast("Gagal mengambil data block", "error");
        setLoading(false);
        return;
      }

      const blocks: Block[] = await blockRes.json();
      const divisions: Division[] = await divisionRes.json();

      const found = blocks.find((b) => b.id === id);

      if (!found) {
        showToast("Block tidak ditemukan", "error");
        setLoading(false);
        return;
      }

      const division = divisions.find((d) => d.id === found.division_id);

      setBlock(found);
      setDivisionName(division ? division.name : "-");
      setLoading(false);
    }

    fetchData();
  }, [id, showToast]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  if (!block) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Detail Block">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold">Kode Block</p>
            <p>{block.code}</p>
          </div>

          <div>
            <p className="font-semibold">Division</p>
            <p>{divisionName}</p>
          </div>

          <div>
            <p className="font-semibold">Tahun Tanam</p>
            <p>{block.planting_year}</p>
          </div>

          <div>
            <p className="font-semibold">Luas Area (Ha)</p>
            <p>{block.area_ha.toLocaleString("id-ID")}</p>
          </div>

          <div>
            <p className="font-semibold">Populasi Sawit</p>
            <p>{block.palm_population.toLocaleString("id-ID")}</p>
          </div>

          <div>
            <p className="font-semibold">Jenis Bibit</p>
            <p>{block.seed_type}</p>
          </div>

          <div>
            <p className="font-semibold">Status</p>
            <p>{block.status}</p>
          </div>

          <div>
            <p className="font-semibold">Aktif</p>
            <p>{block.is_active ? "Ya" : "Tidak"}</p>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/kebun-sawit/blocks")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() => router.push(`/kebun-sawit/blocks/${block.id}/edit`)}
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </Card>
    </div>
  );
}
