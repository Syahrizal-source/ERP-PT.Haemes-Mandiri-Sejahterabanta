"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Region {
  id: string;
  province_id: string;
  name: string;
}

export default function RegionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [region, setRegion] = useState<Region | null>(null);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch("/api/kebun-sawit/master");

      if (!res.ok) {
        showToast("Gagal mengambil data region", "error");
        setLoading(false);
        return;
      }

      const list: Region[] = await res.json();
      const found = list.find((r) => r.id === id);

      if (!found) {
        showToast("Region tidak ditemukan", "error");
        setLoading(false);
        return;
      }

      setRegion(found);
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

  if (!region) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Detail Region">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold">Nama Region</p>
            <p>{region.name}</p>
          </div>

          <div>
            <p className="font-semibold">Province ID</p>
            <p>{region.province_id}</p>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/kebun-sawit/master")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() => router.push(`/kebun-sawit/master/${region.id}/edit`)}
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </Card>
    </div>
  );
}
