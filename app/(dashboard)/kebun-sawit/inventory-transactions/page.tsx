"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Eye, Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface InventoryTransaction {
  id: string;
  item_id: string;
  block_id: string | null;
  transaction_date: string;
  transaction_type: "IN" | "OUT" | "ADJUSTMENT";
  quantity: number;
  unit_price: number;
  subtotal: number;
  total_amount: number;
  notes: string | null;
}

export default function InventoryTransactionPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function fetchData(): Promise<void> {
    setLoading(true);

    const res = await fetch("/api/kebun-sawit/inventory-transactions");

    if (!res.ok) {
      showToast("Gagal mengambil data", "error");
      setLoading(false);
      return;
    }

    const result: InventoryTransaction[] = await res.json();
    setData(result);

    setLoading(false);
  }

  useEffect(() => {
    async function loadData(): Promise<void> {
      await fetchData();
    }

    void loadData();
  }, []);

  async function handleDelete(id: string): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus transaksi ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/kebun-sawit/inventory-transactions/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const err = await res.json();
      Swal.fire("Gagal", err.message || "Gagal menghapus", "error");
      return;
    }

    Swal.fire("Berhasil", "Data berhasil dihapus", "success");

    fetchData();
  }

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <Card title="Inventory Transactions">
          <div className="flex justify-between mb-4">
            <div />
            <Button
              onClick={() =>
                router.push("/kebun-sawit/inventory-transactions/form")
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Transaksi
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
                    <th className="border px-3 py-2">Tipe</th>
                    <th className="border px-3 py-2">Qty</th>
                    <th className="border px-3 py-2">Subtotal</th>
                    <th className="border px-3 py-2">Total</th>
                    <th className="border px-3 py-2 text-center">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4">
                        Tidak ada data
                      </td>
                    </tr>
                  ) : (
                    data.map((item) => (
                      <tr key={item.id}>
                        <td className="border px-3 py-2">
                          {item.transaction_date}
                        </td>

                        <td className="border px-3 py-2">
                          {item.transaction_type}
                        </td>

                        <td className="border px-3 py-2 text-right">
                          {item.quantity.toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2 text-right">
                          {item.subtotal.toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2 text-right">
                          {item.total_amount.toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(
                                  `/kebun-sawit/inventory-transactions/${item.id}`,
                                )
                              }
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(
                                  `/kebun-sawit/inventory-transactions/${item.id}/edit`,
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
