"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type PenerimaanItem = {
  id: string;
  tanggal: string;
  jumlah: number;
  metode: string | null;
  bank: string | null;
};

export default function PenerimaanListPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<PenerimaanItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchData(): Promise<void> {
    setLoading(true);

    const res = await fetch(`/api/proyek/penerimaan?id_proyek=${id}`);

    if (!res.ok) {
      showToast("Gagal mengambil data penerimaan", "error");
      setLoading(false);
      return;
    }

    const result: PenerimaanItem[] = await res.json();
    setData(result);
    setLoading(false);
  }

  async function handleDelete(penerimaanId: string): Promise<void> {
    setDeletingId(penerimaanId);

    const res = await fetch(`/api/proyek/penerimaan/${penerimaanId}`, {
      method: "DELETE",
    });

    setDeletingId(null);

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error ?? "Gagal menghapus penerimaan", "error");
      return;
    }

    showToast("Penerimaan & jurnal berhasil dihapus", "success");
    fetchData();
  }

  useEffect(() => {
    if (id) fetchData();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="max-w-6xl mx-auto">
      <Card title="Penerimaan Proyek">
        <div className="flex justify-between mb-4">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${id}`)}
          >
            Kembali ke Proyek
          </Button>

          <Button onClick={() => router.push(`/proyek/${id}/penerimaan/form`)}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Penerimaan
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Memuat data...
          </div>
        ) : (
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2">Tanggal</th>
                <th className="border px-3 py-2 text-right">Jumlah</th>
                <th className="border px-3 py-2">Metode</th>
                <th className="border px-3 py-2">Bank</th>
                <th className="border px-3 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4">
                    Belum ada penerimaan
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id}>
                    <td className="border px-3 py-2">{item.tanggal}</td>
                    <td className="border px-3 py-2 text-right">
                      {item.jumlah.toLocaleString("id-ID")}
                    </td>
                    <td className="border px-3 py-2">{item.metode ?? "-"}</td>
                    <td className="border px-3 py-2">{item.bank ?? "-"}</td>
                    <td className="border px-3 py-2">
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            router.push(
                              `/proyek/${id}/penerimaan/${item.id}/edit`,
                            )
                          }
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="destructive"
                          disabled={deletingId === item.id}
                          onClick={() => handleDelete(item.id)}
                        >
                          {deletingId === item.id ? (
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
        )}
      </Card>
    </div>
  );
}
