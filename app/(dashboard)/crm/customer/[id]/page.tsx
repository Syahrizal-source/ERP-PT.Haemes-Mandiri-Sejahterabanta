"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

/* =========================
   TYPE
========================= */
type Customer = {
  id: string;
  nama: string;
  perusahaan: string | null;
  email: string | null;
  telp: string | null;
  alamat: string | null;
  industri: string | null;
  created_at: string;
};

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [data, setData] = useState<Customer | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  async function fetchDetail(): Promise<void> {
    const res = await fetch(`/api/crm/customer/${params.id}`);

    if (!res.ok) {
      setLoading(false);
      return;
    }

    const result: Customer = await res.json();
    setData(result);
    setLoading(false);
  }

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <Card title="Detail Customer">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <p><strong>Nama:</strong> {data.nama}</p>
          <p><strong>Perusahaan:</strong> {data.perusahaan ?? "-"}</p>
          <p><strong>Email:</strong> {data.email ?? "-"}</p>
          <p><strong>Telepon:</strong> {data.telp ?? "-"}</p>
          <p><strong>Alamat:</strong> {data.alamat ?? "-"}</p>
          <p><strong>Industri:</strong> {data.industri ?? "-"}</p>
          <p>
            <strong>Dibuat:</strong>{" "}
            {new Date(data.created_at).toLocaleDateString("id-ID")}
          </p>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/crm/customer")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() =>
              router.push(`/crm/customer/${data.id}/edit`)
            }
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </Card>
    </div>
  );
}