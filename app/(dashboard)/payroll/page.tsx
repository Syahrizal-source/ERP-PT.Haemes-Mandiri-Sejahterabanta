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

interface Pegawai {
  nama: string;
  divisi: string;
}

interface Payroll {
  id: number;
  bulan: number;
  tahun: number;
  tanggal: string;
  total_gaji: number;
  total_tunjangan: number;
  total_potongan: number;
  pph21: number;
  bpjs: number;
  net_gaji: number;
  pegawai?: Pegawai | null;
}

/* =========================
   PAGE
========================= */

export default function PayrollPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  async function fetchData(): Promise<void> {
    setLoading(true);

    const res = await fetch("/api/payroll");

    if (!res.ok) {
      showToast("Gagal mengambil data payroll", "error");
      setLoading(false);
      return;
    }

    const result: Payroll[] = await res.json();
    setData(result);
    setLoading(false);
  }

  useEffect(() => {
    fetchData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Payroll ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/payroll/${id}`, {
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
        <Card title="Payroll">
          <div className="flex justify-end mb-4">
            <Button onClick={() => router.push("/payroll/form")}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Payroll
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
                    <th className="border px-3 py-2">Tanggal</th>
                    <th className="border px-3 py-2">Nama</th>
                    <th className="border px-3 py-2">Divisi</th>
                    <th className="border px-3 py-2">Gaji</th>
                    <th className="border px-3 py-2">Tunjangan</th>
                    <th className="border px-3 py-2">Potongan</th>
                    <th className="border px-3 py-2">PPH21</th>
                    <th className="border px-3 py-2">BPJS</th>
                    <th className="border px-3 py-2">Net</th>
                    <th className="border px-3 py-2 text-center">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-4">
                        Tidak ada data
                      </td>
                    </tr>
                  ) : (
                    data.map((item) => (
                      <tr key={item.id}>
                        <td className="border px-3 py-2">
                          {new Date(item.tanggal).toLocaleDateString("id-ID")}
                        </td>

                        <td className="border px-3 py-2">
                          {item.pegawai?.nama ?? "-"}
                        </td>

                        <td className="border px-3 py-2">
                          {item.pegawai?.divisi ?? "-"}
                        </td>

                        <td className="border px-3 py-2 text-right">
                          {item.total_gaji.toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2 text-right">
                          {item.total_tunjangan.toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2 text-right">
                          {item.total_potongan.toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2 text-right">
                          {item.pph21.toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2 text-right">
                          {item.bpjs.toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2 text-right font-semibold">
                          {item.net_gaji.toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="secondary"
                              onClick={() => router.push(`/payroll/${item.id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(`/payroll/${item.id}/edit`)
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
