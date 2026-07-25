"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface PembayaranRow {
  id: number;
  tanggal: string;
  id_invoice: number;
  nominal: number;
  keterangan: string;
}

export default function PembayaranInvoicePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<PembayaranRow[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function fetchData(): Promise<void> {
    const res = await fetch("/api/pembayaran-invoice");

    if (!res.ok) {
      showToast("Gagal mengambil data pembayaran", "error");
      return;
    }

    const result: PembayaranRow[] = await res.json();
    setData(result);
  }

  useEffect(() => {
    fetchData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Pembayaran Invoice ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/pembayaran-invoice/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal menghapus data",
      });
      return;
    }

    const result: { message: string } = await res.json();

    await Swal.fire({
      icon: "success",
      title: "Pembayaran Invoice Berhasil",
      text: result.message,
      confirmButtonText: "OK",
    });

    router.push("/accounting/pembayaran-invoice");
    router.refresh();
  }

  return (
    <>
      <Card
        title="Pembayaran Invoice"
        action={
          <Button
            onClick={() => router.push("/accounting/pembayaran-invoice/form")}
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
                <th className="p-2 border">Invoice ID</th>
                <th className="p-2 border">Nominal</th>
                <th className="p-2 border">Keterangan</th>
                <th className="p-2 border text-center">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-4 text-gray-500">
                    Belum ada data pembayaran
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id}>
                    <td className="p-2 border">{item.tanggal}</td>
                    <td className="p-2 border">{item.id_invoice}</td>
                    <td className="p-2 border">
                      {item.nominal.toLocaleString()}
                    </td>
                    <td className="p-2 border">{item.keterangan}</td>
                    <td className="p-2 border flex justify-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          router.push(
                            `/accounting/pembayaran-invoice/${item.id}/edit`,
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
