"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Plus, Loader2, Eye, Trash2 } from "lucide-react";

import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import { useToast } from "@/components/ui/toast-context";

/* ============================================================
 * TYPE
 * ============================================================ */

interface PembayaranPph4 {
  id: number;
  tanggal: string;
  id_pph4: number;
  nominal: number;
  keterangan: string;
  id_coa_kas: number;
  id_jurnal: number | null;
  created_at: string;

  nilai_transaksi: number;
  tarif_pph4: number;
  pph4_terutang: number;

  total_pembayaran: number;
  sisa: number;

  status: "UNPAID" | "PARTIAL" | "PAID";

  status_label: string;
}

/* ============================================================
 * PAGE
 * ============================================================ */

export default function Page(): React.JSX.Element {
  const router = useRouter();

  const { showToast } = useToast();

  const [data, setData] = useState<PembayaranPph4[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  /* ============================================================
   * FETCH DATA
   * ============================================================ */

  async function fetchData(): Promise<void> {
    try {
      setLoading(true);

      const res = await fetch("/api/pembayaran-pph4", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const result: unknown = await readJsonSafely(res);

        showToast(
          getErrorMessage(result, "Gagal mengambil data pembayaran PPh4"),
          "error",
        );

        return;
      }

      const result: unknown = await readJsonSafely(res);

      if (!Array.isArray(result)) {
        showToast("Format data pembayaran PPh4 tidak valid", "error");

        return;
      }

      const normalizedData: PembayaranPph4[] =
        normalizePembayaranPph4List(result);

      setData(normalizedData);
    } catch (error: unknown) {
      console.error("FETCH PEMBAYARAN PPH4 ERROR:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Gagal mengambil data pembayaran PPh4",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
   * LOAD
   * ============================================================ */

  useEffect(() => {
    void fetchData();
  }, []);

  /* ============================================================
   * DELETE
   * ============================================================ */

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus pembayaran PPh4 ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) {
      return;
    }

    try {
      const res = await fetch(`/api/pembayaran-pph4/${id}`, {
        method: "DELETE",
      });

      const result: unknown = await readJsonSafely(res);

      if (!res.ok) {
        throw new Error(
          getErrorMessage(result, "Gagal menghapus pembayaran PPh4"),
        );
      }

      await Swal.fire(
        "Berhasil",
        "Data pembayaran PPh4 berhasil dihapus",
        "success",
      );

      await fetchData();
    } catch (error: unknown) {
      console.error("DELETE PEMBAYARAN PPH4 ERROR:", error);

      await Swal.fire(
        "Gagal",
        error instanceof Error
          ? error.message
          : "Gagal menghapus pembayaran PPh4",
        "error",
      );
    }
  }

  /* ============================================================
   * TOTAL
   * ============================================================ */

  const totalPembayaran: number = data.reduce(
    (sum: number, item: PembayaranPph4): number => {
      return sum + item.nominal;
    },
    0,
  );

  /* ============================================================
   * RENDER
   * ============================================================ */

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        <Card title="Pembayaran PPh4">
          {/* ==================================================
              HEADER
              ================================================== */}

          <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Daftar pembayaran kewajiban PPh4.
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Pembayaran menggunakan COA Hutang PPh4 dan COA Kas/Bank Detail.
              </p>
            </div>

            <Button onClick={() => router.push("/pajak/pembayaran-pph4/form")}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah
            </Button>
          </div>

          {/* ==================================================
              ACCOUNTING INFO
              ================================================== */}

          <div className="mb-5 rounded-lg border bg-gray-50 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500">COA Hutang PPh4</p>

                <p className="font-semibold">2504 - 21304 Hutang Pajak PPh4</p>
              </div>

              <div>
                <p className="text-xs text-gray-500">COA Beban PPh4</p>

                <p className="font-semibold">Tidak digunakan saat pembayaran</p>

                <p className="text-xs text-gray-400">
                  2265 - 62003 Beban Pajak PPh4
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">COA Kas</p>

                <p className="font-semibold">Kas/Bank Detail</p>

                <p className="text-xs text-gray-400">Bukan COA Header 3</p>
              </div>
            </div>
          </div>

          {/* ==================================================
              SUMMARY
              ================================================== */}

          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card title="Total Pembayaran">
              <p className="text-2xl font-semibold">
                {formatRupiah(totalPembayaran)}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                {data.length} transaksi
              </p>
            </Card>

            <Card title="Status Accounting">
              <p className="text-sm text-gray-600">Jurnal pembayaran:</p>

              <p className="mt-1 font-medium">Dr 2504 Hutang Pajak PPh4</p>

              <p className="font-medium">Cr Kas/Bank Detail</p>
            </Card>

            <Card title="Pajak">
              <p className="text-sm text-gray-600">
                Pembayaran tidak menggunakan:
              </p>

              <p className="mt-1 text-sm">PPN / PPh23</p>
            </Card>
          </div>

          {/* ==================================================
              LOADING
              ================================================== */}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin w-5 h-5" />
            </div>
          ) : data.length === 0 ? (
            /* ==================================================
               EMPTY
               ================================================== */

            <div className="py-8 text-center text-sm text-gray-500">
              Belum ada data pembayaran PPh4.
            </div>
          ) : (
            /* ==================================================
               TABLE
               ================================================== */

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-3 py-2 text-left">Tanggal</th>

                    <th className="border px-3 py-2 text-left">ID PPh4</th>

                    <th className="border px-3 py-2 text-right">
                      PPh4 Terutang
                    </th>

                    <th className="border px-3 py-2 text-right">Pembayaran</th>

                    <th className="border px-3 py-2 text-right">Sisa</th>

                    <th className="border px-3 py-2 text-left">COA Kas/Bank</th>

                    <th className="border px-3 py-2 text-left">Keterangan</th>

                    <th className="border px-3 py-2 text-center">Status</th>

                    <th className="border px-3 py-2 text-center">Jurnal</th>

                    <th className="border px-3 py-2 text-center">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {data.map((item: PembayaranPph4) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      {/* ==================================
                            TANGGAL
                            ================================== */}

                      <td className="border px-3 py-2">
                        {formatTanggal(item.tanggal)}
                      </td>

                      {/* ==================================
                            ID PPH4
                            ================================== */}

                      <td className="border px-3 py-2">#{item.id_pph4}</td>

                      {/* ==================================
                            PPH4 TERUTANG
                            ================================== */}

                      <td className="border px-3 py-2 text-right">
                        {formatRupiah(item.pph4_terutang)}
                      </td>

                      {/* ==================================
                            PEMBAYARAN
                            ================================== */}

                      <td className="border px-3 py-2 text-right font-semibold">
                        {formatRupiah(item.nominal)}
                      </td>

                      {/* ==================================
                            SISA
                            ================================== */}

                      <td className="border px-3 py-2 text-right">
                        {formatRupiah(item.sisa)}
                      </td>

                      {/* ==================================
                            COA KAS
                            ================================== */}

                      <td className="border px-3 py-2">
                        <div className="font-medium">
                          ID COA {item.id_coa_kas}
                        </div>

                        <div className="text-xs text-gray-500">
                          Kas/Bank Detail
                        </div>
                      </td>

                      {/* ==================================
                            KETERANGAN
                            ================================== */}

                      <td className="border px-3 py-2">{item.keterangan}</td>

                      {/* ==================================
                            STATUS
                            ================================== */}

                      <td className="border px-3 py-2 text-center">
                        <StatusBadge
                          status={item.status}
                          label={item.status_label}
                        />
                      </td>

                      {/* ==================================
                            JURNAL
                            ================================== */}

                      <td className="border px-3 py-2 text-center">
                        {item.id_jurnal !== null ? (
                          <span className="font-medium">#{item.id_jurnal}</span>
                        ) : (
                          <span className="text-gray-400">Belum</span>
                        )}
                      </td>

                      {/* ==================================
                            AKSI
                            ================================== */}

                      <td className="border px-3 py-2">
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant="secondary"
                            onClick={() =>
                              router.push(`/pajak/pembayaran-pph4/${item.id}`)
                            }
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="destructive"
                            onClick={() => void handleDelete(item.id)}
                            disabled={item.id_jurnal !== null}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

/* ============================================================
 * STATUS BADGE
 * ============================================================ */

interface StatusBadgeProps {
  status: "UNPAID" | "PARTIAL" | "PAID";

  label: string;
}

function StatusBadge({ status, label }: StatusBadgeProps): React.JSX.Element {
  let className = "inline-flex rounded-full px-2.5 py-1 text-xs font-medium";

  if (status === "PAID") {
    className += " bg-green-100 text-green-700";
  } else if (status === "PARTIAL") {
    className += " bg-yellow-100 text-yellow-700";
  } else {
    className += " bg-gray-100 text-gray-600";
  }

  return <span className={className}>{label}</span>;
}

/* ============================================================
 * NORMALIZE DATA
 * ============================================================ */

function normalizePembayaranPph4List(value: unknown[]): PembayaranPph4[] {
  return value
    .filter(
      (item: unknown): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map(
      (item: Record<string, unknown>): PembayaranPph4 => ({
        id: Number(item.id),

        tanggal: String(item.tanggal ?? ""),

        id_pph4: Number(item.id_pph4),

        nominal: Number(item.nominal ?? 0),

        keterangan: String(item.keterangan ?? ""),

        id_coa_kas: Number(item.id_coa_kas ?? 0),

        id_jurnal:
          item.id_jurnal === null || item.id_jurnal === undefined
            ? null
            : Number(item.id_jurnal),

        created_at: String(item.created_at ?? ""),

        nilai_transaksi: Number(item.nilai_transaksi ?? 0),

        tarif_pph4: Number(item.tarif_pph4 ?? 0),

        pph4_terutang: Number(item.pph4_terutang ?? 0),

        total_pembayaran: Number(item.total_pembayaran ?? 0),

        sisa: Number(item.sisa ?? 0),

        status:
          item.status === "PAID"
            ? "PAID"
            : item.status === "PARTIAL"
              ? "PARTIAL"
              : "UNPAID",

        status_label: String(item.status_label ?? "Belum Dibayar"),
      }),
    )
    .filter(
      (item: PembayaranPph4): boolean =>
        Number.isInteger(item.id) &&
        item.id > 0 &&
        Number.isInteger(item.id_pph4) &&
        item.id_pph4 > 0 &&
        Number.isInteger(item.id_coa_kas) &&
        item.id_coa_kas > 0,
    );
}

/* ============================================================
 * FORMAT TANGGAL
 * ============================================================ */

function formatTanggal(value: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/* ============================================================
 * FORMAT RUPIAH
 * ============================================================ */

function formatRupiah(value: number): string {
  return `Rp ${Number(value ?? 0).toLocaleString("id-ID")}`;
}

/* ============================================================
 * SAFE JSON
 * ============================================================ */

async function readJsonSafely(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();

    throw new Error(
      `Server mengembalikan response bukan JSON (${response.status}). ${text.slice(
        0,
        200,
      )}`,
    );
  }

  return response.json();
}

/* ============================================================
 * ERROR MESSAGE
 * ============================================================ */

function getErrorMessage(value: unknown, fallback: string): string {
  if (typeof value === "object" && value !== null && "error" in value) {
    const error = value.error;

    if (typeof error === "string" && error.trim()) {
      return error;
    }
  }

  return fallback;
}
