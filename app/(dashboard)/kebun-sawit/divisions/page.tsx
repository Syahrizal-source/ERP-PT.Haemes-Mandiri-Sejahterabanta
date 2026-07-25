"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Eye, Pencil, Trash2 } from "lucide-react";
import Swal from 'sweetalert2';

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

export default function DivisionListPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<Division[]>([]);
  const [estates, setEstates] = useState<Estate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function fetchData(): Promise<void> {
    setLoading(true);

    const [divisionRes, estateRes] = await Promise.all([
      fetch("/api/kebun-sawit/divisions"),
      fetch("/api/kebun-sawit/estate"),
    ]);

    if (!divisionRes.ok || !estateRes.ok) {
      showToast("Gagal mengambil data division", "error");
      setLoading(false);
      return;
    }

    const divisionData: Division[] = await divisionRes.json();
    const estateData: Estate[] = await estateRes.json();

    setData(divisionData);
    setEstates(estateData);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getEstateName(id: string): string {
    const estate = estates.find((e) => e.id === id);
    return estate ? estate.name : "-";
  }

  async function handleDelete(id: string): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Divisions ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    setLoadingId(id);

    const res = await fetch(`/api/kebun-sawit/divisions/${id}`, {
      method: "DELETE",
    });

    setLoadingId(null);

    if (!res.ok) {
      const err = await res.json();
      Swal.fire("Gagal", err.error || "Gagal menghapus", "error");
      return;
    }

    Swal.fire("Berhasil", "Data berhasil dihapus", "success");

    fetchData();
  }

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <Card title="Master Division">
          <div className="flex justify-between mb-4">
            <Button
              variant="secondary"
              onClick={() => router.push("/kebun-sawit/estate")}
            >
              Kembali
            </Button>

            <Button onClick={() => router.push("/kebun-sawit/divisions/form")}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Division
            </Button>
          </div>

          {loading ? (
            <div className="flex gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Memuat data...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-3 py-2">Kode</th>
                    <th className="border px-3 py-2">Nama</th>
                    <th className="border px-3 py-2">Estate</th>
                    <th className="border px-3 py-2 text-right">Luas (Ha)</th>
                    <th className="border px-3 py-2 text-center">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4">
                        Tidak ada data
                      </td>
                    </tr>
                  ) : (
                    data.map((item) => (
                      <tr key={item.id}>
                        <td className="border px-3 py-2">{item.code}</td>
                        <td className="border px-3 py-2">{item.name}</td>
                        <td className="border px-3 py-2">
                          {getEstateName(item.estate_id)}
                        </td>
                        <td className="border px-3 py-2 text-right">
                          {item.area_ha.toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(`/kebun-sawit/divisions/${item.id}`)
                              }
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(
                                  `/kebun-sawit/divisions/${item.id}/edit`,
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
