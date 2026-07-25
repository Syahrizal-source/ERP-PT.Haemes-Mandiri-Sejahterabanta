"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type PPN = {
  id: number;
  jenis_ppn: "masukan" | "keluaran";
  nilai_dasar: number;
  tarif_ppn: number;
  nilai_ppn: number;
  tanggal_transaksi: string;
  id_jurnal?: number | null;
};

export default function PPNDetailPage(): React.JSX.Element {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [data, setData] = useState<PPN | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  /* =========================
     FETCH DATA
  ========================= */
  useEffect(() => {
    async function fetchData(): Promise<void> {
      try {
        const res = await fetch(`/api/ppn/${id}`);

        if (!res.ok) {
          throw new Error("Gagal ambil data");
        }

        const result: PPN = await res.json();
        setData(result);
      } catch {
        showToast("Gagal ambil data", "error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  /* =========================
     LOADING
  ========================= */
  if (loading) {
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-red-500">Data tidak ditemukan</div>
    );
  }

  /* =========================
     HITUNG TOTAL
  ========================= */
  const total = data.nilai_dasar + data.nilai_ppn;

  return (
    <Card title="Detail PPN">
      <div className="space-y-2">
        <p>Tanggal: {data.tanggal_transaksi}</p>

        <p>
          Jenis: {data.jenis_ppn === "masukan" ? "PPN Masukan" : "PPN Keluaran"}
        </p>

        <p>DPP: {Number(data.nilai_dasar).toLocaleString("id-ID")}</p>

        <p>Tarif: {data.tarif_ppn}%</p>

        <p className="text-blue-600 font-bold">
          PPN: {Number(data.nilai_ppn).toLocaleString("id-ID")}
        </p>

        <p className="font-semibold">Total: {total.toLocaleString("id-ID")}</p>

        {/* JURNAL */}
        {data.id_jurnal && (
          <button
            className="text-blue-600 underline"
            onClick={() => router.push(`/accounting/jurnal/${data.id_jurnal}`)}
          >
            Lihat Jurnal
          </button>
        )}
      </div>

      {/* ACTION */}
      <div className="flex gap-2 mt-4">
        <Button variant="secondary" onClick={() => router.push("/pajak/ppn")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </Button>

        {!data.id_jurnal && (
          <Button onClick={() => router.push(`/pajak/ppn/${data.id}/edit`)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        )}
      </div>
    </Card>
  );
}
