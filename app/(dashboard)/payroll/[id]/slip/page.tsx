"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

/* =========================
   TYPES
========================= */

interface Pegawai {
  nama: string;
  divisi: string;
}

interface Payroll {
  id: number;
  bulan: number;
  tahun: number;
  total_gaji: number;
  total_tunjangan: number;
  total_potongan: number;
  pph21: number;
  bpjs: number;
  net_gaji: number;
  created_at: string;
  pegawai?: Pegawai | null;
}

/* =========================
   PAGE
========================= */

export default function SlipPayrollPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<Payroll | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  function getIdFromUrl(): string | null {
    if (typeof window === "undefined") return null;

    const parts = window.location.pathname.split("/");
    return parts[parts.length - 2] || null;
  }

  useEffect(() => {
    async function fetchData(): Promise<void> {
      try {
        const id = getIdFromUrl();

        if (!id) {
          throw new Error("ID tidak ditemukan");
        }

        console.log("FETCH ID:", id);

        const res = await fetch(`/api/payroll/${id}`);

        const text = await res.text(); // DEBUG

        console.log("RAW RESPONSE:", text);

        if (!res.ok) {
          throw new Error("API gagal");
        }

        const result: Payroll = JSON.parse(text);

        setData(result);
      } catch (err) {
        console.error(err);
        showToast("Gagal mengambil data payroll", "error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);// eslint-disable-next-line react-hooks/exhaustive-deps

  function handlePrint(): void {
    window.print();
  }

  if (!data) {
    return (
      <div className="text-center text-red-500">
        Data kosong / tidak ditemukan
      </div>
    );
  }

  if (!data) return null;


  return (
    <div id="print-area" className="max-w-xl mx-auto bg-white p-6 print:p-2">
      <Card title="Slip Gaji">
        {/* =========================
           HEADER (TRANSPARAN)
        ========================= */}
        <div className="mb-4 flex justify-center">
          <div className="text-center mb-2">
            <Image
              src="/haemes-header.png"
              alt="Header Perusahaan"
              width={350}
              height={80}
              className="mx-auto object-contain opacity-90"
              priority
            />
          </div>
        </div>

        <div className="max-w-xl mx-auto bg-white p-6 print:p-2 text-sm">

          {/* =========================
     JUDUL
  ========================= */}
          <h1 className="text-xl font-bold text-center mb-4">
            Slip Gaji
          </h1>

          {/* =========================
     HEADER
  ========================= */}
          <div className="grid grid-cols-2 gap-y-2">
            <span className="text-gray-600">Nama</span>
            <span className="text-right">{data.pegawai?.nama}</span>

            <span className="text-gray-600">Divisi</span>
            <span className="text-right">{data.pegawai?.divisi}</span>

            <span className="text-gray-600">Tanggal</span>
            <span className="text-right">
              {new Date(data.created_at).toLocaleString("id-ID")}
            </span>
          </div>

          {/* =========================
     DETAIL
  ========================= */}
          <div className="border-t mt-4 pt-4 grid grid-cols-2 gap-y-2">
            <span>Total Gaji</span>
            <span className="text-right">
              {data.total_gaji.toLocaleString("id-ID")}
            </span>

            <span>Tunjangan</span>
            <span className="text-right">
              {data.total_tunjangan.toLocaleString("id-ID")}
            </span>

            <span>Potongan</span>
            <span className="text-right text-red-500">
              {data.total_potongan.toLocaleString("id-ID")}
            </span>

            <span>PPh21</span>
            <span className="text-right">
              {data.pph21.toLocaleString("id-ID")}
            </span>

            <span>BPJS</span>
            <span className="text-right">
              {data.bpjs.toLocaleString("id-ID")}
            </span>
          </div>

          {/* =========================
     NET
  ========================= */}
          <div className="border-t mt-4 pt-4 grid grid-cols-2">
            <span className="font-bold text-lg">Net Gaji</span>
            <span className="text-right font-bold text-lg text-blue-600">
              {data.net_gaji.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        {/* =========================
           ACTION
        ========================= */}
        <div className="flex gap-3 mt-6 print:hidden">

          <Button
            variant="secondary"
            onClick={() => router.push(`/payroll/${data.id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <div className="print:hidden">
            <Button onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
