"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

/* =========================
   TYPES
========================= */

interface Pegawai {
  id: number;
  nik: string;
  nama: string;
  divisi: string;
  jabatan: string;
  gaji_pokok: number;
  tunjangan: number;
  status: string;
}

/* =========================
   PAGE
========================= */

export default function PegawaiPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function fetchData(): Promise<void> {
    setLoading(true);

    const res = await fetch("/api/pegawai");

    if (!res.ok) {
      showToast("Gagal mengambil data pegawai", "error");
      setLoading(false);
      return;
    }

    const result: Pegawai[] = await res.json();

    setData(result);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Pegawai ini?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/pegawai/${id}`, {
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
        <Card title="Master Pegawai">
          <div className="flex justify-end mb-4">
            <Button onClick={() => router.push("/accounting/pegawai/form")}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Pegawai
            </Button>
          </div>

          {loading ? (
            <div className="flex gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Memuat...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2 py-2">NIK</th>
                    <th className="border px-2 py-2">Nama</th>
                    <th className="border px-2 py-2">Divisi</th>
                    <th className="border px-2 py-2">Jabatan</th>
                    <th className="border px-2 py-2 text-right">Gaji</th>
                    <th className="border px-2 py-2 text-right">Tunjangan</th>
                    <th className="border px-2 py-2">Status</th>
                    <th className="border px-2 py-2 text-center">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-4">
                        Tidak ada data
                      </td>
                    </tr>
                  ) : (
                    data.map((item) => (
                      <tr key={item.id}>
                        <td className="border px-2 py-2">{item.nik}</td>
                        <td className="border px-2 py-2">{item.nama}</td>
                        <td className="border px-2 py-2">{item.divisi}</td>
                        <td className="border px-2 py-2">{item.jabatan}</td>
                        <td className="border px-2 py-2 text-right">
                          {item.gaji_pokok.toLocaleString("id-ID")}
                        </td>
                        <td className="border px-2 py-2 text-right">
                          {item.tunjangan.toLocaleString("id-ID")}
                        </td>
                        <td className="border px-2 py-2">{item.status}</td>

                        <td className="border px-2 py-2">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(
                                  `/accounting/pegawai/${item.id}/edit`,
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
