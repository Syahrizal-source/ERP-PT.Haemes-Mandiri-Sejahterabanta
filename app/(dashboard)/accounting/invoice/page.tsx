"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Plus, Pencil, Trash2, Eye, Loader2 } from "lucide-react";

import Swal from "sweetalert2";

import Card from "@/components/ui/Card";

import Button from "@/components/ui/Button";

import { useToast } from "@/components/ui/toast-context";

/* =========================================================
   TYPES
========================================================= */

type InvoiceStatus =
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";

interface InvoiceItem {
  id: number;

  tanggal: string;

  no_invoice: string;

  customer: string;

  nominal: number;

  status: InvoiceStatus;

  created_at: string;

  tanggal_jatuh_tempo: string | null;

  is_reminded: boolean;

  id_proyek: string | null;

  nilai_kontrak: number | null;

  persentase_termin: number | null;

  nilai_tagihan_termin: number | null;

  potongan_uang_muka: number;

  retensi_persen: number | null;

  potongan_retensi: number;

  subtotal_tagihan: number | null;

  ppn_persen: number | null;

  ppn_nilai: number | null;

  total_neto: number | null;
}

/* =========================================================
   HELPERS
========================================================= */

function formatRupiah(value: number | null): string {
  return Number(value ?? 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });
}

function formatPersen(value: number | null): string {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${Number(value).toLocaleString("id-ID", {
    maximumFractionDigits: 2,
  })}%`;
}

function getStatusClass(status: InvoiceStatus): string {
  if (status === "Paid (Pembayaran Penuh/ Lunas)") {
    return "bg-green-100 text-green-700";
  }

  if (status === "Partial (Pembayaran Sebagian)") {
    return "bg-yellow-100 text-yellow-700";
  }

  return "bg-red-100 text-red-700";
}

/* =========================================================
   PAGE
========================================================= */

export default function InvoicePage() {
  const router = useRouter();

  const { showToast } = useToast();

  const [data, setData] = useState<InvoiceItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  const [loadingId, setLoadingId] = useState<number | null>(null);

  /* =======================================================
     GET DATA
  ======================================================= */

  async function fetchData(): Promise<void> {
    try {
      setLoading(true);

      const res = await fetch("/api/invoice", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        showToast("Gagal mengambil data invoice", "error");

        return;
      }

      const result: InvoiceItem[] = await res.json();

      setData(result);
    } catch (error: unknown) {
      console.error("FETCH INVOICE ERROR:", error);

      showToast("Gagal mengambil data invoice", "error");
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
  }, []);

  /* =======================================================
     DELETE
  ======================================================= */

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Invoice ini?",
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
      setLoadingId(id);

      const res = await fetch(`/api/invoice/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const result: unknown = await res.json().catch(() => null);

        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Gagal menghapus invoice.";

        await Swal.fire("Gagal", message, "error");

        return;
      }

      await Swal.fire("Berhasil", "Data invoice berhasil dihapus.", "success");

      await fetchData();
    } catch (error: unknown) {
      console.error("DELETE INVOICE ERROR:", error);

      await Swal.fire(
        "Gagal",
        "Terjadi kesalahan saat menghapus invoice.",
        "error",
      );
    } finally {
      setLoadingId(null);
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="max-w-[1600px] mx-auto">
      <Card title="Invoice Proyek">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-sm font-semibold">Daftar Invoice Proyek</h2>

            <p className="text-xs text-gray-500 mt-1">
              Invoice terhubung dengan Master Proyek dan Customer/Vendor.
            </p>
          </div>

          <Button onClick={() => router.push("/accounting/invoice/form")}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Invoice
          </Button>
        </div>

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (
          <div className="flex items-center gap-2 py-6">
            <Loader2 className="w-4 h-4 animate-spin" />

            <span className="text-sm">Memuat data invoice...</span>
          </div>
        ) : (
          /* ===============================================
             TABLE
          =============================================== */

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border whitespace-nowrap">Tanggal</th>

                  <th className="p-2 border whitespace-nowrap">No Invoice</th>

                  <th className="p-2 border min-w-[180px]">Proyek</th>

                  <th className="p-2 border min-w-[180px]">
                    Customer / Vendor
                  </th>

                  <th className="p-2 border text-right whitespace-nowrap">
                    Nilai Kontrak
                  </th>

                  <th className="p-2 border text-right whitespace-nowrap">
                    Termin
                  </th>

                  <th className="p-2 border text-right whitespace-nowrap">
                    Subtotal
                  </th>

                  <th className="p-2 border text-right whitespace-nowrap">
                    PPN
                  </th>

                  <th className="p-2 border text-right whitespace-nowrap">
                    Total Netto
                  </th>

                  <th className="p-2 border whitespace-nowrap">Status</th>

                  <th className="p-2 border whitespace-nowrap">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-gray-500">
                      Tidak ada data invoice.
                    </td>
                  </tr>
                ) : (
                  data.map((item: InvoiceItem) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      {/* TANGGAL */}

                      <td className="p-2 border whitespace-nowrap">
                        {item.tanggal}
                      </td>

                      {/* NO INVOICE */}

                      <td className="p-2 border font-medium whitespace-nowrap">
                        {item.no_invoice}
                      </td>

                      {/* PROYEK */}

                      <td className="p-2 border">
                        {item.id_proyek ? (
                          <button
                            type="button"
                            className="text-left text-blue-600 hover:underline"
                            onClick={() =>
                              router.push(`/proyek/master/${item.id_proyek}`)
                            }
                          >
                            {item.id_proyek}
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* CUSTOMER / VENDOR */}

                      <td className="p-2 border">{item.customer || "-"}</td>

                      {/* NILAI KONTRAK */}

                      <td className="p-2 border text-right whitespace-nowrap">
                        {formatRupiah(item.nilai_kontrak)}
                      </td>

                      {/* TERMIN */}

                      <td className="p-2 border text-right whitespace-nowrap">
                        {formatPersen(item.persentase_termin)}
                      </td>

                      {/* SUBTOTAL */}

                      <td className="p-2 border text-right whitespace-nowrap">
                        {formatRupiah(item.subtotal_tagihan)}
                      </td>

                      {/* PPN */}

                      <td className="p-2 border text-right whitespace-nowrap">
                        <div>{formatRupiah(item.ppn_nilai)}</div>

                        {item.ppn_persen !== null && (
                          <div className="text-xs text-gray-500">
                            {formatPersen(item.ppn_persen)}
                          </div>
                        )}
                      </td>

                      {/* TOTAL NETTO */}

                      <td className="p-2 border text-right font-semibold whitespace-nowrap">
                        {formatRupiah(item.total_neto ?? item.nominal)}
                      </td>

                      {/* STATUS */}

                      <td className="p-2 border whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusClass(
                            item.status,
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* AKSI */}

                      <td className="p-2 border">
                        <div className="flex gap-2">
                          {/* DETAIL */}

                          <Button
                            variant="secondary"
                            onClick={() =>
                              router.push(`/accounting/invoice/${item.id}`)
                            }
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {/* EDIT */}

                          <Button
                            variant="secondary"
                            onClick={() =>
                              router.push(`/accounting/invoice/${item.id}/edit`)
                            }
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>

                          {/* DELETE */}

                          <Button
                            variant="destructive"
                            onClick={() => void handleDelete(item.id)}
                            disabled={loadingId === item.id}
                          >
                            {loadingId === item.id ? (
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
          </div>
        )}
      </Card>
    </div>
  );
}
