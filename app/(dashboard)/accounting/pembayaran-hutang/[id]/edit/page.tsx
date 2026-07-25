"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Hutang {
  id_hutang: number;
  supplier: string;
  no_invoice: string;
}

interface JurnalLine {
  id: number;
  coa: {
    kode: string;
    nama: string;
  };
  debit: number;
  kredit: number;
}

interface Data {
  id: number;
  tanggal: string;
  nominal: number;
  ppn: number;
  pph23: number;
  total: number;
  keterangan: string;
  jurnal: {
    detail: JurnalLine[];
  } | null;
}

export default function Page() {
  const { id } = useParams();
  const router = useRouter();

  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch(`/api/pembayaran-hutang/${id}?withJurnal=1`);
      const result: Data = await res.json();
      setData(result);
    }

    fetchData();
  }, [id]);

  if (!data) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Detail Pembayaran Hutang">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <p>Tanggal: {data.tanggal}</p>
          <p>Nominal: {data.nominal.toLocaleString("id-ID")}</p>
          <p>PPN: {data.ppn.toLocaleString("id-ID")}</p>
          <p>PPh23: {data.pph23.toLocaleString("id-ID")}</p>
          <p>Total: {data.total.toLocaleString("id-ID")}</p>
          <p>Keterangan: {data.keterangan}</p>
        </div>

        {/* JURNAL */}
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Jurnal</h3>

          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2">COA</th>
                <th className="border px-3 py-2 text-right">Debit</th>
                <th className="border px-3 py-2 text-right">Kredit</th>
              </tr>
            </thead>

            <tbody>
              {data.jurnal?.detail.map((row) => (
                <tr key={row.id}>
                  <td className="border px-3 py-2">
                    {row.coa.kode} - {row.coa.nama}
                  </td>
                  <td className="border px-3 py-2 text-right">
                    {row.debit.toLocaleString("id-ID")}
                  </td>
                  <td className="border px-3 py-2 text-right">
                    {row.kredit.toLocaleString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </div>
      </Card>
    </div>
  );
}
