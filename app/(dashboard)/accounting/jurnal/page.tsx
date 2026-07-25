"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";

import AutoReversalButton from "@/components/accounting/AutoReversalButton";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface JurnalItem {
  id_jurnal: number;
  tanggal: string;
  no_bukti: string;
  sumber: string;
  keterangan: string;
  id_periode: number;
  is_posted: boolean;
}

interface PeriodeItem {
  id_periode: number;
  nama_periode: string;
  status: "OPEN" | "CLOSED";
}

export default function JurnalListPage() {
  const router = useRouter();

  const [data, setData] = useState<JurnalItem[]>([]);
  const [periodeList, setPeriodeList] = useState<PeriodeItem[]>([]);

  const [selectedPeriode, setSelectedPeriode] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(true);

  /* =========================
     FETCH PERIODE
  ========================= */
  async function fetchPeriode(): Promise<void> {
    try {
      const res = await fetch("/api/periode");

      if (!res.ok) {
        return;
      }

      const result: PeriodeItem[] = await res.json();

      setPeriodeList(result);

      /* =========================
         PRIORITAS PERIODE OPEN
      ========================= */
      const openPeriode = result.find((item) => item.status === "OPEN");

      if (openPeriode) {
        setSelectedPeriode(openPeriode.id_periode);
      } else if (result.length > 0) {
        setSelectedPeriode(result[0].id_periode);
      }
    } catch (error) {
      console.error("FETCH PERIODE ERROR:", error);
    }
  }

  /* =========================
     FETCH JURNAL
  ========================= */
  async function fetchJurnal(periodeId: number): Promise<void> {
    try {
      setLoading(true);

      const res = await fetch(`/api/jurnal?periode=${periodeId}`);

      if (!res.ok) {
        setLoading(false);
        return;
      }

      const result: JurnalItem[] = await res.json();

      setData(result);
    } catch (error) {
      console.error("FETCH JURNAL ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     LOAD PERIODE
  ========================= */
  useEffect(() => {
    void fetchPeriode();
  }, []);

  /* =========================
     LOAD JURNAL
  ========================= */
  useEffect(() => {
    if (selectedPeriode > 0) {
      void fetchJurnal(selectedPeriode);
    }
  }, [selectedPeriode]);

  /* =========================
     CURRENT PERIODE
  ========================= */
  const currentPeriode = periodeList.find(
    (item) => item.id_periode === selectedPeriode,
  );

  const isOpen: boolean = currentPeriode?.status === "OPEN";

  return (
    <div className="max-w-6xl mx-auto">
      <Card title="Jurnal Umum">
        {/* =========================
            FILTER + ACTION
        ========================= */}
        <div className="flex justify-between items-center mb-4 gap-4">
          {/* =========================
              FILTER PERIODE
          ========================= */}
          <select
            value={selectedPeriode}
            onChange={(e) => setSelectedPeriode(Number(e.target.value))}
            className="border px-3 py-2 rounded-lg bg-white"
          >
            {periodeList.map((periode) => (
              <option key={periode.id_periode} value={periode.id_periode}>
                Periode {periode.nama_periode} - {periode.status}
              </option>
            ))}
          </select>

          {/* =========================
              BUTTON ACTION
          ========================= */}
          <div className="flex gap-2">
            <AutoReversalButton />

            <Button
              onClick={() => router.push("/accounting/jurnal/form")}
              disabled={!isOpen}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Jurnal
            </Button>
          </div>
        </div>

        {/* =========================
            INFO STATUS PERIODE
        ========================= */}
        <div className="mb-4 text-sm">
          {isOpen ? (
            <span className="text-green-600 font-medium">
              Periode Aktif: OPEN
            </span>
          ) : (
            <span className="text-red-600 font-medium">
              Periode Aktif: CLOSED
            </span>
          )}
        </div>

        {/* =========================
            TABLE
        ========================= */}
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Memuat data...
          </div>
        ) : (
          <table className="w-full border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-3 py-2">Tanggal</th>

                <th className="border px-3 py-2">No Bukti</th>

                <th className="border px-3 py-2">Keterangan</th>

                <th className="border px-3 py-2">Sumber</th>

                <th className="border px-3 py-2">Status</th>
              </tr>
            </thead>

            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr
                    key={item.id_jurnal}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() =>
                      router.push(`/accounting/jurnal/${item.id_jurnal}`)
                    }
                  >
                    <td className="border px-3 py-2">{item.tanggal}</td>

                    <td className="border px-3 py-2">{item.no_bukti}</td>

                    <td className="border px-3 py-2">{item.keterangan}</td>

                    <td className="border px-3 py-2">{item.sumber}</td>

                    <td className="border px-3 py-2">
                      {item.is_posted ? (
                        <span className="text-green-600 font-medium">
                          Posted
                        </span>
                      ) : (
                        <span className="text-yellow-600 font-medium">
                          Draft
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
