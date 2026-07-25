"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface PiutangItem {
  id: string;
  tanggal: string;
  deskripsi: string;
  debit: number;
  kredit: number;
  saldo: number;
}

export default function PiutangNonProyekPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<PiutangItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  async function load(): Promise<void> {
    const res = await fetch(
      `/api/proyek/piutang-non-proyek?id_proyek=${params.id}`,
    );
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const json: PiutangItem[] = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    void load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  return (
    <div className="max-w-6xl mx-auto">
      <Card title="Piutang Non Proyek">
        <div className="flex justify-end mb-4">
          <Button
            onClick={() =>
              router.push(`/proyek/${params.id}/piutang-non-proyek/form`)
            }
          >
            Tambah Piutang
          </Button>
        </div>

        {loading ? (
          <p>Memuat data...</p>
        ) : (
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">Tanggal</th>
                <th className="border px-2 py-1">Deskripsi</th>
                <th className="border px-2 py-1">Debit</th>
                <th className="border px-2 py-1">Kredit</th>
                <th className="border px-2 py-1">Saldo</th>
                <th className="border px-2 py-1">Aksi</th>
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
                    <td className="border px-2 py-1">{item.tanggal}</td>
                    <td className="border px-2 py-1">{item.deskripsi}</td>
                    <td className="border px-2 py-1">
                      {item.debit.toLocaleString("id-ID")}
                    </td>
                    <td className="border px-2 py-1">
                      {item.kredit.toLocaleString("id-ID")}
                    </td>
                    <td className="border px-2 py-1">
                      {item.saldo.toLocaleString("id-ID")}
                    </td>
                    <td className="border px-2 py-1">
                      <Button
                        onClick={() =>
                          router.push(
                            `/proyek/${params.id}/piutang-non-proyek/${item.id}/edit`,
                          )
                        }
                      >
                        Edit
                      </Button>
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
