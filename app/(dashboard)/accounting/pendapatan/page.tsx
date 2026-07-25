"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Eye, Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

/* =========================
   TYPES
========================= */

interface Pendapatan {
  id: number;
  tanggal: string;
  nominal: number;
  ppn: number;
  pph23: number;
  total: number;
  keterangan: string;
  id_jurnal: number | null;
}

/* =========================
   PAGE
========================= */

export default function PendapatanPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<Pendapatan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  /* =========================
     FETCH
  ========================= */

  async function fetchData(): Promise<void> {
    setLoading(true);

    const res = await fetch("/api/pendapatan");

    if (!res.ok) {
      showToast("Gagal mengambil data pendapatan", "error");
      setLoading(false);
      return;
    }

    const result: Pendapatan[] = await res.json();

    setData(result);
    setLoading(false);
  }

  useEffect(() => {
    fetchData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     DELETE
  ========================= */

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Pendapatan ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/pendapatan/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      Swal.fire("Gagal", "Gagal menghapus", "error");
      return;
    }

    Swal.fire("Berhasil", "Data berhasil dihapus", "success");

    fetchData();
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <Card title="Pendapatan">
          <div className="flex justify-end mb-4">
            <Button onClick={() => router.push("/accounting/pendapatan/form")}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Pendapatan
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
                    <th className="border px-3 py-2">Tanggal</th>
                    <th className="border px-3 py-2 text-right">Nominal</th>
                    <th className="border px-3 py-2 text-right">PPN</th>
                    <th className="border px-3 py-2 text-right">PPh23</th>
                    <th className="border px-3 py-2 text-right">Total</th>
                    <th className="border px-3 py-2">Keterangan</th>
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
                        <td className="border px-3 py-2">{item.tanggal}</td>

                        <td className="border px-3 py-2 text-right">
                          {item.nominal.toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2 text-right">
                          {item.ppn.toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2 text-right text-red-600">
                          {item.pph23.toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2 text-right font-semibold">
                          {item.total.toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2">{item.keterangan}</td>

                        <td className="border px-3 py-2">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(`/accounting/pendapatan/${item.id}`)
                              }
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(
                                  `/accounting/pendapatan/${item.id}/edit`,
                                )
                              }
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="destructive"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
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
