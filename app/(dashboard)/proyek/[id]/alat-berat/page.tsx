"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Swal from 'sweetalert2';
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type AlatBeratMaster = {
  id_alat: string;
  kategori: "ALAT_BERAT" | "TRUK" | "PEMADATAN" | "CRANE";
  merek: string;
  model: string;
  tahun: number;
  status: "aktif" | "nonaktif";
};

type ProyekAlatBeratItem = {
  id: string;
  id_proyek: string;
  id_alat: string;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  tarif_sewa_internal: number;
  jam_operasi: number;
  alat_berat: AlatBeratMaster | null;
};

export default function AlatBeratPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<ProyekAlatBeratItem[]>([]);

  async function fetchData(): Promise<void> {
    const res = await fetch(
      `/api/proyek/alat-berat-konstruksi?id_proyek=${id}`,
    );
    if (!res.ok) return;

    const result: ProyekAlatBeratItem[] = await res.json();
    setData(result);
  }

  useEffect(() => {
    fetchData();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(itemId: string): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Alat Berat Proyek ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/proyek/alat-berat-konstruksi/${itemId}`, {
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
    <div className="max-w-7xl mx-auto">
      <Card title="Alat Berat Konstruksi Proyek">
        <div className="flex justify-between mb-4">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${id}`)}
          >
            Kembali
          </Button>

          <Button onClick={() => router.push(`/proyek/${id}/alat-berat/form`)}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah
          </Button>
        </div>

        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2">Alat</th>
              <th className="border px-3 py-2">Kategori</th>
              <th className="border px-3 py-2">Mulai</th>
              <th className="border px-3 py-2">Selesai</th>
              <th className="border px-3 py-2 text-right">Tarif</th>
              <th className="border px-3 py-2 text-right">Jam</th>
              <th className="border px-3 py-2">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-4">
                  Belum ada data
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.id}>
                  <td className="border px-3 py-2">
                    {item.alat_berat?.id_alat} - {item.alat_berat?.merek}{" "}
                    {item.alat_berat?.model}
                  </td>
                  <td className="border px-3 py-2">
                    {item.alat_berat?.kategori}
                  </td>
                  <td className="border px-3 py-2">{item.tanggal_mulai}</td>
                  <td className="border px-3 py-2">
                    {item.tanggal_selesai ?? "-"}
                  </td>
                  <td className="border px-3 py-2 text-right">
                    {item.tarif_sewa_internal.toLocaleString("id-ID")}
                  </td>
                  <td className="border px-3 py-2 text-right">
                    {item.jam_operasi}
                  </td>
                  <td className="border px-3 py-2">
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          router.push(
                            `/proyek/${id}/alat-berat/${item.id}/edit`,
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
      </Card>
    </div>
  );
}
