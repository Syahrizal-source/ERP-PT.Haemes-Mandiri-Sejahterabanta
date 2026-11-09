"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";

import Button from "@/components/ui/Button";

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

  potongan: number;

  tarif_pph4: number;

  pph4_terutang: number;

  tanggal_transaksi: string;

  created_at: string;
}

/* =========================
   HELPER RUPIAH
========================= */

function formatRupiah(value: number): string {
  return value.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* =========================
   HELPER TANGGAL
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

export default function DetailPph4Page() {
  const params = useParams<{
    id: string;
  }>();

  const router = useRouter();

  const [data, setData] = useState<Pph4 | null>(null);

  const [loading, setLoading] = useState<boolean>(true);

  const [error, setError] = useState<string | null>(null);

  /* =========================
     FETCH DETAIL
  ========================= */

  useEffect(() => {
    async function fetchData(): Promise<void> {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/pph4/${params.id}`, {
          cache: "no-store",
        });

        const result: unknown = await res.json();

        if (!res.ok) {
          const message =
            typeof result === "object" &&
            result !== null &&
            "error" in result &&
            typeof result.error === "string"
              ? result.error
              : "Gagal mengambil data PPh4";

          throw new Error(message);
        }

        setData(result as Pph4);
      } catch (err: unknown) {
        console.error("DETAIL PPH4 ERROR:", err);

        setError(
          err instanceof Error ? err.message : "Gagal mengambil data PPh4",
        );
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      void fetchData();
    }
  }, [params.id]);

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <Card title="Detail PPh4">
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </Card>
    );
  }

  /* =========================
     ERROR
  ========================= */

  if (error) {
    return (
      <Card title="Detail PPh4">
        <div className="space-y-4">
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>

          <Button
            variant="secondary"
            onClick={() => router.push("/pajak/pph4")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </div>
      </Card>
    );
  }

  /* =========================
     DATA TIDAK ADA
  ========================= */

  if (!data) {
    return (
      <Card title="Detail PPh4">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Data PPh4 tidak ditemukan.</p>

          <Button
            variant="secondary"
            onClick={() => router.push("/pajak/pph4")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </div>
      </Card>
    );
  }

  /* =========================
     HITUNG DASAR PAJAK
  ========================= */

  const nilaiTransaksi: number = Math.max(0, data.nilai_transaksi);

  const potongan: number = Math.max(0, data.potongan);

  const dasarPajak: number = Math.max(0, nilaiTransaksi - potongan);

  /* =========================
     RENDER
  ========================= */

  return (
    <Card title="Detail PPh4">
      <div className="space-y-6">
        {/* =====================
            DATA PEMBELI
        ===================== */}

        <div>
          <h3 className="mb-3 text-sm font-semibold">Data Pembeli</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">NPWP Pembeli</p>

              <p className="font-medium">{data.npwp_pembeli ?? "-"}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Nama Pembeli</p>

              <p className="font-medium">{data.nama_pembeli ?? "-"}</p>
            </div>
          </div>
        </div>

        {/* =====================
            DATA FAKTUR
        ===================== */}

        <div>
          <h3 className="mb-3 text-sm font-semibold">Data Faktur Pajak</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Nomor Faktur Pajak</p>

              <p className="font-medium">{data.nomor_faktur_pajak ?? "-"}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Tanggal Faktur Pajak</p>

              <p className="font-medium">
                {formatTanggal(data.tanggal_faktur_pajak)}
              </p>
            </div>
          </div>
        </div>

        {/* =====================
            DATA TRANSAKSI
        ===================== */}

        <div>
          <h3 className="mb-3 text-sm font-semibold">Data Transaksi</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Jenis Objek</p>

              <p className="font-medium">{data.jenis_objek}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Tanggal Transaksi</p>

              <p className="font-medium">
                {formatTanggal(data.tanggal_transaksi)}
              </p>
            </div>
          </div>
        </div>

        {/* =====================
            NILAI PAJAK
        ===================== */}

        <div>
          <h3 className="mb-3 text-sm font-semibold">Perhitungan Pajak</h3>

          <div className="rounded-lg border overflow-hidden">
            <div className="grid grid-cols-2 border-b p-3">
              <span>Nilai Transaksi</span>

              <span className="text-right font-medium">
                Rp {formatRupiah(nilaiTransaksi)}
              </span>
            </div>

            <div className="grid grid-cols-2 border-b p-3">
              <span>DPP Nilai Lain</span>

              <span className="text-right">
                Rp {formatRupiah(Math.max(0, data.dpp_nilai_lain))}
              </span>
            </div>

            <div className="grid grid-cols-2 border-b p-3">
              <span>PPN</span>

              <span className="text-right">
                Rp {formatRupiah(Math.max(0, data.ppn))}
              </span>
            </div>

            <div className="grid grid-cols-2 border-b p-3">
              <span>Potongan</span>

              <span className="text-right">Rp {formatRupiah(potongan)}</span>
            </div>

            <div className="grid grid-cols-2 border-b p-3">
              <span>Dasar Pajak</span>

              <span className="text-right font-medium">
                Rp {formatRupiah(dasarPajak)}
              </span>
            </div>

            <div className="grid grid-cols-2 border-b p-3">
              <span>Tarif PPh4</span>

              <span className="text-right">
                {data.tarif_pph4.toLocaleString("id-ID", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                %
              </span>
            </div>

            <div className="grid grid-cols-2 p-3 bg-gray-50">
              <span className="font-semibold">PPh4 Terutang</span>

              <span className="text-right font-bold text-blue-600">
                Rp {formatRupiah(Math.max(0, data.pph4_terutang))}
              </span>
            </div>
          </div>
        </div>

        {/* =====================
            ACTION
        ===================== */}

        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={() => router.push("/pajak/pph4")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </div>
      </div>
    </Card>
  );
}
