"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Eye, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface InvoiceItem {
  id: number;
  tanggal: string;
  no_invoice: string;
  customer: string;
  nominal: number;
  status:
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";
}

export default function InvoicePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  async function fetchData(): Promise<void> {
    setLoading(true);

    const res = await fetch("/api/invoice");
    if (!res.ok) {
      showToast("Gagal mengambil data invoice", "error");
      setLoading(false);
      return;
    }

    const result: InvoiceItem[] = await res.json();
    setData(result);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Invoice ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/invoice/${id}`, {
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
        <Card title="Invoice">
          <div className="flex justify-between mb-4">
            <div />

            <Button onClick={() => router.push("/accounting/invoice/form")}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Invoice
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Memuat data...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border">Tanggal</th>
                    <th className="p-2 border">No Invoice</th>
                    <th className="p-2 border">Customer</th>
                    <th className="p-2 border text-right">Nominal</th>
                    <th className="p-2 border">Status</th>
                    <th className="p-2 border">Aksi</th>
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
                        <td className="p-2 border">{item.tanggal}</td>
                        <td className="p-2 border">{item.no_invoice}</td>
                        <td className="p-2 border">{item.customer}</td>
                        <td className="p-2 border text-right">
                          {item.nominal.toLocaleString("id-ID")}
                        </td>
                        <td className="p-2 border">{item.status}</td>
                        <td className="p-2 border">
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(`/accounting/invoice/${item.id}`)
                              }
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(
                                  `/accounting/invoice/${item.id}/edit`,
                                )
                              }
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
