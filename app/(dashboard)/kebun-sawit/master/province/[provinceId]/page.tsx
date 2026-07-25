"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Region {
  id: string;
  province_id: string;
  name: string;
  created_at: string;
}

export default function RegionByProvincePage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const provinceId = params.provinceId as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [regions, setRegions] = useState<Region[]>([]);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch("/api/kebun-sawit/master");

      if (!res.ok) {
        showToast("Gagal mengambil data region", "error");
        setLoading(false);
        return;
      }

      const list: Region[] = await res.json();

      const filtered = list.filter((r) => r.province_id === provinceId);

      setRegions(filtered);
      setLoading(false);
    }

    fetchData();
  }, [provinceId, showToast]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Card title="Region Berdasarkan Province">
        <div className="mb-4 text-sm">
          <strong>Province ID:</strong> {provinceId}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2">Nama Region</th>
                <th className="border px-3 py-2">Province ID</th>
              </tr>
            </thead>

            <tbody>
              {regions.length === 0 ? (
                <tr>
                  <td colSpan={2} className="text-center py-4">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                regions.map((r) => (
                  <tr key={r.id}>
                    <td className="border px-3 py-2">{r.name}</td>
                    <td className="border px-3 py-2">{r.province_id}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/kebun-sawit/master")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </div>
      </Card>
    </div>
  );
}
