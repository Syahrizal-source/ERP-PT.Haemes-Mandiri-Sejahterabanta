"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Eye, Pencil, Trash2 } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";

interface Estate {
  id: string;
  region_id: string;
  code: string;
  name: string;
  total_area_ha: number;
  manager_name: string | null;
  is_active: boolean;
  created_at: string;
}

interface Region {
  id: string;
  name: string;
  province_id: string;
}

export default function EstateListPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<Estate[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function fetchData(): Promise<void> {
    setLoading(true);

    const [estateRes, regionRes] = await Promise.all([
      fetch("/api/kebun-sawit/estate"),
      fetch("/api/kebun-sawit/master"),
    ]);

    if (!estateRes.ok || !regionRes.ok) {
      showToast("Gagal mengambil data estate", "error");
      setLoading(false);
      return;
    }

    const estateData: Estate[] = await estateRes.json();
    const regionData: Region[] = await regionRes.json();

    setData(estateData);
    setRegions(regionData);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getRegionName(regionId: string): string {
    const region = regions.find((r) => r.id === regionId);
    return region ? region.name : "-";
  }

  async function handleDelete(id: string): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Estate ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/kebun-sawit/estate/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      Swal.fire("Gagal", "Gagal menghapus", "error");
      return;
    }

    Swal.fire("Berhasil", "Data berhasil dihapus", "success");

    fetchData();
  }

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <Card title="Master Estate">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="secondary"
              onClick={() => router.push("/kebun-sawit/master")}
            >
              Kembali
            </Button>

            <Button onClick={() => router.push("/kebun-sawit/estate/form")}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Estate
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Memuat data...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-3 py-2">Kode</th>
                    <th className="border px-3 py-2">Nama Estate</th>
                    <th className="border px-3 py-2">Region</th>
                    <th className="border px-3 py-2 text-right">Luas (Ha)</th>
                    <th className="border px-3 py-2">Manager</th>
                    <th className="border px-3 py-2 text-center">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4">
                        Tidak ada data
                      </td>
                    </tr>
                  ) : (
                    data.map((item) => (
                      <tr key={item.id}>
                        <td className="border px-3 py-2">{item.code}</td>

                        <td className="border px-3 py-2">{item.name}</td>

                        <td className="border px-3 py-2">
                          {getRegionName(item.region_id)}
                        </td>

                        <td className="border px-3 py-2 text-right">
                          {item.total_area_ha.toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2">
                          {item.manager_name ?? "-"}
                        </td>

                        <td className="border px-3 py-2">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(`/kebun-sawit/estate/${item.id}`)
                              }
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(
                                  `/kebun-sawit/estate/${item.id}/edit`,
                                )
                              }
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="destructive"
                              disabled={loadingId === item.id}
                              onClick={() => handleDelete(item.id)}
                            >
                              {loadingId === item.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
