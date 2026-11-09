"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Plus, Eye, Pencil, Trash2, Loader2 } from "lucide-react";

import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Vendor {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
  kategori_vendor: string | null;
  npwp: string | null;
  telepon: string | null;
  email: string | null;
  status: boolean | null;
  pkp: boolean | null;
  jenis_pajak: string | null;
  id_coa: number | null;
  kode_coa: string | null;
  nama_coa: string | null;
}

export default function VendorsPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  async function fetchData(): Promise<void> {
    try {
      setLoading(true);

      const res = await fetch("/api/vendors", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        showToast("Gagal mengambil data vendor", "error");
        setData([]);
        return;
      }

      const vendors: Vendor[] = await res.json();

      setData(vendors);
    } catch (error: unknown) {
      console.error("FETCH VENDORS ERROR:", error);

      showToast(
        error instanceof Error ? error.message : "Gagal mengambil data vendor",
        "error",
      );

      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: number): Promise<void> {
    const vendor = data.find((item) => item.id === id);

    if (vendor === undefined) {
      showToast("Vendor tidak ditemukan", "error");
      return;
    }

    const confirm = await Swal.fire({
      title: "Nonaktifkan Vendor?",
      text: `Vendor "${vendor.nama_vendor}" akan dinonaktifkan dan tetap disimpan untuk menjaga histori transaksi.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Nonaktifkan",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) {
      return;
    }

    try {
      setLoadingId(id);

      const res = await fetch(`/api/vendors/${id}`, {
        method: "DELETE",
      });

      const result: {
        success?: boolean;
        message?: string;
        error?: string;
      } = await res.json();

      if (!res.ok) {
        Swal.fire(
          "Gagal",
          result.error ?? "Gagal menonaktifkan vendor",
          "error",
        );
        return;
      }

      await Swal.fire(
        "Berhasil",
        result.message ?? "Vendor berhasil dinonaktifkan",
        "success",
      );

      await fetchData();
    } catch (error: unknown) {
      console.error("DELETE VENDOR ERROR:", error);

      Swal.fire(
        "Gagal",
        error instanceof Error ? error.message : "Gagal menonaktifkan vendor",
        "error",
      );
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <Card title="Vendor">
          <div className="flex justify-between mb-4">
            <div />

            <Button onClick={() => router.push("/vendors/form")}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Vendor
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              Memuat data vendor...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-3 py-2 text-left">Kode</th>

                    <th className="border px-3 py-2 text-left">Nama Vendor</th>

                    <th className="border px-3 py-2 text-left">Kategori</th>

                    <th className="border px-3 py-2 text-left">NPWP</th>

                    <th className="border px-3 py-2 text-left">Telepon</th>

                    <th className="border px-3 py-2 text-left">Email</th>

                    <th className="border px-3 py-2 text-left">COA</th>

                    <th className="border px-3 py-2 text-center">PKP</th>

                    <th className="border px-3 py-2 text-center">Status</th>

                    <th className="border px-3 py-2 text-center">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="border px-3 py-6 text-center">
                        Tidak ada data vendor
                      </td>
                    </tr>
                  ) : (
                    data.map((item) => (
                      <tr
                        key={item.id}
                        className={
                          item.status === false
                            ? "bg-gray-50 text-gray-500"
                            : ""
                        }
                      >
                        <td className="border px-3 py-2">
                          {item.kode_vendor ?? "-"}
                        </td>

                        <td className="border px-3 py-2 font-medium">
                          {item.nama_vendor}
                        </td>

                        <td className="border px-3 py-2">
                          {item.kategori_vendor ?? "-"}
                        </td>

                        <td className="border px-3 py-2">{item.npwp ?? "-"}</td>

                        <td className="border px-3 py-2">
                          {item.telepon ?? "-"}
                        </td>

                        <td className="border px-3 py-2">
                          {item.email ?? "-"}
                        </td>

                        <td className="border px-3 py-2">
                          {item.kode_coa !== null ? (
                            <div>
                              <div className="font-medium">{item.kode_coa}</div>

                              <div className="text-xs text-gray-500">
                                {item.nama_coa ?? "-"}
                              </div>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="border px-3 py-2 text-center">
                          {item.pkp === true ? "Ya" : "Tidak"}
                        </td>

                        <td className="border px-3 py-2 text-center">
                          {item.status === true ? (
                            <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-600">
                              Nonaktif
                            </span>
                          )}
                        </td>

                        <td className="border px-3 py-2">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="secondary"
                              onClick={() => router.push(`/vendors/${item.id}`)}
                              title="Lihat detail"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(`/vendors/${item.id}/edit`)
                              }
                              title="Edit vendor"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            {item.status === true && (
                              <Button
                                variant="destructive"
                                disabled={loadingId === item.id}
                                onClick={() => handleDelete(item.id)}
                                title="Nonaktifkan vendor"
                              >
                                {loadingId === item.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            )}
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
    </>
  );
}
