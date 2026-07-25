"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Eye, Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Pph23 {
  id: number;
  jenis_jasa: string;
  pph23_terutang: number;
  tanggal_transaksi: string;
}

export default function Pph23Page() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<Pph23[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  async function fetchData(): Promise<void> {
    const res = await fetch("/api/pph23");

    if (!res.ok) {
      showToast("Gagal mengambil data", "error");
      return;
    }

    const result: Pph23[] = await res.json();
    setData(result);
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Pph23 ini?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/pph23/${id}`, {
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
    <Card title="Data PPh23">
      <div className="flex justify-end mb-4">
        <Button onClick={() => router.push("/pajak/pph23/form")}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah
        </Button>
      </div>

      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Jenis Jasa</th>
            <th className="border p-2">Tanggal</th>
            <th className="border p-2 text-right">PPh23</th>
            <th className="border p-2">Aksi</th>
          </tr>
        </thead>

        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              <td className="border p-2">{item.jenis_jasa}</td>
              <td className="border p-2">{item.tanggal_transaksi}</td>
              <td className="border p-2 text-right">
                {item.pph23_terutang.toLocaleString("id-ID")}
              </td>
              <td className="p-2 border">
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => router.push(`/pajak/pph23/${item.id}`)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => router.push(`/pajak/pph23/${item.id}/edit`)}
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
