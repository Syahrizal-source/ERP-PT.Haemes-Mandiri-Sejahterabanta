"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";

import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import { useToast } from "@/components/ui/toast-context";

/* ============================================================
 * TYPE
 * ============================================================ */

interface PembayaranPpn {
  id: number;
  tanggal: string;
  id_ppn: number;
  nominal: number;
  keterangan: string;
  id_coa_kas: number;
  id_jurnal: number | null;
  created_at: string;

  nilai_transaksi: number;
  tarif_ppn: number;
  nilai_ppn: number;
  jenis_ppn: "masukan" | "keluaran";

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

  const [data, setData] = useState<PembayaranPpn[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  /* ============================================================
   * FETCH DATA
   * ============================================================ */

  async function fetchData(): Promise<void> {
    try {
      setLoading(true);

      const res = await fetch("/api/pembayaran-ppn", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const result: unknown = await readJsonSafely(res);

        showToast(
          getErrorMessage(result, "Gagal mengambil data pembayaran PPN"),
          "error",
        );

        return;
      }

      const result: unknown = await readJsonSafely(res);

      if (!Array.isArray(result)) {
        showToast("Format data pembayaran PPN tidak valid", "error");

        return;
      }

      const normalizedData: PembayaranPpn[] =
        normalizePembayaranPpnList(result);

      setData(normalizedData);
    } catch (error: unknown) {
      console.error("FETCH PEMBAYARAN PPN ERROR:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Gagal mengambil data pembayaran PPN",
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
      text: "Apakah Anda yakin menghapus pembayaran PPN ini?",
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
      const res = await fetch(`/api/pembayaran-ppn/${id}`, {
        method: "DELETE",
      });

      const result: unknown = await readJsonSafely(res);

      if (!res.ok) {
        throw new Error(
          getErrorMessage(result, "Gagal menghapus pembayaran PPN"),
        );
      }

      await Swal.fire(
        "Berhasil",
        "Data pembayaran PPN berhasil dihapus",
        "success",
      );

      await fetchData();
    } catch (error: unknown) {
      console.error("DELETE PEMBAYARAN PPN ERROR:", error);

      await Swal.fire(
        "Gagal",
        error instanceof Error
          ? error.message
          : "Gagal menghapus pembayaran PPN",
        "error",
      );
    }
  }

  /* ============================================================
   * TOTAL
   * ============================================================ */

  const totalPembayaran: number = data.reduce(
    (sum: number, item: PembayaranPpn): number => {
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
        <Card title="Pembayaran PPN">
          {/* ==================================================
              HEADER
              ================================================== */}

          <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Daftar pembayaran kewajiban PPN.
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Pembayaran menggunakan COA Hutang PPN dan COA Kas/Bank Detail.
              </p>
            </div>

            <Button onClick={() => router.push("/pajak/pembayaran-ppn/form")}>
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
                <p className="text-xs text-gray-500">COA Hutang PPN</p>

                <p className="font-semibold">53 - 21301 Hutang Pajak PPN</p>

                <p className="text-xs text-gray-400">
                  Ditentukan backend melalui mapping PPN / HUTANG.
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">COA PPN Masukan</p>

                <p className="font-semibold">2380 - 12020 PPN Masukan</p>

                <p className="text-xs text-gray-400">
                  Bukan COA pembayaran hutang PPN.
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">COA Kas/Bank</p>

                <p className="font-semibold">Kas/Bank Detail</p>

                <p className="text-xs text-gray-400">
                  COA 3 - 11100 Kas adalah HEADER dan tidak boleh diposting.
                </p>
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

              <p className="mt-1 font-medium">Dr 2504 Hutang Pajak PPN</p>

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
              Belum ada data pembayaran PPN.
            </div>
          ) : (
            /* ==================================================
               TABLE
               ================================================== */

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[1180px] border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border-b px-4 py-3 text-left font-semibold">
                      Tanggal
                    </th>
                    <th className="border-b px-4 py-3 text-center font-semibold">
                      ID PPN
                    </th>
                    <th className="border-b px-4 py-3 text-center font-semibold">
                      Jenis PPN
                    </th>
                    <th className="border-b px-4 py-3 text-right font-semibold">
                      Terutang
                    </th>
                    <th className="border-b px-4 py-3 text-right font-semibold">
                      Pembayaran
                    </th>
                    <th className="border-b px-4 py-3 text-right font-semibold">
                      Sisa
                    </th>
                    <th className="border-b px-4 py-3 text-left font-semibold">
                      COA Kas/Bank
                    </th>
                    <th className="border-b px-4 py-3 text-left font-semibold">
                      Keterangan
                    </th>
                    <th className="border-b px-4 py-3 text-center font-semibold">
                      Status
                    </th>
                    <th className="border-b px-4 py-3 text-center font-semibold">
                      Jurnal
                    </th>
                    <th className="border-b px-4 py-3 text-center font-semibold">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data.map((item: PembayaranPpn) => (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="border-b px-4 py-3 whitespace-nowrap">
                        {formatTanggal(item.tanggal)}
                      </td>

                      <td className="border-b px-4 py-3 text-center font-medium">
                        #{item.id_ppn}
                      </td>

                      <td className="border-b px-4 py-3 text-center">
                        <span className="inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold uppercase">
                          {item.jenis_ppn}
                        </span>
                      </td>

                      <td className="border-b px-4 py-3 text-right font-semibold whitespace-nowrap">
                        {formatRupiah(item.nilai_ppn)}
                      </td>

                      <td className="border-b px-4 py-3 text-right font-semibold whitespace-nowrap">
                        {formatRupiah(item.nominal)}
                      </td>

                      <td className="border-b px-4 py-3 text-right font-semibold whitespace-nowrap">
                        {formatRupiah(item.sisa)}
                      </td>

                      <td className="border-b px-4 py-3">
                        <div className="font-medium whitespace-nowrap">
                          ID COA {item.id_coa_kas}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-500">
                          Kas/Bank Detail
                        </div>
                      </td>

                      <td
                        className="border-b px-4 py-3"
                        title={item.keterangan}
                      >
                        <div className="max-w-[220px] truncate">
                          {item.keterangan || "-"}
                        </div>
                      </td>

                      <td className="border-b px-4 py-3 text-center">
                        <StatusBadge
                          status={item.status}
                          label={item.status_label}
                        />
                      </td>

                      <td className="border-b px-4 py-3 text-center whitespace-nowrap">
                        {item.id_jurnal !== null ? (
                          <span className="font-semibold">
                            #{item.id_jurnal}
                          </span>
                        ) : (
                          <span className="text-gray-400">Belum</span>
                        )}
                      </td>

                      <td className="border-b px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="secondary"
                            type="button"
                            onClick={() =>
                              router.push(`/pajak/pembayaran-ppn/${item.id}`)
                            }
                            title={
                              item.id_jurnal !== null
                                ? "Lihat pembayaran"
                                : "Edit pembayaran"
                            }
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">
                              {item.id_jurnal !== null ? "Lihat" : "Edit"}
                            </span>
                          </Button>

                          <Button
                            variant="destructive"
                            type="button"
                            onClick={() => void handleDelete(item.id)}
                            disabled={item.id_jurnal !== null}
                            title={
                              item.id_jurnal !== null
                                ? "Tidak dapat dihapus karena sudah memiliki jurnal"
                                : "Hapus pembayaran"
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Hapus</span>
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

function normalizePembayaranPpnList(value: unknown[]): PembayaranPpn[] {
  return value
    .filter(
      (item: unknown): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map(
      (item: Record<string, unknown>): PembayaranPpn => ({
        id: Number(item.id),
        tanggal: String(item.tanggal ?? ""),
        id_ppn: Number(item.id_ppn),
        nominal: Number(item.nominal ?? 0),
        keterangan: String(item.keterangan ?? ""),
        id_coa_kas: Number(item.id_coa_kas ?? 0),
        id_jurnal:
          item.id_jurnal === null || item.id_jurnal === undefined
            ? null
            : Number(item.id_jurnal),
        created_at: String(item.created_at ?? ""),
        nilai_transaksi: Number(item.nilai_transaksi ?? 0),
        tarif_ppn: Number(item.tarif_ppn ?? 0),
        nilai_ppn: Number(item.nilai_ppn ?? 0),
        jenis_ppn: item.jenis_ppn === "masukan" ? "masukan" : "keluaran",
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
      (item: PembayaranPpn): boolean =>
        Number.isInteger(item.id) &&
        item.id > 0 &&
        Number.isInteger(item.id_ppn) &&
        item.id_ppn > 0 &&
        Number.isInteger(item.id_coa_kas) &&
        item.id_coa_kas > 0 &&
        Number.isFinite(item.nilai_ppn) &&
        item.nilai_ppn >= 0,
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
