"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Eye, Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Pph25 {
  id: number;
  tahun: number;
  bulan: number;
  nilai_angsuran: number;
  tanggal_transaksi: string;
}

export default function Pph21Page() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<Pph25[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [tahun, setTahun] = useState<number>(new Date().getFullYear());

  async function fetchData(): Promise<void> {
    const res = await fetch("/api/pph25");

    if (!res.ok) {
      showToast("Gagal mengambil data", "error");
      return;
    }

    const result: Pph25[] = await res.json();
    setData(result);
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Pph25 ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/pph25/${id}`, {
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
    <Card title="Data PPh25">
      <div className="flex justify-end mb-4">
        <Button onClick={() => router.push("/pajak/pph25/form")}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah
        </Button>
      </div>

      <table className="w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Periode</th>
            <th className="border p-2 text-right">Nilai</th>
            <th className="border p-2">Tanggal</th>
            <th className="border p-2">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              <td className="border p-2">
                {item.bulan}/{item.tahun}
              </td>
              <td className="border p-2 text-right">
                {item.nilai_angsuran.toLocaleString("id-ID")}
              </td>
              <td className="border p-2">{item.tanggal_transaksi}</td>
              <td className="p-2 border">
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => router.push(`/pajak/pph25/${item.id}`)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => router.push(`/pajak/pph25/${item.id}/edit`)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(item.id)}
                    disabled={loadingId === item.id}
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
          ))}
        </tbody>
      </table>
    </Card>
  );
}
