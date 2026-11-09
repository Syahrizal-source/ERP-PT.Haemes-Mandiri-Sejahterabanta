"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import {
  Pencil,
  Trash2,
  Plus,
  BookOpen,
  Wallet,
} from "lucide-react";

import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

type PembayaranStatus = "UNPAID" | "PARTIAL" | "PAID";

interface CoaPembayaran {
  id_coa: number;
  kode: string;
  nama: string;
  tipe: string;
  aktif: boolean;
  is_cash: boolean;
  is_header: boolean;
}

interface InvoiceSaldo {
  id: number;
  no_invoice: string;
  customer: string;
  nominal: number;
  total_neto: number | null;
  nilai_tagihan: number;
  total_dibayar: number;
  sisa_tagihan: number;
  status: string;
}

interface PembayaranRow {
  id: number;
  tanggal: string;
  id_invoice: number;
  nominal: number;
  ppn?: number | null;
  pph23?: number | null;
  total?: number | null;
  keterangan: string;
  id_jurnal?: number | null;
  id_coa_debit?: number | null;
  created_at?: string;

  coa_debit?: CoaPembayaran | null;
  invoice?: InvoiceSaldo | null;

  status?: PembayaranStatus;
  keterangan_status?: string;
}

/**
 * ============================================================
 * API RESPONSE TYPES
 * ============================================================
 */

interface ApiErrorResponse {
  error?: unknown;
}

interface ApiPaymentListResponse {
  data?: PembayaranRow[];
}

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

function getErrorMessage(
  result: unknown,
  fallback: string,
): string {
  if (
    typeof result === "object" &&
    result !== null &&
    "error" in result
  ) {
    const errorValue = (
      result as ApiErrorResponse
    ).error;

    if (typeof errorValue === "string") {
      return errorValue;
    }
  }

  return fallback;
}

function getMessage(
  result: unknown,
  fallback: string,
): string {
  if (
    typeof result === "object" &&
    result !== null &&
    "message" in result
  ) {
    const messageValue = (
      result as {
        message?: unknown;
      }
    ).message;

    if (typeof messageValue === "string") {
      return messageValue;
    }
  }

  return fallback;
}

/**
 * ============================================================
 * COMPONENT
 * ============================================================
 */

