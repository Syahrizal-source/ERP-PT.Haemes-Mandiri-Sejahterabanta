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

interface Pegawai {
  id: number;
  nik: string;
  nama: string;
  divisi: string;
  jabatan: string;
  gaji_pokok: number;
  tunjangan: number;
  status: string;
  created_at: string;
}

/* =========================
   PAGE
========================= */

export default function PegawaiDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [data, setData] = useState<Pegawai | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  async function fetchData(): Promise<void> {
    const res = await fetch(`/api/pegawai/${params.id}`);

    if (!res.ok) {
      showToast("Gagal mengambil data pegawai", "error");
      setLoading(false);
      return;
    }

    const result: Pegawai = await res.json();

    setData(result);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
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
      <Card title="Detail Pegawai">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <p>
            <strong>NIK:</strong> {data.nik}
          </p>
          <p>
            <strong>Nama:</strong> {data.nama}
          </p>
          <p>
            <strong>Divisi:</strong> {data.divisi}
          </p>
          <p>
            <strong>Jabatan:</strong> {data.jabatan}
          </p>

          <p>
            <strong>Gaji Pokok:</strong>{" "}
            {data.gaji_pokok.toLocaleString("id-ID")}
          </p>

          <p>
            <strong>Tunjangan:</strong> {data.tunjangan.toLocaleString("id-ID")}
          </p>

          <p>
            <strong>Status:</strong> {data.status}
          </p>

          <p>
            <strong>Dibuat:</strong>{" "}
            {new Date(data.created_at).toLocaleString("id-ID")}
          </p>
        </div>

        <div className="flex justify-between mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/accounting/pegawai")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() => router.push(`/accounting/pegawai/${data.id}/edit`)}
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </Card>
    </div>
  );
}
