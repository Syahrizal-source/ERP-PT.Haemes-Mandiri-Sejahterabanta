"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Plus, Pencil, Trash2, Eye, Loader2 } from "lucide-react";

import Swal from "sweetalert2";

import Card from "@/components/ui/Card";

import Button from "@/components/ui/Button";

import { useToast } from "@/components/ui/toast-context";

/* =========================
   TYPES
========================= */

interface HutangLeasingItem {
  id: number;

  tanggal: string;

  no_kontrak: string;

  nama_pt_leasing: string;

  keterangan_unit: string;

  jumlah_unit: number;

  uang_muka: number;

  hutang_pokok: number;

  persentase_bunga: number;

  bunga: number;

  hutang_pembiayaan: number;

  tenor_bulan: number;

  angsuran_perbulan: number;

  tanggal_mulai: string;

  tanggal_selesai: string;

  bulan_terbayar: number;

  total_sudah_dibayar: number;

  angsuran_tahun_berjalan: number;

  tanggal_pembayaran: number;

  sisa_hutang: number;

  sisa_bulan: number;

  hutang_jangka_pendek: number;

  hutang_jangka_panjang: number;

  status: "OPEN" | "ACTIVE" | "LUNAS" | "CLOSED";
}

/* =========================
   PAGE
========================= */

export default function HutangLeasingPage() {
  const router = useRouter();

  const { showToast } = useToast();

  const [data, setData] = useState<HutangLeasingItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  const [loadingId, setLoadingId] = useState<number | null>(null);

  /* =========================
     FETCH DATA
  ========================= */

  async function fetchData(): Promise<void> {
    try {
      setLoading(true);

      const res = await fetch("/api/hutang-leasing");

      if (!res.ok) {
        showToast("Gagal mengambil data leasing", "error");

        setLoading(false);

        return;
      }

      const result: HutangLeasingItem[] = await res.json();

      setData(result);

      setLoading(false);
    } catch (error: unknown) {
      console.error("FETCH LEASING ERROR:", error);

      showToast("Terjadi kesalahan", "error");

      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadData(): Promise<void> {
      await fetchData();
    }
    void loadData();
  }, []);

  /* =========================
     DELETE
  ========================= */

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",

      text: "Apakah Anda yakin menghapus Hutang Leasing ini?",

      icon: "question",

      showCancelButton: true,

      confirmButtonColor: "#2563eb",

      cancelButtonColor: "#dc2626",

      confirmButtonText: "Ya, Hapus",

      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) {
      return;
    }

    try {
      setLoadingId(id);

      const res = await fetch(`/api/hutang-leasing/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        Swal.fire("Gagal", "Gagal menghapus data leasing", "error");

        setLoadingId(null);

        return;
      }

      Swal.fire("Berhasil", "Data leasing berhasil dihapus", "success");

      await fetchData();

      setLoadingId(null);
    } catch (error: unknown) {
      console.error("DELETE ERROR:", error);

      Swal.fire("Error", "Terjadi kesalahan", "error");

      setLoadingId(null);
    }
  }

  /* =========================
     UI
  ========================= */

  return (
    <div className="max-w-7xl mx-auto">
      <Card title="Hutang Leasing">
        {/* =========================
            ACTION
        ========================= */}

        <div className="flex justify-between mb-4">
          <div />

          <Button
            onClick={() => router.push("/accounting/hutang-leasing/form")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Leasing
          </Button>
        </div>

        {/* =========================
            LOADING
        ========================= */}

        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Memuat data...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Tanggal</th>

                  <th className="p-2 border">No Kontrak</th>

                  <th className="p-2 border">PT Leasing</th>

                  <th className="p-2 border">Unit</th>

                  <th className="p-2 border text-right">Hutang Pokok</th>

                  <th className="p-2 border text-right">Sisa Hutang</th>

                  <th className="p-2 border">Status</th>

                  <th className="p-2 border">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4">
                      Tidak ada data
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr key={item.id}>
                      <td className="p-2 border">{item.tanggal}</td>

                      <td className="p-2 border">{item.no_kontrak}</td>

                      <td className="p-2 border">{item.nama_pt_leasing}</td>

                      <td className="p-2 border">{item.keterangan_unit}</td>

                      <td className="p-2 border text-right">
                        {item.hutang_pokok.toLocaleString("id-ID")}
                      </td>

                      <td className="p-2 border text-right">
                        {item.sisa_hutang.toLocaleString("id-ID")}
                      </td>

                      <td className="p-2 border">
                        <span
                          className={
                            item.status === "ACTIVE"
                              ? "text-green-600 font-medium"
                              : item.status === "OPEN"
                                ? "text-yellow-600 font-medium"
                                : item.status === "LUNAS"
                                  ? "text-blue-600 font-medium"
                                  : "text-gray-600 font-medium"
                          }
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="p-2 border">
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            onClick={() =>
                              router.push(
                                `/accounting/hutang-leasing/${item.id}`,
                              )
                            }
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="secondary"
                            onClick={() =>
                              router.push(
                                `/accounting/hutang-leasing/${item.id}/edit`,
                              )
                            }
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="destructive"
                            onClick={() => handleDelete(item.id)}
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
