"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";

type KasbonPribadiRow = {
  id: string;
  tanggal: string;
  deskripsi: string;
  no_voucher: string;
  debit: number;
  kredit: number;
  saldo: number;
};

export default function KasbonPribadiPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<KasbonPribadiRow[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function fetchData(): Promise<void> {
    const res = await fetch("/api/kasbon-pribadi");

    if (!res.ok) {
      showToast("Gagal mengambil data kasbon pribadi", "error");
      return;
    }

    const result: KasbonPribadiRow[] = await res.json();
    setData(result);
  }

  useEffect(() => {
    fetchData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: number): Promise<void> {
    if (!id) {
      console.error("ID tidak valid");
      return;
    }

    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Kasbon Pribadi ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/kasbon-pribadi/${id}`, {
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
      <Card
        title="Kasbon Pribadi"
        action={
          <Button
            onClick={() => router.push("/accounting/kasbon-pribadi/form")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambahkan
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Tanggal</th>
                <th className="p-2 border">No Voucher</th>
                <th className="p-2 border">Debit</th>
                <th className="p-2 border">Kredit</th>
                <th className="p-2 border">Saldo</th>
                <th className="p-2 border text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    Belum ada data kasbon pribadi
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id}>
                    <td className="p-2 border">{row.tanggal}</td>
                    <td className="p-2 border">{row.no_voucher}</td>
                    <td className="p-2 border text-right">
                      {row.debit.toLocaleString()}
                    </td>
                    <td className="p-2 border text-right">
                      {row.kredit.toLocaleString()}
                    </td>
                    <td className="p-2 border text-right">
                      {row.saldo.toLocaleString()}
                    </td>
                    <td className="p-2 border flex justify-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          router.push(`/accounting/kasbon-pribadi/${row.id}`)
                        }
                      >
                        Detail
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={() =>
                          router.push(
                            `/accounting/kasbon-pribadi/${row.id}/edit`,
                          )
                        }
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="destructive"
                        onClick={() => handleDelete(row.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
