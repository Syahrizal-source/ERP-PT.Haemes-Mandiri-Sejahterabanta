"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type KasbonPribadiDetail = {
  id: string;
  tanggal: string;
  no_voucher: string;
  deskripsi: string;
  debit: number;
  kredit: number;
  saldo: number;
};

export default function KasbonPribadiDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;
  const [data, setData] = useState<KasbonPribadiDetail | null>(null);

  async function fetchData(): Promise<void> {
    const res = await fetch(`/api/kasbon-pribadi/${id}`);

    if (!res.ok) {
      showToast("Gagal mengambil detail kasbon pribadi", "error");
      return;
    }

    const result: KasbonPribadiDetail = await res.json();
    setData(result);
  }

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card title="Detail Kasbon Pribadi">
          <p>Loading...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card title="Detail Kasbon Pribadi">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold">Tanggal</p>
            <p>{data.tanggal}</p>
          </div>
          <div>
            <p className="font-semibold">No Voucher</p>
            <p>{data.no_voucher}</p>
          </div>
          <div>
            <p className="font-semibold">Debit</p>
            <p>{(data.debit ?? 0).toLocaleString("id-ID")}</p>
          </div>
          <div>
            <p className="font-semibold">Kredit</p>
            <p>{(data.kredit ?? 0).toLocaleString("id-ID")}</p>
          </div>
          <div>
            <p className="font-semibold">Saldo</p>
            <p>{(data.saldo ?? 0).toLocaleString("id-ID")}</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/accounting/kasbon-pribadi")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() => router.push(`/accounting/kasbon-pribadi/${id}/edit`)}
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </Card>
    </div>
  );
}
