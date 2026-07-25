"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Estate {
  id: string;
  region_id: string;
  code: string;
  name: string;
  total_area_ha: number;
  manager_name: string | null;
  is_active: boolean;
}

interface Region {
  id: string;
  name: string;
}

export default function EstateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [estate, setEstate] = useState<Estate | null>(null);
  const [regionName, setRegionName] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const [estateRes, regionRes] = await Promise.all([
        fetch("/api/kebun-sawit/estate"),
        fetch("/api/kebun-sawit/master"),
      ]);

      if (!estateRes.ok || !regionRes.ok) {
        showToast("Gagal mengambil data estate", "error");
        setLoading(false);
        return;
      }

      const estates: Estate[] = await estateRes.json();
      const regions: Region[] = await regionRes.json();

      const found = estates.find((e) => e.id === id);

      if (!found) {
        showToast("Estate tidak ditemukan", "error");
        setLoading(false);
        return;
      }

      const region = regions.find((r) => r.id === found.region_id);

      setEstate(found);
      setRegionName(region ? region.name : "-");
      setLoading(false);
    }

    fetchData();
  }, [id, showToast]);

  if (loading) {
    return (
      <div className="flex gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  if (!estate) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Detail Estate">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold">Kode</p>
            <p>{estate.code}</p>
          </div>

          <div>
            <p className="font-semibold">Nama Estate</p>
            <p>{estate.name}</p>
          </div>

          <div>
            <p className="font-semibold">Region</p>
            <p>{regionName}</p>
          </div>

          <div>
            <p className="font-semibold">Luas (Ha)</p>
            <p>{estate.total_area_ha.toLocaleString("id-ID")}</p>
          </div>

          <div>
            <p className="font-semibold">Manager</p>
            <p>{estate.manager_name ?? "-"}</p>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/kebun-sawit/estate")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() => router.push(`/kebun-sawit/estate/${estate.id}/edit`)}
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </Card>
    </div>
  );
}
