"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Eye, Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";

interface Receipt {
  id: string;
  tanggal: string;
  vendor_id: number | null;
  total: number | null;
  grand_total: number | null;
}

export default function ReceiptListPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function fetchData(): Promise<void> {
    setLoading(true);

    const res = await fetch("/api/purchasing/receipts");

    if (!res.ok) {
      showToast("Gagal mengambil data receipt", "error");
      setLoading(false);
      return;
    }

    const result: Receipt[] = await res.json();

    setData(result);
    setLoading(false);
  }

  useEffect(() => {
    fetchData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Receipts ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/purchasing/receipts/${id}`, {
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
        <Card title="Goods Receipt">
          <div className="flex justify-end mb-4">
            <Button onClick={() => router.push("/purchasing/receipts/form")}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Receipt
            </Button>
          </div>

          {loading ? (
            <Loader2 className="animate-spin w-4 h-4" />
          ) : (
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-3 py-2">Tanggal</th>
                  <th className="border px-3 py-2 text-right">Total</th>
                  <th className="border px-3 py-2 text-right">Grand Total</th>
                  <th className="border px-3 py-2 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {data.map((item) => (
                  <tr key={item.id}>
                    <td className="border px-3 py-2">{item.tanggal}</td>

                    <td className="border px-3 py-2 text-right">
                      {Number(item.total ?? 0).toLocaleString("id-ID")}
                    </td>

                    <td className="border px-3 py-2 text-right">
                      {Number(item.grand_total ?? 0).toLocaleString("id-ID")}
                    </td>

                    <td className="border px-3 py-2">
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            router.push(`/purchasing/receipts/${item.id}`)
                          }
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="secondary"
                          onClick={() =>
                            router.push(`/purchasing/receipts/${item.id}/edit`)
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
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}
