"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, ArrowLeft } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

// =====================================================
// TYPES
// =====================================================

type JenisTransaksiPendapatan =
  | "TUNAI"
  | "TERMIN"
  | "PENERIMAAN_PIUTANG"
  | "UANG_MUKA"
  | "REALISASI_UANG_MUKA";

type JenisPajakPendapatan = "FINAL_PPH42" | "NON_FINAL_PPH23" | null;

type PendapatanProyek = {
  id: number;
  id_proyek: string;
  tanggal: string;
  no_bukti: string;
  keterangan: string | null;
  nilai_pendapatan: number;
  jenis_pajak: JenisPajakPendapatan;
  tarif_pajak: number;
  nilai_pajak: number;
  nilai_bersih: number;
  id_jurnal: number | null;
  jenis_transaksi: JenisTransaksiPendapatan;
  created_at?: string;
  updated_at?: string;
};

// =====================================================
// TYPE GUARD
// =====================================================

function isPendapatanProyek(value: unknown): value is PendapatanProyek {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;

  // ---------------------------------------------------
  // ID
  // ---------------------------------------------------

  if (typeof item.id !== "number" && typeof item.id !== "string") {
    return false;
  }

  // ---------------------------------------------------
  // ID PROYEK
  // ---------------------------------------------------

  if (typeof item.id_proyek !== "string") {
    return false;
  }

  // ---------------------------------------------------
  // TANGGAL
  // ---------------------------------------------------

  if (typeof item.tanggal !== "string") {
    return false;
  }

  // ---------------------------------------------------
  // NO BUKTI
  // ---------------------------------------------------

  if (typeof item.no_bukti !== "string") {
    return false;
  }

  // ---------------------------------------------------
  // KETERANGAN
  // ---------------------------------------------------

  if (item.keterangan !== null && typeof item.keterangan !== "string") {
    return false;
  }

  // ---------------------------------------------------
  // NILAI PENDAPATAN
  // ---------------------------------------------------

  if (
    typeof item.nilai_pendapatan !== "number" &&
    typeof item.nilai_pendapatan !== "string"
  ) {
    return false;
  }

  // ---------------------------------------------------
  // JENIS PAJAK
  // ---------------------------------------------------

  if (
    item.jenis_pajak !== null &&
    item.jenis_pajak !== "FINAL_PPH42" &&
    item.jenis_pajak !== "NON_FINAL_PPH23"
  ) {
    return false;
  }

  // ---------------------------------------------------
  // TARIF PAJAK
  // ---------------------------------------------------

  if (
    typeof item.tarif_pajak !== "number" &&
    typeof item.tarif_pajak !== "string"
  ) {
    return false;
  }

  // ---------------------------------------------------
  // NILAI PAJAK
  // ---------------------------------------------------

  if (
    typeof item.nilai_pajak !== "number" &&
    typeof item.nilai_pajak !== "string"
  ) {
    return false;
  }

  // ---------------------------------------------------
  // NILAI BERSIH
  // ---------------------------------------------------

  if (
    typeof item.nilai_bersih !== "number" &&
    typeof item.nilai_bersih !== "string"
  ) {
    return false;
  }

  // ---------------------------------------------------
  // ID JURNAL
  // ---------------------------------------------------

  if (
    item.id_jurnal !== null &&
    typeof item.id_jurnal !== "number" &&
    typeof item.id_jurnal !== "string"
  ) {
    return false;
  }

  // ---------------------------------------------------
  // JENIS TRANSAKSI
  // ---------------------------------------------------

  if (
    item.jenis_transaksi !== "TUNAI" &&
    item.jenis_transaksi !== "TERMIN" &&
    item.jenis_transaksi !== "PENERIMAAN_PIUTANG" &&
    item.jenis_transaksi !== "UANG_MUKA" &&
    item.jenis_transaksi !== "REALISASI_UANG_MUKA"
  ) {
    return false;
  }

  return true;
}

// =====================================================
// NORMALIZE
// =====================================================

function normalizePendapatan(item: PendapatanProyek): PendapatanProyek {
  return {
    ...item,
    id: Number(item.id),
    nilai_pendapatan: Number(item.nilai_pendapatan),
    tarif_pajak: Number(item.tarif_pajak),
    nilai_pajak: Number(item.nilai_pajak),
    nilai_bersih: Number(item.nilai_bersih),
    id_jurnal: item.id_jurnal === null ? null : Number(item.id_jurnal),
  };
}

