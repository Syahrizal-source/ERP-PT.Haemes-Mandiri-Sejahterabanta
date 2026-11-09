"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Plus, Trash2, X } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface RekeningKoran {
  id: number;
  tanggal: string;
  deskripsi: string;
  debit: number;
  kredit: number;
  saldo: number;
  jenis: string;
}

export default function RekeningKoranPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<RekeningKoran[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedDelete, setSelectedDelete] =
    useState<RekeningKoran | null>(null);

  async function fetchData(): Promise<void> {
    try {
      setLoading(true);

      const res = await fetch("/api/rekening-koran", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        showToast("Gagal mengambil data rekening koran", "error");
        return;
      }

      const result: RekeningKoran[] = await res.json();
      setData(result);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengambil data rekening koran";

      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenDelete(item: RekeningKoran): void {
    if (deletingId !== null) {
      return;
    }

    setSelectedDelete(item);
  }

  function handleCloseDelete(): void {
    if (deletingId !== null) {
      return;
    }

    setSelectedDelete(null);
  }

  async function handleDelete(): Promise<void> {
    if (!selectedDelete) {
      return;
    }

    const id: number = selectedDelete.id;

    try {
      setDeletingId(id);

      const res = await fetch(`/api/rekening-koran/${id}`, {
        method: "DELETE",
      });

      const result: unknown = await res.json();

      if (!res.ok) {
        const errorMessage: string =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Gagal menghapus rekening koran";

        showToast(errorMessage, "error");
        return;
      }

      setSelectedDelete(null);

      showToast("Rekening koran berhasil dihapus", "success");

      await fetchData();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menghapus rekening koran";

      showToast(message, "error");
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    void fetchData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Card title="Rekening Koran">
        <div className="flex justify-end mb-4">
          <Button
            onClick={() =>
              router.push("/accounting/rekening-koran/form")
            }
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Tanggal</th>
                <th className="border p-2">Deskripsi</th>
                <th className="border p-2 text-right">Debit</th>
                <th className="border p-2 text-right">Kredit</th>
                <th className="border p-2 text-right">Saldo</th>
                <th className="border p-2">Jenis</th>
                <th className="border p-2">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="border p-4 text-center text-gray-500"
                  >
                    Memuat data...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="border p-4 text-center text-gray-500"
                  >
                    Belum ada data rekening koran.
                  </td>
                </tr>
              ) : (
                data.map((item: RekeningKoran) => {
                  const isDeleting: boolean = deletingId === item.id;

                  return (
                    <tr key={item.id}>
                      <td className="border p-2">{item.tanggal}</td>

                      <td className="border p-2">
                        {item.deskripsi}
                      </td>

                      <td className="border p-2 text-right">
                        {item.debit > 0
                          ? item.debit.toLocaleString("id-ID")
                          : "-"}
                      </td>

                      <td className="border p-2 text-right">
                        {item.kredit > 0
                          ? item.kredit.toLocaleString("id-ID")
                          : "-"}
                      </td>

                      <td className="border p-2 text-right font-semibold">
                        {item.saldo.toLocaleString("id-ID")}
                      </td>

                      <td className="border p-2">{item.jenis}</td>

                      <td className="border p-2">
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() =>
                              router.push(
                                `/accounting/rekening-koran/${item.id}`,
                              )
                            }
                            disabled={isDeleting}
                          >
                            Detail
                          </Button>

                          <Button
                            onClick={() => handleOpenDelete(item)}
                            disabled={deletingId !== null}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL KONFIRMASI HAPUS */}
      {selectedDelete !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseDelete();
            }
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Hapus Rekening Koran
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Konfirmasi penghapusan transaksi
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseDelete}
                disabled={deletingId !== null}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              <div className="rounded-lg border bg-gray-50 p-4">
                <div className="grid grid-cols-[100px_1fr] gap-y-3 text-sm">
                  <span className="text-gray-500">Tanggal</span>
                  <span className="font-medium text-gray-900">
                    {selectedDelete.tanggal}
                  </span>

                  <span className="text-gray-500">Deskripsi</span>
                  <span className="font-medium text-gray-900">
                    {selectedDelete.deskripsi}
                  </span>

                  <span className="text-gray-500">Jenis</span>
                  <span className="font-medium text-gray-900">
                    {selectedDelete.jenis}
                  </span>

                  <span className="text-gray-500">Debit</span>
                  <span className="text-right font-medium text-gray-900">
                    {selectedDelete.debit > 0
                      ? selectedDelete.debit.toLocaleString("id-ID")
                      : "-"}
                  </span>

                  <span className="text-gray-500">Kredit</span>
                  <span className="text-right font-medium text-gray-900">
                    {selectedDelete.kredit > 0
                      ? selectedDelete.kredit.toLocaleString("id-ID")
                      : "-"}
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-700">
                  Apakah Anda yakin ingin menghapus transaksi ini?
                </p>
                <p className="mt-1 text-xs text-red-600">
                  Data jurnal terkait juga akan diproses oleh sistem.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <Button
                onClick={handleCloseDelete}
                disabled={deletingId !== null}
              >
                Batal
              </Button>

              <Button
                onClick={() => void handleDelete()}
                disabled={deletingId !== null}
              >
                <Trash2 className="w-4 h-4 mr-2" />

                {deletingId === selectedDelete.id
                  ? "Menghapus..."
                  : "Ya, Hapus"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}