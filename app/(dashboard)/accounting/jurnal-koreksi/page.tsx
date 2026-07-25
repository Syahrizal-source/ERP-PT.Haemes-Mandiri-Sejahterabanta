"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";

import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import { useToast } from "@/components/ui/toast-context";

/* =========================
   TYPES
========================= */

interface JurnalKoreksiItem {
  id: number;

  id_jurnal_asal: number;

  id_jurnal_koreksi: number;

  alasan: string;

  created_at: string;
}

/* =========================
   PAGE
========================= */

export default function JurnalKoreksiPage() {
  const router =
    useRouter();

  const { showToast } =
    useToast();

  const [
    data,
    setData,
  ] = useState<
    JurnalKoreksiItem[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState<boolean>(
    true,
  );

  /* =========================
     FETCH DATA
  ========================= */

  async function fetchData(): Promise<void> {
    try {
      setLoading(true);

      const res =
        await fetch(
          "/api/jurnal-koreksi",
        );

      if (!res.ok) {
        showToast(
          "Gagal mengambil data jurnal koreksi",
          "error",
        );

        setLoading(false);

        return;
      }

      const result:
        JurnalKoreksiItem[] =
        await res.json();

      setData(result);
    } catch (
    error: unknown
    ) {
      console.error(
        "FETCH JURNAL KOREKSI ERROR:",
        error,
      );

      showToast(
        "Terjadi kesalahan",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     LOAD
  ========================= */

  useEffect(() => {
    void fetchData();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     DELETE
  ========================= */

  async function handleDelete(
    id: number,
  ): Promise<void> {
    const confirm =
      await Swal.fire({
        title:
          "Konfirmasi Hapus",

        text:
          "Yakin ingin menghapus jurnal koreksi ini?",

        icon: "warning",

        showCancelButton:
          true,

        confirmButtonText:
          "Ya, Hapus",

        cancelButtonText:
          "Batal",
      });

    if (
      !confirm.isConfirmed
    ) {
      return;
    }

    try {
      const res =
        await fetch(
          `/api/jurnal-koreksi/${id}`,
          {
            method:
              "DELETE",
          },
        );

      if (!res.ok) {
        const err =
          (await res.json()) as {
            error?: string;
          };

        Swal.fire(
          "Gagal",
          err.error ??
          "Gagal menghapus jurnal koreksi",
          "error",
        );

        return;
      }

      Swal.fire(
        "Berhasil",
        "Jurnal koreksi berhasil dihapus",
        "success",
      );

      await fetchData();
    } catch (
    error: unknown
    ) {
      console.error(
        "DELETE JURNAL KOREKSI ERROR:",
        error,
      );

      Swal.fire(
        "Error",
        "Terjadi kesalahan sistem",
        "error",
      );
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Card title="Jurnal Koreksi">
        {/* =========================
            ACTION
        ========================= */}
        <div className="flex justify-end mb-4">
          <Button
            onClick={() =>
              router.push(
                "/accounting/jurnal-koreksi/form",
              )
            }
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Koreksi
          </Button>
        </div>

        {/* =========================
            TABLE
        ========================= */}
        {loading ? (
          <div className="flex gap-2 items-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            Memuat data...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-3 py-2">
                    ID
                  </th>

                  <th className="border px-3 py-2">
                    Jurnal Asal
                  </th>

                  <th className="border px-3 py-2">
                    Jurnal Koreksi
                  </th>

                  <th className="border px-3 py-2">
                    Alasan
                  </th>

                  <th className="border px-3 py-2">
                    Tanggal
                  </th>

                  <th className="border px-3 py-2 text-center">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-4"
                    >
                      Tidak ada data
                    </td>
                  </tr>
                ) : (
                  data.map(
                    (
                      item,
                    ) => (
                      <tr
                        key={
                          item.id
                        }
                      >
                        <td className="border px-3 py-2">
                          {
                            item.id
                          }
                        </td>

                        <td className="border px-3 py-2">
                          {
                            item.id_jurnal_asal
                          }
                        </td>

                        <td className="border px-3 py-2">
                          {
                            item.id_jurnal_koreksi
                          }
                        </td>

                        <td className="border px-3 py-2">
                          {
                            item.alasan
                          }
                        </td>

                        <td className="border px-3 py-2">
                          {new Date(
                            item.created_at,
                          ).toLocaleDateString(
                            "id-ID",
                          )}
                        </td>

                        <td className="border px-3 py-2">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(
                                  `/accounting/jurnal-koreksi/${item.id}`,
                                )
                              }
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="destructive"
                              onClick={() =>
                                void handleDelete(
                                  item.id,
                                )
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}