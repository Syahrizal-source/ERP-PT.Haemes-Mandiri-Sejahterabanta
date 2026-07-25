"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { Plus, Pencil, Eye, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";

import Button from "@/components/ui/Button";

import { useToast } from "@/components/ui/toast-context";

import { PiutangProyekAccounting } from "@/types/proyek";

/* =========================
   PAGE
========================= */

export default function PiutangProyekPage() {
  const router = useRouter();

  const params = useParams<{
    id: string;
  }>();

  const { showToast } = useToast();
  const proyekId = params.id as string;
  const [data, setData] = useState<PiutangProyekAccounting[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  /* =========================
     LOAD DATA
  ========================= */

  async function loadData(): Promise<void> {
    try {
      setLoading(true);

      const res = await fetch(`/api/proyek/piutang?id_proyek=${proyekId}`);

      if (!res.ok) {
        showToast("Gagal mengambil data piutang proyek", "error");

        setLoading(false);

        return;
      }

      const result: PiutangProyekAccounting[] = await res.json();

      setData(result);

      setLoading(false);
    } catch (error: unknown) {
      showToast((error as Error).message, "error");

      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyekId]);

  /* =========================
     TOTAL
  ========================= */

  const totalPiutang = data.reduce(
    (sum, item) => sum + Number(item.nilai_piutang),
    0,
  );

  const totalPenerimaan = data.reduce(
    (sum, item) => sum + Number(item.penerimaan),
    0,
  );

  const totalSaldo = data.reduce((sum, item) => sum + Number(item.saldo), 0);

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Card title="Piutang Proyek">
        <div className="flex items-center justify-between mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">Total Piutang</p>

              <p className="text-xl font-semibold">
                Rp {totalPiutang.toLocaleString("id-ID")}
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">Total Penerimaan</p>

              <p className="text-xl font-semibold">
                Rp {totalPenerimaan.toLocaleString("id-ID")}
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">Total Saldo</p>

              <p className="text-xl font-semibold">
                Rp {totalSaldo.toLocaleString("id-ID")}
              </p>
            </div>
          </div>

          <Button
            onClick={() => router.push(`/proyek/${params.id}/piutang/form`)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Piutang
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Memuat data...
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-3 py-2 text-left">Tanggal</th>

                  <th className="border px-3 py-2 text-left">Customer</th>

                  <th className="border px-3 py-2 text-left">
                    Tanggal Pembayaran
                  </th>

                  <th className="border px-3 py-2 text-right">Piutang</th>

                  <th className="border px-3 py-2 text-right">Penerimaan</th>

                  <th className="border px-3 py-2 text-right">Saldo</th>

                  <th className="border px-3 py-2 text-center">Status</th>

                  <th className="border px-3 py-2 text-center">Posted</th>

                  <th className="border px-3 py-2 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-6">
                      Tidak ada data piutang proyek
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr key={item.id_piutang_proyek}>
                      <td className="border px-3 py-2">
                        {new Date(item.tanggal).toLocaleDateString("id-ID")}
                      </td>

                      <td className="border px-3 py-2">{item.customer}</td>

                      <td className="border px-3 py-2">
                        {item.tanggal_pembayaran
                          ? new Date(
                              item.tanggal_pembayaran,
                            ).toLocaleDateString("id-ID")
                          : "-"}
                      </td>

                      <td className="border px-3 py-2 text-right">
                        {Number(item.nilai_piutang).toLocaleString("id-ID")}
                      </td>

                      <td className="border px-3 py-2 text-right">
                        {Number(item.penerimaan).toLocaleString("id-ID")}
                      </td>

                      <td className="border px-3 py-2 text-right">
                        {Number(item.saldo).toLocaleString("id-ID")}
                      </td>

                      <td className="border px-3 py-2 text-center">
                        <span className="text-xs px-2 py-1 rounded border">
                          {item.status}
                        </span>
                      </td>

                      <td className="border px-3 py-2 text-center">
                        {item.is_posted ? "YES" : "NO"}
                      </td>

                      <td className="border px-3 py-2">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="secondary"
                            onClick={() =>
                              router.push(
                                `/proyek/${proyekId}/piutang/${item.id_piutang_proyek}`,
                              )
                            }
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          <Button
                            onClick={() =>
                              router.push(
                                `/proyek/${proyekId}/piutang/${item.id_piutang_proyek}/edit`,
                              )
                            }
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {data.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-100 font-semibold">
                    <td colSpan={3} className="border px-3 py-2 text-right">
                      TOTAL
                    </td>

                    <td className="border px-3 py-2 text-right">
                      {totalPiutang.toLocaleString("id-ID")}
                    </td>

                    <td className="border px-3 py-2 text-right">
                      {totalPenerimaan.toLocaleString("id-ID")}
                    </td>

                    <td className="border px-3 py-2 text-right">
                      {totalSaldo.toLocaleString("id-ID")}
                    </td>

                    <td colSpan={3} className="border" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
