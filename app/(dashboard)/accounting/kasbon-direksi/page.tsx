"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type KasbonDireksiRow = {
  id: string;
  tanggal: string;
  deskripsi: string;
  no_voucher: string;
  debit: number;
  kredit: number;
};

export default function KasbonDireksiPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<KasbonDireksiRow[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function fetchData(): Promise<void> {
    const res = await fetch("/api/kasbon-direksi");
    if (!res.ok) {
      showToast("Gagal mengambil data kasbon direksi", "error");
      return;
    }
    const result: KasbonDireksiRow[] = await res.json();
    setData(result);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  async function handleDelete(id: string): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Kasbon Direksi ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/kasbon-direksi/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      await Swal.fire("Gagal", "Gagal menghapus data", "error");
      return;
    }

    await Swal.fire("Berhasil", "Data berhasil dihapus", "success");

    fetchData();
  }

  return (
    <>
      <Card
        title="Kasbon Direksi"
        action={
          <Button
            onClick={() => router.push("/accounting/kasbon-direksi/form")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah
          </Button>
        }
      >
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Tanggal</th>
              <th className="border p-2">No Voucher</th>
              <th className="border p-2">Deskripsi</th>
              <th className="border p-2 text-right">Nilai</th>
              <th className="border p-2 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  Belum ada data
                </td>
              </tr>
            ) : (
              data.map((r) => (
                <tr key={r.id}>
                  <td className="border p-2">{r.tanggal}</td>
                  <td className="border p-2">{r.no_voucher}</td>
                  <td className="border p-2">{r.deskripsi}</td>
                  <td className="border p-2 text-right">
                    {r.debit.toLocaleString()}
                  </td>
                  <td className="border p-2 flex gap-2 justify-center">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        router.push(`/accounting/kasbon-direksi/${r.id}`)
                      }
                    >
                      Detail
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        router.push(`/accounting/kasbon-direksi/${r.id}/edit`)
                      }
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDelete(r.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
