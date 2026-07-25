"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Eye, Pencil, Trash2 } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
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

export default function BlockListPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<Block[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function fetchData(): Promise<void> {
    setLoading(true);

    const [blockRes, divisionRes] = await Promise.all([
      fetch("/api/kebun-sawit/blocks"),
      fetch("/api/kebun-sawit/divisions"),
    ]);

    if (!blockRes.ok || !divisionRes.ok) {
      showToast("Gagal mengambil data block", "error");
      setLoading(false);
      return;
    }

    const blockData: Block[] = await blockRes.json();
    const divisionData: Division[] = await divisionRes.json();

    setData(blockData);
    setDivisions(divisionData);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getDivisionName(id: string): string {
    const division = divisions.find((d) => d.id === id);
    return division ? division.name : "-";
  }

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/kebun-sawit/blocks/${id}`, {
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
        <Card title="Master Block">
          <div className="flex justify-between mb-4">
            <Button
              variant="secondary"
              onClick={() => router.push("/kebun-sawit/divisions")}
            >
              Kembali
            </Button>

            <Button onClick={() => router.push("/kebun-sawit/blocks/form")}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Block
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
                    <th className="border px-3 py-2">Division</th>
                    <th className="border px-3 py-2">Tahun Tanam</th>
                    <th className="border px-3 py-2 text-right">Luas</th>
                    <th className="border px-3 py-2 text-right">Populasi</th>
                    <th className="border px-3 py-2">Status</th>
                    <th className="border px-3 py-2 text-center">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4">
                        Tidak ada data
                      </td>
                    </tr>
                  ) : (
                    data.map((item) => (
                      <tr key={item.id}>
                        <td className="border px-3 py-2">{item.code}</td>
                        <td className="border px-3 py-2">
                          {getDivisionName(item.division_id)}
                        </td>
                        <td className="border px-3 py-2">
                          {item.planting_year}
                        </td>
                        <td className="border px-3 py-2 text-right">
                          {item.area_ha.toLocaleString("id-ID")}
                        </td>
                        <td className="border px-3 py-2 text-right">
                          {item.palm_population.toLocaleString("id-ID")}
                        </td>
                        <td className="border px-3 py-2">{item.status}</td>

                        <td className="border px-3 py-2">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(`/kebun-sawit/blocks/${item.id}`)
                              }
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(
                                  `/kebun-sawit/blocks/${item.id}/edit`,
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