// =====================================================
// FORMAT RUPIAH
// =====================================================

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

// =====================================================
// FORMAT TANGGAL
// =====================================================

function formatTanggal(value: string): string {
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

// =====================================================
// LABEL TRANSAKSI
// =====================================================

function getJenisTransaksiLabel(jenis: JenisTransaksiPendapatan): string {
  switch (jenis) {
    case "TUNAI":
      return "Tunai";

    case "TERMIN":
      return "Termin";

    case "PENERIMAAN_PIUTANG":
      return "Penerimaan Piutang";

    case "UANG_MUKA":
      return "Uang Muka";

    case "REALISASI_UANG_MUKA":
      return "Realisasi Uang Muka";

    default:
      return "-";
  }
}

// =====================================================
// LABEL PAJAK
// =====================================================

function getJenisPajakLabel(jenis: JenisPajakPendapatan): string {
  switch (jenis) {
    case "FINAL_PPH42":
      return "Final PPh 4(2)";

    case "NON_FINAL_PPH23":
      return "Non Final PPh 23";

    case null:
      return "-";

    default:
      return "-";
  }
}

// =====================================================
// PAGE
// =====================================================

export default function PendapatanProyekPage() {
  const params = useParams<{
    id: string;
  }>();

  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id;

  const [data, setData] = useState<PendapatanProyek[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ===================================================
  // LOAD DATA
  // ===================================================

  const fetchData = useCallback(async (): Promise<void> => {
    if (!proyekId) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `/api/proyek/pendapatan?id_proyek=${encodeURIComponent(proyekId)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const result: unknown = await response.json();

      if (!response.ok) {
        const errorMessage =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Gagal mengambil data pendapatan proyek.";

        throw new Error(errorMessage);
      }

      if (!Array.isArray(result)) {
        throw new Error("Format data pendapatan proyek tidak valid.");
      }

      const normalizedData = result.map((item: unknown): PendapatanProyek => {
        if (!isPendapatanProyek(item)) {
          throw new Error("Data pendapatan proyek tidak valid.");
        }

        return normalizePendapatan(item);
      });

      setData(normalizedData);
    } catch (error: unknown) {
      console.error("GET PENDAPATAN PROYEK:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Gagal mengambil data pendapatan proyek.",
        "error",
      );

      setData([]);
    } finally {
      setLoading(false);
    }
  }, [proyekId, showToast]);

  // ===================================================
  // EFFECT
  // ===================================================

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // ===================================================
  // DELETE
  // ===================================================

  async function handleDelete(pendapatanId: number): Promise<void> {
    const confirmed = window.confirm(
      "Yakin ingin menghapus pendapatan proyek ini?\n\nJurnal yang terkait dengan transaksi ini juga akan diproses oleh API.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(pendapatanId);

      const response = await fetch(`/api/proyek/pendapatan/${pendapatanId}`, {
        method: "DELETE",
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        const errorMessage =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Gagal menghapus pendapatan proyek.";

        throw new Error(errorMessage);
      }

      showToast("Pendapatan proyek berhasil dihapus.", "success");

      await fetchData();
    } catch (error: unknown) {
      console.error("DELETE PENDAPATAN PROYEK:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Gagal menghapus pendapatan proyek.",
        "error",
      );
    } finally {
      setDeletingId(null);
    }
  }

  // ===================================================
  // TRANSAKSI YANG MENGAKUI PENDAPATAN
  // ===================================================

  const pendapatanItems = data.filter(
    (item) =>
      item.jenis_transaksi !== "UANG_MUKA" &&
      item.jenis_transaksi !== "PENERIMAAN_PIUTANG",
  );

  // ===================================================
  // TOTAL
  // ===================================================

  const totalPendapatan = pendapatanItems.reduce(
    (sum, item) => sum + Number(item.nilai_pendapatan),
    0,
  );

  const totalPajak = pendapatanItems.reduce(
    (sum, item) => sum + Number(item.nilai_pajak),
    0,
  );

  const totalBersih = pendapatanItems.reduce(
    (sum, item) => sum + Number(item.nilai_bersih),
    0,
  );

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="mx-auto max-w-6xl">
      <Card title="Pendapatan Proyek">
        {/* =============================================
            HEADER
        ============================================= */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Proyek
          </Button>

          <Button
            onClick={() => router.push(`/proyek/${proyekId}/pendapatan/form`)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Pendapatan
          </Button>
        </div>

        {/* =============================================
            SUMMARY
        ============================================= */}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">Jumlah Transaksi</p>

            <p className="text-xl font-semibold">{pendapatanItems.length}</p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Pendapatan</p>

            <p className="text-xl font-semibold">
              {formatRupiah(totalPendapatan)}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Bersih</p>

            <p className="text-xl font-semibold">{formatRupiah(totalBersih)}</p>
          </div>
        </div>

        {/* =============================================
            INFORMASI PAJAK
        ============================================= */}

        <div className="mb-6 rounded-lg border p-4">
          <p className="text-sm text-gray-500">Total Pajak Pendapatan</p>

          <p className="mt-1 text-xl font-semibold">
            {formatRupiah(totalPajak)}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Final PPh 4(2) / Non Final PPh 23
          </p>
        </div>

        {/* =============================================
            TABLE
        ============================================= */}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10">
            <Loader2 className="h-5 w-5 animate-spin" />
            Memuat data pendapatan proyek...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-3 py-2 text-center">No</th>

                  <th className="border px-3 py-2 text-left">Tanggal</th>

                  <th className="border px-3 py-2 text-left">No. Bukti</th>

                  <th className="border px-3 py-2 text-left">
                    Jenis Transaksi
                  </th>

                  <th className="border px-3 py-2 text-right">Pendapatan</th>

                  <th className="border px-3 py-2 text-left">Pajak</th>

                  <th className="border px-3 py-2 text-right">Nilai Pajak</th>

                  <th className="border px-3 py-2 text-right">Bersih</th>

                  <th className="border px-3 py-2 text-left">Keterangan</th>

                  <th className="border px-3 py-2 text-center">Jurnal</th>

                  <th className="border px-3 py-2 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="border px-3 py-8 text-center text-gray-500"
                    >
                      Belum ada pendapatan proyek.
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="border px-3 py-2 text-center">
                        {index + 1}
                      </td>

                      <td className="border px-3 py-2">
                        {formatTanggal(item.tanggal)}
                      </td>

                      <td className="border px-3 py-2">
                        <span className="font-mono text-xs">
                          {item.no_bukti}
                        </span>
                      </td>

                      <td className="border px-3 py-2">
                        {getJenisTransaksiLabel(item.jenis_transaksi)}
                      </td>

                      <td className="border px-3 py-2 text-right font-medium">
                        {formatRupiah(item.nilai_pendapatan)}
                      </td>

                      <td className="border px-3 py-2">
                        <div>
                          <div>{getJenisPajakLabel(item.jenis_pajak)}</div>

                          {item.tarif_pajak > 0 && (
                            <div className="text-xs text-gray-500">
                              {item.tarif_pajak.toFixed(2)}%
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="border px-3 py-2 text-right">
                        {formatRupiah(item.nilai_pajak)}
                      </td>

                      <td className="border px-3 py-2 text-right font-medium">
                        {formatRupiah(item.nilai_bersih)}
                      </td>

                      <td className="border px-3 py-2">
                        {item.keterangan ?? "-"}
                      </td>

                      <td className="border px-3 py-2 text-center">
                        <span className="inline-flex items-center rounded border px-2 py-1 text-xs font-medium">
                          {item.id_jurnal !== null ? "POSTED" : "BELUM POSTING"}
                        </span>
                      </td>

                      <td className="border px-3 py-2">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="secondary"
                            onClick={() =>
                              router.push(
                                `/proyek/${proyekId}/pendapatan/${item.id}/edit`,
                              )
                            }
                            disabled={deletingId === item.id}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="destructive"
                            disabled={deletingId === item.id}
                            onClick={() => void handleDelete(item.id)}
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
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
                    <td colSpan={4} className="border px-3 py-2 text-right">
                      TOTAL
                    </td>

                    <td className="border px-3 py-2 text-right">
                      {formatRupiah(totalPendapatan)}
                    </td>

                    <td className="border px-3 py-2">-</td>

                    <td className="border px-3 py-2 text-right">
                      {formatRupiah(totalPajak)}
                    </td>

                    <td className="border px-3 py-2 text-right">
                      {formatRupiah(totalBersih)}
                    </td>

                    <td colSpan={3} className="border px-3 py-2" />
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
