"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Edit, Loader2, Plus, Trash2, ArrowLeft } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";

type PembayaranHutang = {
  id: string;
  id_hutang: string;
  tanggal: string;
  jumlah: number;
  metode: string | null;
  bank: string | null;
  created_at?: string;
};

type ApiResponse = {
  success?: boolean;
  data?: PembayaranHutang[];
  error?: string;
  message?: string;
};

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTanggal(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getMetodeLabel(metode: string | null): string {
  switch (metode) {
    case "KAS":
      return "Kas Proyek";

    case "KAS_BESAR":
      return "Kas Besar";

    case "KAS_KECIL":
      return "Kas Kecil";

    case "BANK":
      return "Bank";

    default:
      return metode ?? "-";
  }
}

export default function PembayaranHutangPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id;

  const [data, setData] = useState<PembayaranHutang[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/proyek/pembayaran-hutang?id_proyek=${encodeURIComponent(
          proyekId,
        )}`,
      );

      const result: unknown = await response.json();

      if (!response.ok) {
        const errorData = result as ApiResponse;

        throw new Error(
          errorData.error ?? "Gagal mengambil pembayaran hutang.",
        );
      }

      const apiResult = result as ApiResponse;

      /*
       * Mendukung response:
       *
       * {
       *   success: true,
       *   data: [...]
       * }
       *
       * maupun array langsung apabila API lama masih digunakan.
       */
      if (Array.isArray(result)) {
        setData(
          result.map((item) => ({
            ...item,
            jumlah: Number(item.jumlah),
          })),
        );

        return;
      }

      if (!apiResult.success || !Array.isArray(apiResult.data)) {
        throw new Error("Format response pembayaran hutang tidak valid.");
      }

      setData(
        apiResult.data.map((item) => ({
          ...item,
          jumlah: Number(item.jumlah),
        })),
      );
    } catch (error: unknown) {
      console.error("GET PEMBAYARAN HUTANG:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Gagal mengambil pembayaran hutang.",
        "error",
      );

      setData([]);
    } finally {
      setLoading(false);
    }
  }, [proyekId, showToast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleDelete(): Promise<void> {
    if (!deleteId || deleting) {
      return;
    }

    try {
      setDeleting(true);

      const response = await fetch(
        `/api/proyek/pembayaran-hutang/${deleteId}`,
        {
          method: "DELETE",
        },
      );

      const result: unknown = await response.json();

      if (!response.ok) {
        const errorData = result as ApiResponse;

        throw new Error(
          errorData.error ?? "Gagal menghapus pembayaran hutang.",
        );
      }

      showToast("Pembayaran hutang berhasil dihapus.", "success");

      setDeleteId(null);

      await fetchData();
    } catch (error: unknown) {
      console.error("DELETE PEMBAYARAN HUTANG:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Gagal menghapus pembayaran hutang.",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  }

  const totalPembayaran = data.reduce(
    (sum, item) => sum + Number(item.jumlah),
    0,
  );

  const selectedPembayaran = data.find((item) => item.id === deleteId) ?? null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Card title="Pembayaran Hutang Proyek">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500">
              Daftar pembayaran hutang supplier proyek.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => router.push(`/proyek/${proyekId}/hutang`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Hutang
            </Button>

            <Button
              onClick={() =>
                router.push(`/proyek/${proyekId}/pembayaran-hutang/form`)
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Bayar Hutang
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="Total Pembayaran">
          <p className="text-2xl font-semibold">
            {formatRupiah(totalPembayaran)}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {data.length} transaksi pembayaran
          </p>
        </Card>

        <Card title="Status Accounting">
          <p className="text-sm text-gray-600">
            Setiap pembayaran akan menggunakan COA berdasarkan mapping PROYEK
            pada database.
          </p>

          <p className="mt-2 text-xs text-gray-500">
            COA hutang dan COA kas/bank tidak dipilih secara manual dari form.
          </p>
        </Card>
      </div>

      <Card title="Daftar Pembayaran">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Memuat pembayaran hutang...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 text-left">No</th>

                  <th className="border p-3 text-left">Tanggal</th>

                  <th className="border p-3 text-right">Jumlah</th>

                  <th className="border p-3 text-left">Metode</th>

                  <th className="border p-3 text-left">Bank</th>

                  <th className="border p-3 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="border p-8 text-center text-gray-500"
                    >
                      Belum ada pembayaran hutang proyek.
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="border p-3">{index + 1}</td>

                      <td className="border p-3">
                        {formatTanggal(item.tanggal)}
                      </td>

                      <td className="border p-3 text-right font-medium">
                        {formatRupiah(Number(item.jumlah))}
                      </td>

                      <td className="border p-3">
                        {getMetodeLabel(item.metode)}
                      </td>

                      <td className="border p-3">{item.bank ?? "-"}</td>

                      <td className="border p-3">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="secondary"
                            onClick={() =>
                              router.push(
                                `/proyek/${proyekId}/pembayaran-hutang/${item.id}/edit`,
                              )
                            }
                          >
                            <Edit className="mr-1 h-4 w-4" />
                            Edit
                          </Button>

                          <Button
                            variant="destructive"
                            onClick={() => setDeleteId(item.id)}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {data.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={2} className="border p-3 text-right">
                      TOTAL
                    </td>

                    <td className="border p-3 text-right">
                      {formatRupiah(totalPembayaran)}
                    </td>

                    <td colSpan={3} className="border p-3" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </Card>

      <ConfirmModal
        open={deleteId !== null}
        title="Hapus Pembayaran Hutang"
        description={
          selectedPembayaran
            ? `Yakin ingin menghapus pembayaran sebesar ${formatRupiah(
                Number(selectedPembayaran.jumlah),
              )}? Jurnal pembayaran juga akan dikoreksi oleh backend.`
            : "Yakin ingin menghapus pembayaran hutang ini?"
        }
        onConfirm={() => {
          void handleDelete();
        }}
        onCancel={() => {
          if (!deleting) {
            setDeleteId(null);
          }
        }}
      />
    </div>
  );
}
