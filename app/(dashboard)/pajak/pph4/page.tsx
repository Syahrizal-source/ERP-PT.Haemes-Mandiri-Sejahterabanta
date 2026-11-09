"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Plus, Loader2, Eye, Pencil, Trash2, Download } from "lucide-react";

import Swal from "sweetalert2";

import Card from "@/components/ui/Card";

import Button from "@/components/ui/Button";

import { useToast } from "@/components/ui/toast-context";

/* =========================
   TYPE
========================= */

interface Pph4 {
  id: number;

  id_vendor: number;

  jenis_objek: string;

  npwp_pembeli: string | null;

  nama_pembeli: string | null;

  nomor_faktur_pajak: string | null;

  tanggal_faktur_pajak: string | null;

  nilai_transaksi: number;

  dpp_nilai_lain: number;

  ppn: number;

  tarif_pph4: number;

  potongan: number;

  pph4_terutang: number;

  tanggal_transaksi: string;

  created_at: string;

  vendors: {
    id: number;
    kode_vendor: string | null;
    nama_vendor: string;
  } | null;
}

/* =========================
   HELPER FORMAT RUPIAH
========================= */

function formatRupiah(value: number): string {
  return value.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/* =========================
   HELPER FORMAT TANGGAL
========================= */

function formatTanggal(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/* =========================
   PAGE
========================= */

export default function Pph4Page() {
  const router = useRouter();

  const { showToast } = useToast();

  const [data, setData] = useState<Pph4[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  const [loadingId, setLoadingId] = useState<number | null>(null);

  /* =========================
     FETCH DATA
  ========================= */

  async function fetchData(): Promise<void> {
    try {
      setLoading(true);

      const res = await fetch("/api/pph4", {
        cache: "no-store",
      });

      if (!res.ok) {
        showToast("Gagal mengambil data PPh4", "error");
        return;
      }

      const result: unknown = await res.json();

      if (!Array.isArray(result)) {
        showToast("Format data PPh4 tidak valid", "error");
        return;
      }

      setData(result as Pph4[]);
    } catch (error: unknown) {
      console.error("FETCH PPH4 ERROR:", error);

      showToast("Gagal mengambil data PPh4", "error");
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     LOAD
  ========================= */

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
      text: "Apakah Anda yakin menghapus data PPh4 ini?",
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

      const res = await fetch(`/api/pph4/${id}`, {
        method: "DELETE",
      });

      const result: unknown = await res.json();

      if (!res.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Gagal menghapus data";

        await Swal.fire("Gagal", message, "error");

        return;
      }

      await Swal.fire("Berhasil", "Data PPh4 berhasil dihapus", "success");

      await fetchData();
    } catch (error: unknown) {
      console.error("DELETE PPH4 ERROR:", error);

      await Swal.fire(
        "Gagal",
        "Terjadi kesalahan saat menghapus data",
        "error",
      );
    } finally {
      setLoadingId(null);
    }
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <Card title="Data PPh4">
      {/* =====================
          HEADER
      ===================== */}

      <div className="flex justify-end gap-2 mb-4">
        <Button onClick={() => router.push("/pajak/pph4/form")}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah
        </Button>

        <Button onClick={() => router.push("/pajak/pph4/laporan")}>
          <Download className="w-4 h-4 mr-2" />
          Laporan
        </Button>
      </div>

      {/* =====================
          LOADING
      ===================== */}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Memuat data PPh4...</span>
        </div>
      ) : data.length === 0 ? (
        /* =====================
           EMPTY
        ===================== */

        <div className="text-center py-12 text-gray-500">
          Belum ada data PPh4.
        </div>
      ) : (
        /* =====================
           TABLE
        ===================== */

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2 whitespace-nowrap">No</th>

                <th className="border p-2 whitespace-nowrap">Vendor</th>

                <th className="border p-2 whitespace-nowrap">NPWP Pembeli</th>

                <th className="border p-2 whitespace-nowrap">Nama Pembeli</th>

                <th className="border p-2 whitespace-nowrap">
                  Nomor Faktur Pajak
                </th>

                <th className="border p-2 whitespace-nowrap">Tanggal Faktur</th>

                <th className="border p-2 whitespace-nowrap">Jenis Objek</th>

                <th className="border p-2 text-right whitespace-nowrap">
                  Nilai Transaksi
                </th>

                <th className="border p-2 text-right whitespace-nowrap">
                  DPP Nilai Lain
                </th>

                <th className="border p-2 text-right whitespace-nowrap">PPN</th>

                <th className="border p-2 text-right whitespace-nowrap">
                  Potongan
                </th>

                <th className="border p-2 text-right whitespace-nowrap">
                  Tarif
                </th>

                <th className="border p-2 text-right whitespace-nowrap">
                  PPh4
                </th>

                <th className="border p-2 whitespace-nowrap">Tanggal</th>

                <th className="border p-2 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {data.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  {/* NO */}
                  <td className="border p-2 text-center">{index + 1}</td>

                  {/* VENDOR */}
                  <td className="border p-2 whitespace-nowrap">
                    <div className="font-medium">
                      {item.vendors?.nama_vendor ?? "-"}
                    </div>

                    {item.vendors?.kode_vendor && (
                      <div className="text-xs text-gray-500">
                        {item.vendors.kode_vendor}
                      </div>
                    )}
                  </td>

                  {/* NPWP */}
                  <td className="border p-2 whitespace-nowrap">
                    {item.npwp_pembeli ?? "-"}
                  </td>

                  {/* NAMA PEMBELI */}
                  <td className="border p-2 whitespace-nowrap">
                    {item.nama_pembeli ?? "-"}
                  </td>

                  {/* FAKTUR */}
                  <td className="border p-2 whitespace-nowrap">
                    {item.nomor_faktur_pajak ?? "-"}
                  </td>

                  {/* TANGGAL FAKTUR */}
                  <td className="border p-2 whitespace-nowrap">
                    {formatTanggal(item.tanggal_faktur_pajak)}
                  </td>

                  {/* JENIS OBJEK */}
                  <td className="border p-2 whitespace-nowrap">
                    {item.jenis_objek}
                  </td>

                  {/* NILAI TRANSAKSI */}
                  <td className="border p-2 text-right whitespace-nowrap">
                    Rp {formatRupiah(item.nilai_transaksi)}
                  </td>

                  {/* DPP NILAI LAIN */}
                  <td className="border p-2 text-right whitespace-nowrap">
                    Rp {formatRupiah(item.dpp_nilai_lain)}
                  </td>

                  {/* PPN */}
                  <td className="border p-2 text-right whitespace-nowrap">
                    Rp {formatRupiah(item.ppn)}
                  </td>

                  {/* POTONGAN */}
                  <td className="border p-2 text-right whitespace-nowrap">
                    Rp {formatRupiah(item.potongan)}
                  </td>

                  {/* TARIF */}
                  <td className="border p-2 text-right whitespace-nowrap">
                    {item.tarif_pph4.toLocaleString("id-ID", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}
                    %
                  </td>

                  {/* PPH4 */}
                  <td className="border p-2 text-right whitespace-nowrap font-semibold">
                    Rp {formatRupiah(item.pph4_terutang)}
                  </td>

                  {/* TANGGAL TRANSAKSI */}
                  <td className="border p-2 whitespace-nowrap">
                    {formatTanggal(item.tanggal_transaksi)}
                  </td>

                  {/* AKSI */}
                  <td className="border p-2">
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => router.push(`/pajak/pph4/${item.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={() =>
                          router.push(`/pajak/pph4/${item.id}/edit`)
                        }
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>

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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
