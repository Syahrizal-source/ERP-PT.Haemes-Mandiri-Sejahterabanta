"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface HutangDetail {
  id_hutang: number;
  supplier: string;
  no_invoice: string;
  tanggal: string;
  jatuh_tempo: string;
  nilai: number;
  status: string;
}

export default function HutangDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = Number(params.id);

  const [data, setData] = useState<HutangDetail | null>(null);

  async function fetchData(): Promise<void> {
    const res = await fetch(`/api/hutang/${id}`);

    if (!res.ok) {
      showToast("Gagal ambil data hutang", "error");
      return;
    }

    const result: HutangDetail = await res.json();
    setData(result);
  }

  useEffect(() => {
    if (Number.isInteger(id)) {
      fetchData();
    }
  }, [id]);

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card title="Detail Hutang">
          <p>Loading...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card title="Detail Hutang">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold">Supplier</p>
            <p>{data.supplier}</p>
          </div>

          <div>
            <p className="font-semibold">No Invoice</p>
            <p>{data.no_invoice}</p>
          </div>

          <div>
            <p className="font-semibold">Tanggal</p>
            <p>{data.tanggal}</p>
          </div>

          <div>
            <p className="font-semibold">Jatuh Tempo</p>
            <p>{data.jatuh_tempo}</p>
          </div>

          <div>
            <p className="font-semibold">Nilai</p>
            <p>{data.nilai.toLocaleString()}</p>
          </div>

          <div>
            <p className="font-semibold">Status</p>
            <p>{data.status}</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/accounting/hutang")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() =>
              router.push(`/accounting/hutang/${data.id_hutang}/edit`)
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
