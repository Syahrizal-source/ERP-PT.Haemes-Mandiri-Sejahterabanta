"use client";

import { JSX, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Eye, Pencil, Trash2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";
import type { ProyekMaster } from "@/types/proyek";

interface DeleteResponse {
  error?: string;
  message?: string;
}

interface ProyekListResponse {
  data?: ProyekMaster[];
  error?: string;
}

export default function ProyekListPage(): JSX.Element {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<ProyekMaster[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  /* =========================================================
     FORMAT RUPIAH
  ========================================================= */

  function formatRupiah(value: number | string | null): string {
    const nominal: number = Number(value ?? 0);

    if (!Number.isFinite(nominal)) {
      return "Rp0";
    }

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(nominal);
  }

  /* =========================================================
     NORMALIZE RESPONSE
     
     API existing bisa mengembalikan:
     
     1. array langsung
     2. { data: [...] }
     
     Kita dukung keduanya tanpa mengubah backend.
  ========================================================= */

  function parseProyekResponse(result: unknown): ProyekMaster[] {
    if (Array.isArray(result)) {
      return result as ProyekMaster[];
    }

    if (typeof result === "object" && result !== null && "data" in result) {
      const response: ProyekListResponse = result as ProyekListResponse;

      if (Array.isArray(response.data)) {
        return response.data;
      }
    }

    return [];
  }

  /* =========================================================
     GET DATA
  ========================================================= */

  async function fetchData(): Promise<void> {
    setLoading(true);

    try {
      const res: Response = await fetch("/api/proyek/master", {
        method: "GET",
        cache: "no-store",
      });

      const result: unknown = await res.json();

      if (!res.ok) {
        const response: ProyekListResponse =
          typeof result === "object" && result !== null
            ? (result as ProyekListResponse)
            : {};

        showToast(response.error ?? "Gagal mengambil data proyek", "error");

        return;
      }

      const projects: ProyekMaster[] = parseProyekResponse(result);

      setData(projects);
    } catch (error: unknown) {
      console.error("GET PROYEK MASTER ERROR:", error);

      showToast(
        error instanceof Error ? error.message : "Gagal mengambil data proyek",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
  }, []);

  /* =========================================================
     DELETE
     
     Catatan:
     DELETE tetap melalui API.
     Halaman tidak menyentuh jurnal/COA secara langsung.
  ========================================================= */

  async function handleDelete(): Promise<void> {
    if (deleteId === null) {
      return;
    }

    const id: string = deleteId;

    setLoadingId(id);

    try {
      const res: Response = await fetch(`/api/proyek/master/${id}`, {
        method: "DELETE",
      });

      const result: unknown = await res.json();

      if (!res.ok) {
        const response: DeleteResponse =
          typeof result === "object" && result !== null
            ? (result as DeleteResponse)
            : {};

        showToast(response.error ?? "Gagal menghapus proyek", "error");

        return;
      }

      showToast("Proyek berhasil dihapus", "success");

      setDeleteId(null);

      await fetchData();
    } catch (error: unknown) {
      console.error("DELETE PROYEK MASTER ERROR:", error);

      showToast(
        error instanceof Error ? error.message : "Gagal menghapus proyek",
        "error",
      );
    } finally {
      setLoadingId(null);
    }
  }

  /* =========================================================
     STATUS DISPLAY
  ========================================================= */

  function formatStatus(status: ProyekMaster["status"]): string {
    if (!status) {
      return "-";
    }

    return String(status)
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (character: string) => character.toUpperCase());
  }

  return (
    <>
      <div className="mx-auto max-w-7xl">
        <Card title="Daftar Proyek">
          {/* =================================================
              HEADER
          ================================================= */}

          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Master proyek perusahaan</p>
            </div>

            <Button onClick={() => router.push("/proyek/form")}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Proyek
            </Button>
          </div>

          {/* =================================================
              LOADING
          ================================================= */}

          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat data proyek...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-3 py-2 text-left">Kode</th>

                    <th className="border px-3 py-2 text-left">Nama</th>

                    <th className="border px-3 py-2 text-left">Jenis Proyek</th>

                    <th className="border px-3 py-2 text-left">Customer</th>

                    <th className="border px-3 py-2 text-right">
                      Nilai Kontrak
                    </th>

                    <th className="border px-3 py-2 text-left">Status</th>

                    <th className="border px-3 py-2 text-center">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="border px-3 py-6 text-center text-gray-500"
                      >
                        Tidak ada data proyek
                      </td>
                    </tr>
                  ) : (
                    data.map((item: ProyekMaster) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        {/* KODE */}
                        <td className="border px-3 py-2 font-medium">
                          {item.kode_proyek}
                        </td>

                        {/* NAMA */}
                        <td className="border px-3 py-2">{item.nama_proyek}</td>

                        {/* JENIS */}
                        <td className="border px-3 py-2">
                          {item.jenis_proyek ?? "-"}
                        </td>

                        {/* CUSTOMER */}
                        <td className="border px-3 py-2">{item.customer}</td>

                        {/* NILAI KONTRAK */}
                        <td className="border px-3 py-2 text-right">
                          {formatRupiah(item.nilai_kontrak)}
                        </td>

                        {/* STATUS */}
                        <td className="border px-3 py-2">
                          {formatStatus(item.status)}
                        </td>

                        {/* AKSI */}
                        <td className="border px-3 py-2">
                          <div className="flex justify-center gap-2">
                            {/* DETAIL */}
                            <Button
                              variant="secondary"
                              onClick={() => router.push(`/proyek/${item.id}`)}
                              title="Detail proyek"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {/* UPDATE */}
                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(`/proyek/${item.id}/edit`)
                              }
                              title="Edit proyek"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            {/* DELETE */}
                            <Button
                              variant="destructive"
                              disabled={loadingId === item.id}
                              onClick={() => setDeleteId(item.id)}
                              title="Hapus proyek"
                            >
                              {loadingId === item.id ? (
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
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* =====================================================
          CONFIRM DELETE
      ===================================================== */}

      <ConfirmModal
        open={deleteId !== null}
        title="Konfirmasi Hapus"
        description="Apakah Anda yakin ingin menghapus proyek ini?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}
