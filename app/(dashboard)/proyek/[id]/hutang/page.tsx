"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";

type HutangItem = {
  id: string;
  supplier: string | null;
  tanggal: string | null;
  nilai: number;
  status: string | null;
};

export default function HutangPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<HutangItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function fetchData(): Promise<void> {
    setLoading(true);
    const res = await fetch(`/api/proyek/hutang?id_proyek=${id}`);
    const result: HutangItem[] = await res.json();
    setData(result);
    setLoading(false);
  }

  async function handleDelete(): Promise<void> {
    if (!deleteId) return;

    await fetch(`/api/proyek/hutang/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    fetchData();
  }

  useEffect(() => {
    fetchData();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="max-w-6xl mx-auto">
      <Card title="Hutang Proyek">
        <div className="flex justify-between mb-4">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${id}`)}
          >
            Kembali ke Proyek
          </Button>

          <Button onClick={() => router.push(`/proyek/${id}/hutang/form`)}>
            Tambah Hutang
          </Button>
        </div>

        {loading ? (
          <p>Memuat data...</p>
        ) : (
          <table className="w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Tanggal</th>
                <th className="border p-2">Supplier</th>
                <th className="border p-2 text-right">Nilai</th>
                <th className="border p-2">Status</th>
                <th className="border p-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-4">
                    Belum ada hutang
                  </td>
                </tr>
              ) : (
                data.map((h) => (
                  <tr key={h.id}>
                    <td className="border p-2">{h.tanggal}</td>
                    <td className="border p-2">{h.supplier}</td>
                    <td className="border p-2 text-right">
                      {h.nilai.toLocaleString("id-ID")}
                    </td>
                    <td className="border p-2">{h.status}</td>
                    <td className="border p-2">
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            router.push(`/proyek/${id}/hutang/${h.id}/edit`)
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => setDeleteId(h.id)}
                        >
                          Hapus
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

      <ConfirmModal
        open={deleteId !== null}
        title="Hapus Hutang"
        description="Yakin hapus hutang ini? Jurnal juga akan terhapus."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
