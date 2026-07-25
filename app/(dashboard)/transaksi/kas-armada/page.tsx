"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface KasArmadaRow {
  id: number;
  tanggal: string;
  sopir: string;
  penerimaan: number;
  pengembalian: number;
  pengeluaran: number;
  kasbon: number;
}

export default function KasArmadaPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<KasArmadaRow[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  async function fetchData(): Promise<void> {
    const res = await fetch("/api/kas-armada", {
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      showToast("Gagal mengambil data", "error");
      return;
    }

    const result: KasArmadaRow[] = await res.json();
    setData(result);
  }

  useEffect(() => {
    fetchData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Kas Armada ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/kas-armada/${id}`, {
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
      <Card title="Transaksi Kas Armada">
        <div className="overflow-x-auto">
          <div className="flex justify-between mb-4">
            <Button onClick={() => router.push("/transaksi/kas-armada/form")}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Kas Armada
            </Button>
          </div>

          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Tanggal</th>
                <th className="p-2 border">Sopir</th>
                <th className="p-2 border">Penerimaan</th>
                <th className="p-2 border">Pengembalian</th>
                <th className="p-2 border">Pengeluaran</th>
                <th className="p-2 border">Kasbon</th>
                <th className="p-2 border">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td className="p-2 border">{item.tanggal}</td>
                  <td className="p-2 border">{item.sopir}</td>
                  <td className="p-2 border">
                    {item.penerimaan.toLocaleString()}
                  </td>
                  <td className="p-2 border">
                    {item.pengeluaran.toLocaleString()}
                  </td>
                  <td className="p-2 border">
                    {item.pengembalian.toLocaleString()}
                  </td>
                  <td className="p-2 border">{item.kasbon.toLocaleString()}</td>
                  <td className="p-2 border flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        router.push(`/transaksi/kas-armada/form/${item.id}`)
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
