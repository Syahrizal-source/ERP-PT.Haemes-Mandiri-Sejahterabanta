"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Loader2, Pencil } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface CoaRow {
  id_coa: number;
  kode: string;
  nama: string;
}

interface DetailRow {
  id_detail: number;
  id_coa: number;
  debit: number;
  kredit: number;
  coa: CoaRow | null;
}

interface JurnalDetailData {
  id_jurnal: number;
  tanggal: string;
  no_bukti: string;
  sumber: string;
  keterangan: string;
  id_periode: number;
  is_posted: boolean;
  jurnal_detail: DetailRow[];
}

export default function JurnalDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [data, setData] = useState<JurnalDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [posting, setPosting] = useState<boolean>(false);

  async function fetchDetail(): Promise<void> {
    setLoading(true);

    const response = await fetch(`/api/jurnal/${params.id}`);

    if (!response.ok) {
      setLoading(false);
      return;
    }

    const result: JurnalDetailData = await response.json();

    setData(result);
    setLoading(false);
  }

  async function handlePosting(): Promise<void> {
    if (!data) return;

    if (data.is_posted) {
      alert("Jurnal sudah diposting");
      return;
    }

    setPosting(true);

    const response = await fetch(`/api/jurnal/${data.id_jurnal}/post`, {
      method: "POST",
    });

    setPosting(false);

    const result = await response.json();

    if (!response.ok) {
      alert(result.message);
      return;
    }

    await fetchDetail();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDetail(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Detail Jurnal">
        {/* HEADER */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
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
            <strong>Periode:</strong> {data.id_periode}
          </p>
          <p>
            <strong>Keterangan:</strong> {data.keterangan}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            {data.is_posted ? (
              <span className="text-green-600 font-semibold">Posted</span>
            ) : (
              <span className="text-yellow-600 font-semibold">Draft</span>
            )}
          </p>
        </div>

        {/* TABLE ERP STYLE */}
        <div className="border rounded overflow-hidden mb-6">
          <div className="grid grid-cols-12 bg-gray-100 text-sm font-semibold px-3 py-2">
            <div className="col-span-6">COA</div>
            <div className="col-span-3 text-right">Debit</div>
            <div className="col-span-3 text-right">Kredit</div>
          </div>

          {data.jurnal_detail.map((row) => (
            <div
              key={row.id_detail}
              className="grid grid-cols-12 px-3 py-2 text-sm border-t"
            >
              {/* COA */}
              <div className="col-span-6">
                {row.coa ? `${row.coa.kode} - ${row.coa.nama}` : row.id_coa}
              </div>

              {/* DEBIT */}
              <div className="col-span-3 text-right">
                {row.debit > 0 ? row.debit.toLocaleString("id-ID") : ""}
              </div>

              {/* KREDIT */}
              <div className="col-span-3 text-right">
                {row.kredit > 0 ? row.kredit.toLocaleString("id-ID") : ""}
              </div>
            </div>
          ))}
        </div>

        {/* ACTION */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push("/accounting/jurnal")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          {!data.is_posted && (
            <>
              <Button
                variant="secondary"
                onClick={() =>
                  router.push(`/accounting/jurnal/${data.id_jurnal}/edit`)
                }
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>

              <Button onClick={handlePosting}>
                {posting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Posting
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
