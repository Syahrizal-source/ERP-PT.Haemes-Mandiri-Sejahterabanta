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

interface PembayaranHutang {
  id: number;
  tanggal: string;
  id_hutang: number;
  nominal: number;
  total: number;
  keterangan: string;
}

/* ============================================================
 * PAGE
 * ============================================================ */

export default function Page(): React.JSX.Element {
  const router = useRouter();

  const { showToast } = useToast();

  const [data, setData] = useState<PembayaranHutang[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  async function fetchData(): Promise<void> {
    try {
      setLoading(true);

      const res = await fetch("/api/pembayaran-hutang", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        showToast("Gagal mengambil data", "error");

        return;
      }

      const result: unknown = await res.json();

      if (!Array.isArray(result)) {
        showToast("Format data pembayaran hutang tidak valid", "error");

        return;
      }

      const normalizedData: PembayaranHutang[] =
        normalizePembayaranHutangList(result);

      setData(normalizedData);
    } catch (error: unknown) {
      console.error("FETCH PEMBAYARAN HUTANG ERROR:", error);

      showToast(
        error instanceof Error ? error.message : "Gagal mengambil data",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchData();
  }, []);

  /* ============================================================
   * DELETE
   * ============================================================ */

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Pembayaran Hutang ini?",
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
      const res = await fetch(`/api/pembayaran-hutang/${id}`, {
        method: "DELETE",
      });

      const result: unknown = await readJsonSafely(res);

      if (!res.ok) {
        throw new Error(
          getErrorMessage(result, "Gagal menghapus pembayaran hutang"),
        );
      }

      await Swal.fire(
        "Berhasil",
        "Data pembayaran hutang berhasil dihapus",
        "success",
      );

      await fetchData();
    } catch (error: unknown) {
      console.error("DELETE PEMBAYARAN HUTANG ERROR:", error);

      await Swal.fire(
        "Gagal",
        error instanceof Error
          ? error.message
          : "Gagal menghapus pembayaran hutang",
        "error",
      );
    }
  }

  /* ============================================================
   * RENDER
   * ============================================================ */

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <Card title="Pembayaran Hutang">
          {/* ==================================================
              TAMBAH
              ================================================== */}

          <div className="flex justify-end mb-4">
            <Button
              onClick={() => router.push("/accounting/pembayaran-hutang/form")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah
            </Button>
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
              Belum ada data pembayaran hutang.
            </div>
          ) : (
            /* ==================================================
               TABLE
               ================================================== */

            <div className="overflow-x-auto">
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-3 py-2">Tanggal</th>

                    <th className="border px-3 py-2">Nominal</th>

                    <th className="border px-3 py-2">Total</th>

                    <th className="border px-3 py-2">Keterangan</th>

                    <th className="border px-3 py-2">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {data.map((item: PembayaranHutang) => (
                    <tr key={item.id}>
                      {/* ==================================
                            TANGGAL
                            ================================== */}

                      <td className="border px-3 py-2">{item.tanggal}</td>

                      {/* ==================================
                            NOMINAL
                            ================================== */}

                      <td className="border px-3 py-2 text-right">
                        {formatRupiah(item.nominal)}
                      </td>

                      {/* ==================================
                            TOTAL
                            ================================== */}

                      <td className="border px-3 py-2 text-right font-semibold">
                        {formatRupiah(item.total)}
                      </td>

                      {/* ==================================
                            KETERANGAN
                            ================================== */}

                      <td className="border px-3 py-2">{item.keterangan}</td>

                      {/* ==================================
                            AKSI
                            ================================== */}

                      <td className="border px-3 py-2">
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant="secondary"
                            onClick={() =>
                              router.push(
                                `/accounting/pembayaran-hutang/${item.id}`,
                              )
                            }
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="destructive"
                            onClick={() => void handleDelete(item.id)}
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
 * NORMALIZE DATA
 * ============================================================ */

function normalizePembayaranHutangList(value: unknown[]): PembayaranHutang[] {
  return value
    .filter(
      (item: unknown): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map(
      (item: Record<string, unknown>): PembayaranHutang => ({
        id: Number(item.id),

        tanggal: String(item.tanggal ?? ""),

        id_hutang: Number(item.id_hutang),

        nominal: Number(item.nominal ?? 0),

        total: Number(item.total ?? 0),

        keterangan: String(item.keterangan ?? ""),
      }),
    )
    .filter(
      (item: PembayaranHutang): boolean =>
        Number.isInteger(item.id) &&
        item.id > 0 &&
        Number.isInteger(item.id_hutang) &&
        item.id_hutang > 0,
    );
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
