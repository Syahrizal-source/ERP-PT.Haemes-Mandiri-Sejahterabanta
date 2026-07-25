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

interface Pendapatan {
  id: number;
  tanggal: string;
  id_coa: number;
  nominal: number;
  ppn: number;
  pph23: number;
  total: number;
  keterangan: string;
  id_jurnal: number | null;
}

interface Coa {
  id_coa: number;
  kode: string;
  nama: string;
}

/* =========================
   PAGE
========================= */

export default function PendapatanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [data, setData] = useState<Pendapatan | null>(null);
  const [coa, setCoa] = useState<Coa | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch(`/api/pendapatan/${id}`);

      if (!res.ok) {
        showToast("Gagal mengambil data", "error");
        setLoading(false);
        return;
      }

      const result: Pendapatan = await res.json();
      setData(result);

      const coaRes = await fetch("/api/coa");
      const coaList: Coa[] = await coaRes.json();

      const found = coaList.find(
        (c) => c.id_coa === result.id_coa,
      );

      setCoa(found ?? null);
      setLoading(false);
    }

    fetchData();
  }, [id, showToast]);

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
      <Card title="Detail Pendapatan">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold">Tanggal</p>
            <p>{data.tanggal}</p>
          </div>

          <div>
            <p className="font-semibold">COA</p>
            <p>
              {coa
                ? `${coa.kode} - ${coa.nama}`
                : data.id_coa}
            </p>
          </div>

          <div>
            <p className="font-semibold">Nominal</p>
            <p>{data.nominal.toLocaleString("id-ID")}</p>
          </div>

          <div>
            <p className="font-semibold">PPN</p>
            <p>{data.ppn.toLocaleString("id-ID")}</p>
          </div>

          <div>
            <p className="font-semibold">PPh23</p>
            <p>{data.pph23.toLocaleString("id-ID")}</p>
          </div>

          <div>
            <p className="font-semibold">Total</p>
            <p className="font-bold">
              {data.total.toLocaleString("id-ID")}
            </p>
          </div>

          <div className="col-span-2">
            <p className="font-semibold">Keterangan</p>
            <p>{data.keterangan}</p>
          </div>

          <div>
            <p className="font-semibold">Jurnal</p>
            {data.id_jurnal ? (
              <button
                className="text-blue-600 underline"
                onClick={() =>
                  router.push(
                    `/accounting/jurnal/${data.id_jurnal}`,
                  )
                }
              >
                Lihat Jurnal #{data.id_jurnal}
              </button>
            ) : (
              "-"
            )}
          </div>

          <div>
            <p className="font-semibold">Status</p>
            {data.id_jurnal ? (
              <span className="text-green-600">
                Posted
              </span>
            ) : (
              <span className="text-yellow-600">
                Draft
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <Button
            variant="secondary"
            onClick={() =>
              router.push("/accounting/pendapatan")
            }
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          {!data.id_jurnal && (
            <Button
              onClick={() =>
                router.push(
                  `/accounting/pendapatan/${data.id}/edit`,
                )
              }
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}