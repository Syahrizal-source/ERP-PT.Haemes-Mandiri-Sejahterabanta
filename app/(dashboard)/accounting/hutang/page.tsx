"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface HutangRow {
  id_hutang: number;
  supplier: string;
  no_invoice: string;
  tanggal: string;
  jatuh_tempo: string;
  nilai: number;
  status: string;
}

export default function HutangPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<HutangRow[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function fetchData(): Promise<void> {
    const res = await fetch("/api/hutang");

    if (!res.ok) {
      showToast("Gagal mengambil data hutang", "error");
      return;
    }

    const result: HutangRow[] = await res.json();
    setData(result);
  }

  useEffect(() => {
    async function loadData(): Promise<void> {
      await fetchData();
    }
    void loadData();
  }, []);

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Hutang ini?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/hutang/${id}`, {
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
        title="Hutang"
        action={
          <Button onClick={() => router.push("/accounting/hutang/form")}>
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
                <th className="p-2 border">Supplier</th>
                <th className="p-2 border">No Invoice</th>
                <th className="p-2 border">Nilai</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border text-center">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-4 text-gray-500">
                    Belum ada data hutang
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id_hutang}>
                    <td className="p-2 border">{item.tanggal}</td>
                    <td className="p-2 border">{item.supplier}</td>
                    <td className="p-2 border">{item.no_invoice}</td>
                    <td className="p-2 border">
                      {item.nilai.toLocaleString()}
                    </td>
                    <td className="p-2 border">{item.status}</td>
                    <td className="p-2 border flex justify-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          router.push(`/accounting/hutang/${item.id_hutang}`)
                        }
                      >
                        Detail
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={() =>
                          router.push(
                            `/accounting/hutang/${item.id_hutang}/edit`,
                          )
                        }
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="destructive"
                        onClick={() => handleDelete(item.id_hutang)}
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
