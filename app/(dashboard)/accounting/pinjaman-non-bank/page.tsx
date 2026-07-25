"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Eye, Trash2, Pencil } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

/* =========================
   TYPES
========================= */

interface Pinjaman {
  id: number;
  tanggal: string;
  pihak: string;
  nominal: number;
  bunga_persen: number;
  total_pinjaman: number;
  saldo: number;
}

/* =========================
   PAGE
========================= */

export default function Page() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<Pinjaman[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  async function fetchData(): Promise<void> {
    setLoading(true);

    const res = await fetch("/api/pinjaman-non-bank");

    if (!res.ok) {
      showToast("Gagal mengambil data", "error");
      setLoading(false);
      return;
    }

    const result: Pinjaman[] = await res.json();
    setData(result);
    setLoading(false);
  }

  useEffect(() => {
    fetchData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Pinjaman Non Bank ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/pinjaman-non-bank/${id}`, {
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
        <Card title="Pinjaman Non Bank">
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => router.push("/accounting/pinjaman-non-bank/form")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah
            </Button>
          </div>

          {loading ? (
            <Loader2 className="animate-spin w-5 h-5" />
          ) : (
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-2">Tanggal</th>
                  <th className="border px-2 py-2">Pihak</th>
                  <th className="border px-2 py-2 text-right">Total</th>
                  <th className="border px-2 py-2 text-right">Saldo</th>
                  <th className="border px-2 py-2 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {data.map((item) => (
                  <tr key={item.id}>
                    <td className="border px-2 py-2">{item.tanggal}</td>
                    <td className="border px-2 py-2">{item.pihak}</td>
                    <td className="border px-2 py-2 text-right">
                      {item.total_pinjaman.toLocaleString("id-ID")}
                    </td>
                    <td className="border px-2 py-2 text-right">
                      {item.saldo.toLocaleString("id-ID")}
                    </td>

                    <td className="border px-2 py-2 text-center">
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            router.push(`/accounting/pinjaman-non-bank/${item.id}`)
                          }
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="secondary"
                          onClick={() =>
                            router.push(
                              `/accounting/pinjaman-non-bank/${item.id}/edit`,
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
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}