export default function PembayaranInvoicePage() {
  const router = useRouter();

  const { showToast } = useToast();

  const [data, setData] = useState<PembayaranRow[]>([]);

  const [loading, setLoading] =
    useState<boolean>(true);

  const [deleteId, setDeleteId] =
    useState<number | null>(null);

  /**
   * ==========================================================
   * FETCH DATA
   * ==========================================================
   */

  async function fetchData(): Promise<void> {
    try {
      setLoading(true);

      const res = await fetch(
        "/api/pembayaran-invoice",
        {
          cache: "no-store",
        },
      );

      const result: unknown = await res.json();

      if (!res.ok) {
        throw new Error(
          getErrorMessage(
            result,
            "Gagal mengambil data pembayaran invoice",
          ),
        );
      }

      /**
       * API utama diharapkan mengembalikan array.
       *
       * Tetap disiapkan fallback untuk response:
       * { data: [...] }
       */
      if (Array.isArray(result)) {
        setData(result as PembayaranRow[]);
        return;
      }

      if (
        typeof result === "object" &&
        result !== null &&
        "data" in result
      ) {
        const responseData = (
          result as ApiPaymentListResponse
        ).data;

        if (Array.isArray(responseData)) {
          setData(responseData);
          return;
        }
      }

      throw new Error(
        "Format response pembayaran invoice tidak valid",
      );
    } catch (error: unknown) {
      console.error(
        "FETCH PEMBAYARAN INVOICE ERROR:",
        error,
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Gagal mengambil data pembayaran invoice",
        "error",
      );

      setData([]);
    } finally {
      setLoading(false);
    }
  }

  /**
   * ==========================================================
   * INITIAL LOAD
   * ==========================================================
   */

  useEffect(() => {
    void fetchData();
  }, []);

  /**
   * ==========================================================
   * DELETE
   * ==========================================================
   */

  async function handleDelete(
    item: PembayaranRow,
  ): Promise<void> {
    /**
     * Pembayaran yang sudah punya jurnal tidak boleh
     * dihapus langsung.
     *
     * Endpoint juga melakukan validasi yang sama.
     */
    if (item.id_jurnal !== null && item.id_jurnal !== undefined) {
      await Swal.fire({
        icon: "warning",
        title: "Pembayaran Sudah Terposting",
        text:
          "Pembayaran ini sudah terhubung dengan jurnal posted. Gunakan mekanisme reversal/pembatalan jurnal terlebih dahulu.",
        confirmButtonText: "OK",
      });

      return;
    }

    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text:
        "Apakah Anda yakin menghapus Pembayaran Invoice ini?",
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
      setDeleteId(item.id);

      const res = await fetch(
        `/api/pembayaran-invoice/${item.id}`,
        {
          method: "DELETE",
        },
      );

      const result: unknown = await res.json();

      if (!res.ok) {
        throw new Error(
          getErrorMessage(
            result,
            "Gagal menghapus data pembayaran invoice.",
          ),
        );
      }

      const successMessage = getMessage(
        result,
        "Pembayaran invoice berhasil dihapus.",
      );

      await Swal.fire({
        icon: "success",
        title: "Pembayaran Invoice Berhasil",
        text: successMessage,
        confirmButtonText: "OK",
      });

      await fetchData();

      router.refresh();
    } catch (error: unknown) {
      console.error(
        "DELETE PEMBAYARAN INVOICE ERROR:",
        error,
      );

      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text:
          error instanceof Error
            ? error.message
            : "Gagal menghapus data pembayaran invoice",
      });
    } finally {
      setDeleteId(null);
    }
  }

  /**
   * ==========================================================
   * FORMAT RUPIAH
   * ==========================================================
   */

  function formatRupiah(value: number): string {
    return `Rp ${value.toLocaleString("id-ID")}`;
  }

  /**
   * ==========================================================
   * FORMAT DATE
   * ==========================================================
   */

  function formatTanggal(
    value: string,
  ): string {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString(
      "id-ID",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      },
    );
  }

  /**
   * ==========================================================
   * STATUS
   * ==========================================================
   */

  function getPaymentStatus(
    item: PembayaranRow,
  ): PembayaranStatus {
    const invoice = item.invoice;

    if (!invoice) {
      return item.status ?? "UNPAID";
    }

    const nilaiTagihan =
      Number(invoice.nilai_tagihan ?? 0);

    const totalDibayar =
      Number(invoice.total_dibayar ?? 0);

    if (nilaiTagihan <= 0) {
      return "UNPAID";
    }

    if (totalDibayar <= 0) {
      return "UNPAID";
    }

    if (totalDibayar < nilaiTagihan) {
      return "PARTIAL";
    }

    return "PAID";
  }

  function getStatusClass(
    status: PembayaranStatus,
  ): string {
    if (status === "PAID") {
      return "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700";
    }

    if (status === "PARTIAL") {
      return "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-yellow-100 text-yellow-700";
    }

    return "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700";
  }

  function getStatusLabel(
    status: PembayaranStatus,
  ): string {
    if (status === "PAID") {
      return "Lunas";
    }

    if (status === "PARTIAL") {
      return "Sebagian";
    }

    return "Belum Dibayar";
  }

  /**
   * ==========================================================
   * COA DISPLAY
   * ==========================================================
   */

  function getCoaLabel(
    item: PembayaranRow,
  ): string {
    if (item.coa_debit) {
      return `${item.coa_debit.kode} - ${item.coa_debit.nama}`;
    }

    if (item.id_coa_debit !== null &&
        item.id_coa_debit !== undefined) {
      return `COA #${item.id_coa_debit}`;
    }

    return "Belum ditentukan";
  }

  /**
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <>
      <Card
        title="Pembayaran Invoice"
        action={
          <Button
            onClick={() =>
              router.push(
                "/accounting/pembayaran-invoice/form",
              )
            }
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambahkan
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border text-left whitespace-nowrap">
                  Tanggal
                </th>

                <th className="p-2 border text-left whitespace-nowrap">
                  Invoice
                </th>

                <th className="p-2 border text-left min-w-[220px]">
                  Customer
                </th>

                <th className="p-2 border text-left min-w-[240px]">
                  COA Penerimaan
                </th>

                <th className="p-2 border text-right whitespace-nowrap">
                  Nominal
                </th>

                <th className="p-2 border text-right whitespace-nowrap">
                  Total Dibayar
                </th>

                <th className="p-2 border text-right whitespace-nowrap">
                  Sisa Tagihan
                </th>

                <th className="p-2 border text-center whitespace-nowrap">
                  Status
                </th>

                <th className="p-2 border text-center whitespace-nowrap">
                  Jurnal
                </th>

                <th className="p-2 border text-center whitespace-nowrap">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="text-center p-6 text-gray-500"
                  >
                    Memuat data pembayaran...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="text-center p-6 text-gray-500"
                  >
                    Belum ada data pembayaran invoice
                  </td>
                </tr>
              ) : (
                data.map(
                  (item: PembayaranRow) => {
                    const invoice =
                      item.invoice;

                    const status =
                      getPaymentStatus(item);

                    const posted =
                      item.id_jurnal !== null &&
                      item.id_jurnal !== undefined;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50"
                      >
                        {/* TANGGAL */}
                        <td className="p-2 border whitespace-nowrap">
                          {formatTanggal(
                            item.tanggal,
                          )}
                        </td>

                        {/* INVOICE */}
                        <td className="p-2 border">
                          <div className="font-medium">
                            {invoice?.no_invoice ??
                              `Invoice #${item.id_invoice}`}
                          </div>

                          <div className="text-xs text-gray-500">
                            ID: {item.id_invoice}
                          </div>
                        </td>

                        {/* CUSTOMER */}
                        <td className="p-2 border">
                          <div className="font-medium">
                            {invoice?.customer ??
                              "-"}
                          </div>
                        </td>

                        {/* COA */}
                        <td className="p-2 border">
                          <div className="flex items-start gap-2">
                            <Wallet className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />

                            <div>
                              <div className="font-medium">
                                {getCoaLabel(item)}
                              </div>

                              {item.coa_debit && (
                                <div className="text-xs text-gray-500">
                                  Akun penerimaan
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* NOMINAL */}
                        <td className="p-2 border text-right whitespace-nowrap">
                          {formatRupiah(
                            Number(
                              item.nominal ?? 0,
                            ),
                          )}
                        </td>

                        {/* TOTAL DIBAYAR */}
                        <td className="p-2 border text-right whitespace-nowrap">
                          {formatRupiah(
                            Number(
                              invoice?.total_dibayar ??
                                item.total ??
                                item.nominal ??
                                0,
                            ),
                          )}
                        </td>

                        {/* SISA */}
                        <td className="p-2 border text-right whitespace-nowrap">
                          {invoice ? (
                            <span
                              className={
                                invoice.sisa_tagihan > 0
                                  ? "font-medium text-orange-600"
                                  : "font-medium text-green-600"
                              }
                            >
                              {formatRupiah(
                                Number(
                                  invoice.sisa_tagihan ??
                                    0,
                                ),
                              )}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>

                        {/* STATUS */}
                        <td className="p-2 border text-center">
                          <span
                            className={getStatusClass(
                              status,
                            )}
                          >
                            {getStatusLabel(
                              status,
                            )}
                          </span>
                        </td>

                        {/* JURNAL */}
                        <td className="p-2 border text-center">
                          {posted ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700">
                                <BookOpen className="w-3.5 h-3.5" />
                                Posted
                              </span>

                              <span className="text-xs text-gray-500 mt-1">
                                #{item.id_jurnal}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700">
                              Belum Posted
                            </span>
                          )}
                        </td>

                        {/* AKSI */}
                        <td className="p-2 border">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="secondary"
                              disabled={
                                posted ||
                                deleteId === item.id
                              }
                              onClick={() =>
                                router.push(
                                  `/accounting/pembayaran-invoice/${item.id}/edit`,
                                )
                              }
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="destructive"
                              disabled={
                                posted ||
                                deleteId === item.id
                              }
                              onClick={() =>
                                void handleDelete(
                                  item,
                                )
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          {posted && (
                            <div className="text-[11px] text-gray-500 text-center mt-1">
                              Terkunci
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  },
                )
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}