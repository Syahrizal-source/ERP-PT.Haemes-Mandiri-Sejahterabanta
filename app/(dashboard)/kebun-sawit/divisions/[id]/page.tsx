"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Division {
  id: string;
  estate_id: string;
  code: string;
  name: string;
  area_ha: number;
  is_active: boolean;
}

interface Estate {
  id: string;
  name: string;
}

export default function DivisionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [division, setDivision] = useState<Division | null>(null);
  const [estateName, setEstateName] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const [divisionRes, estateRes] = await Promise.all([
        fetch("/api/kebun-sawit/divisions"),
        fetch("/api/kebun-sawit/estate"),
      ]);

      if (!divisionRes.ok || !estateRes.ok) {
        showToast("Gagal mengambil data division", "error");
        setLoading(false);
        return;
      }

      const divisions: Division[] = await divisionRes.json();
      const estates: Estate[] = await estateRes.json();

      const found = divisions.find((d) => d.id === id);

      if (!found) {
        showToast("Division tidak ditemukan", "error");
        setLoading(false);
        return;
      }

      const estate = estates.find((e) => e.id === found.estate_id);

      setDivision(found);
      setEstateName(estate ? estate.name : "-");
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

  if (!division) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Detail Division">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold">Kode Division</p>
            <p>{division.code}</p>
          </div>

          <div>
            <p className="font-semibold">Nama Division</p>
            <p>{division.name}</p>
          </div>

          <div>
            <p className="font-semibold">Estate</p>
            <p>{estateName}</p>
          </div>

          <div>
            <p className="font-semibold">Luas Area (Ha)</p>
            <p>{division.area_ha.toLocaleString("id-ID")}</p>
          </div>

          <div>
            <p className="font-semibold">Status</p>
            <p>{division.is_active ? "Aktif" : "Tidak Aktif"}</p>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/kebun-sawit/divisions")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() =>
              router.push(`/kebun-sawit/divisions/${division.id}/edit`)
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
