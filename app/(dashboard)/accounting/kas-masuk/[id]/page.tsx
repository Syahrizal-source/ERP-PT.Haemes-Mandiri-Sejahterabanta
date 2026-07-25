"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

/* =========================
   TYPES
========================= */

interface KasMasuk {
  id: number;
  tanggal: string;
  no_bukti: string;
  sumber: string;
  nominal: number;
  ppn: number;
  pph23: number;
  total: number;
  keterangan: string;
  id_jurnal: number | null;
}

/* =========================
   PAGE
========================= */

export default function KasMasukDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [data, setData] = useState<KasMasuk | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  async function fetchData(): Promise<void> {
    const res = await fetch(`/api/kas-masuk/${params.id}`);

    if (!res.ok) {
      showToast("Gagal mengambil data", "error");
      setLoading(false);
      return;
    }

    const result: KasMasuk = await res.json();

    setData(result);
    setLoading(false);
  }

  useEffect(() => {
    fetchData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Detail Kas Masuk">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <p>
            <strong>Tanggal:</strong> {data.tanggal}
          </p>
          <p>
            <strong>No Bukti:</strong> {data.no_bukti}
          </p>
          <p>
            <strong>Sumber:</strong> {data.sumber}
          </p>

          <p>
            <strong>Nominal:</strong> {data.nominal.toLocaleString("id-ID")}
          </p>
          <p>
            <strong>PPN:</strong> {data.ppn.toLocaleString("id-ID")}
          </p>
          <p className="text-red-600">
            <strong>PPh23:</strong> {data.pph23.toLocaleString("id-ID")}
          </p>

          <p className="font-semibold">
            <strong>Total:</strong> {data.total.toLocaleString("id-ID")}
          </p>

          <p>
            <strong>Keterangan:</strong> {data.keterangan}
          </p>
        </div>

        <div className="flex justify-between mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/accounting/kas-masuk")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() => router.push(`/accounting/kas-masuk/${data.id}/edit`)}
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </Card>
    </div>
  );
}
