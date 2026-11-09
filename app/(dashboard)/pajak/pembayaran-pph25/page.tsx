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

interface PembayaranPph25 {
  id: number;
  tanggal: string;
  id_pph25: number;
  nominal: number;
  keterangan: string;
  id_coa_kas: number;
  id_jurnal: number | null;
  created_at: string;

  tahun: number;
  bulan: number;
  nilai_angsuran: number;
  tanggal_setor: string | null;
  tanggal_transaksi: string;
  pph25_keterangan: string | null;

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

  const [data, setData] = useState<PembayaranPph25[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  /* ============================================================
   * FETCH DATA
   * ============================================================ */

  async function fetchData(): Promise<void> {
    try {
      setLoading(true);

      const res = await fetch("/api/pembayaran-pph25", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const result: unknown = await readJsonSafely(res);

        showToast(
          getErrorMessage(result, "Gagal mengambil data pembayaran PPh25"),
          "error",
        );

        return;
      }

      const result: unknown = await readJsonSafely(res);

      if (!Array.isArray(result)) {
        showToast("Format data pembayaran PPh25 tidak valid", "error");

        return;
      }

      const normalizedData: PembayaranPph25[] =
        normalizePembayaranPph25List(result);

      setData(normalizedData);
    } catch (error: unknown) {
      console.error("FETCH PEMBAYARAN PPH25 ERROR:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Gagal mengambil data pembayaran PPh25",
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
      text: "Apakah Anda yakin menghapus pembayaran PPh25 ini?",
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
      const res = await fetch(`/api/pembayaran-pph25/${id}`, {
        method: "DELETE",
      });

      const result: unknown = await readJsonSafely(res);

      if (!res.ok) {
        throw new Error(
          getErrorMessage(result, "Gagal menghapus pembayaran PPh25"),
        );
      }

      await Swal.fire(
        "Berhasil",
        "Data pembayaran PPh25 berhasil dihapus",
        "success",
      );

      await fetchData();
    } catch (error: unknown) {
      console.error("DELETE PEMBAYARAN PPH25 ERROR:", error);

      await Swal.fire(
        "Gagal",
        error instanceof Error
          ? error.message
          : "Gagal menghapus pembayaran PPh25",
        "error",
      );
    }
  }

  /* ============================================================
   * TOTAL
   * ============================================================ */

  const totalPembayaran: number = data.reduce(
    (sum: number, item: PembayaranPph25): number => {
      return sum + item.nominal;
    },
    0,
  );

  /* ============================================================
   * TOTAL KEWAJIBAN
   *
   * Menggunakan nilai_angsuran dari tabel pph25.
   * ============================================================ */

  const totalKewajiban: number = data.reduce(
    (sum: number, item: PembayaranPph25): number => {
      return sum + item.nilai_angsuran;
    },
    0,
  );

  /* ============================================================
   * TOTAL SISA
   * ============================================================ */

  const totalSisa: number = data.reduce(
    (sum: number, item: PembayaranPph25): number => {
      return sum + item.sisa;
    },
    0,
  );

  /* ============================================================
   * RENDER
   * ============================================================ */

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        <Card title="Pembayaran PPh25">
          {/* ==================================================
              HEADER
              ================================================== */}

          <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Daftar pembayaran kewajiban PPh25.
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Pembayaran menggunakan COA Hutang PPh25 dan COA Kas/Bank Detail.
              </p>
            </div>

            <Button onClick={() => router.push("/pajak/pembayaran-pph25/form")}>
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
                <p className="text-xs text-gray-500">COA Hutang PPh25</p>

                <p className="font-semibold">2508 - 21305 Hutang Pajak PPh25</p>

                <p className="mt-1 text-xs text-gray-400">
                  Digunakan sebagai Debit saat pembayaran
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">COA Beban PPh25</p>

                <p className="font-semibold">Tidak digunakan saat pembayaran</p>

                <p className="text-xs text-gray-400">
                  2507 - 62005 Beban Pajak PPh25
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">COA Kas</p>

                <p className="font-semibold">Kas/Bank Detail</p>

                <p className="text-xs text-gray-400">
                  Bukan COA Header 3 - 11100 Kas
                </p>
              </div>
            </div>
          </div>

          {/* ==================================================
              SUMMARY
              ================================================== */}

          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card title="Total Kewajiban">
              <p className="text-2xl font-semibold">
                {formatRupiah(totalKewajiban)}
              </p>

              <p className="mt-1 text-sm text-gray-500">Nilai angsuran PPh25</p>
            </Card>

            <Card title="Total Pembayaran">
              <p className="text-2xl font-semibold">
                {formatRupiah(totalPembayaran)}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                {data.length} transaksi pembayaran
              </p>
            </Card>

            <Card title="Total Sisa">
              <p className="text-2xl font-semibold">
                {formatRupiah(totalSisa)}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Kewajiban yang belum dibayar
              </p>
            </Card>

            <Card title="Status Accounting">
              <p className="text-sm text-gray-600">Jurnal pembayaran:</p>

              <p className="mt-1 font-medium">Dr 2508 Hutang Pajak PPh25</p>

              <p className="font-medium">Cr Kas/Bank Detail</p>
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
              Belum ada data pembayaran PPh25.
            </div>
          ) : (
            /* ==================================================
               TABLE
               ================================================== */

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-3 py-2 text-left">Tanggal</th>

                    <th className="border px-3 py-2 text-left">Periode</th>

                    <th className="border px-3 py-2 text-right">
                      Nilai Angsuran
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
                  {data.map((item: PembayaranPph25) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      {/* ==================================
                             TANGGAL PEMBAYARAN
                             ================================== */}

                      <td className="border px-3 py-2">
                        {formatTanggal(item.tanggal)}
                      </td>

                      {/* ==================================
                             PERIODE PPH25
                             ================================== */}

                      <td className="border px-3 py-2">
                        <div className="font-medium">#{item.id_pph25}</div>

                        <div className="text-xs text-gray-500">
                          {formatBulanTahun(item.bulan, item.tahun)}
                        </div>
                      </td>

                      {/* ==================================
                             NILAI ANGSURAN
                             ================================== */}

                      <td className="border px-3 py-2 text-right">
                        {formatRupiah(item.nilai_angsuran)}
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

                        {item.id_coa_kas === 3 && (
                          <div className="text-xs font-medium text-red-600">
                            COA Header tidak valid
                          </div>
                        )}
                      </td>

                      {/* ==================================
                             KETERANGAN
                             ================================== */}

                      <td className="border px-3 py-2">
                        {item.keterangan || "-"}
                      </td>

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
                              router.push(`/pajak/pembayaran-pph25/${item.id}`)
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

function normalizePembayaranPph25List(value: unknown[]): PembayaranPph25[] {
  return value
    .filter(
      (item: unknown): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map(
      (item: Record<string, unknown>): PembayaranPph25 => ({
        id: Number(item.id),

        tanggal: String(item.tanggal ?? ""),

        id_pph25: Number(item.id_pph25),

        nominal: Number(item.nominal ?? 0),

        keterangan: String(item.keterangan ?? ""),

        id_coa_kas: Number(item.id_coa_kas ?? 0),

        id_jurnal:
          item.id_jurnal === null || item.id_jurnal === undefined
            ? null
            : Number(item.id_jurnal),

        created_at: String(item.created_at ?? ""),

        tahun: Number(item.tahun ?? 0),

        bulan: Number(item.bulan ?? 0),

        nilai_angsuran: Number(item.nilai_angsuran ?? 0),

        tanggal_setor:
          item.tanggal_setor === null || item.tanggal_setor === undefined
            ? null
            : String(item.tanggal_setor),

        tanggal_transaksi: String(item.tanggal_transaksi ?? ""),

        pph25_keterangan:
          item.pph25_keterangan === null || item.pph25_keterangan === undefined
            ? null
            : String(item.pph25_keterangan),

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
      (item: PembayaranPph25): boolean =>
        Number.isInteger(item.id) &&
        item.id > 0 &&
        Number.isInteger(item.id_pph25) &&
        item.id_pph25 > 0 &&
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
 * FORMAT BULAN / TAHUN
 * ============================================================ */

function formatBulanTahun(bulan: number, tahun: number): string {
  if (
    !Number.isInteger(bulan) ||
    bulan < 1 ||
    bulan > 12 ||
    !Number.isInteger(tahun) ||
    tahun <= 0
  ) {
    return "-";
  }

  const namaBulan: string[] = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  return `${namaBulan[bulan - 1]} ${tahun}`;
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
