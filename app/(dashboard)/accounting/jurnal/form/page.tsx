"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Coa {
  id_coa: number;
  kode: string;
  nama: string;
}

interface DetailInput {
  id_coa: number | null;
  debit: number;
  kredit: number;
}

export default function JurnalFormPage() {
  const router = useRouter();

  const [tanggal, setTanggal] = useState<string>("");
  const [noBukti, setNoBukti] = useState<string>("");
  const [keterangan, setKeterangan] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [activePeriodeId, setActivePeriodeId] = useState<number>(0);

  const [coaList, setCoaList] = useState<Coa[]>([]);
  const [details, setDetails] = useState<DetailInput[]>([
    { id_coa: null, debit: 0, kredit: 0 },
    { id_coa: null, debit: 0, kredit: 0 },
  ]);

  async function fetchCoa(): Promise<void> {
    const res = await fetch("/api/coa");
    const data: Coa[] = await res.json();
    setCoaList(data);
  }

  async function generateNoBukti(): Promise<void> {
    const today = new Date();

    const yyyy = today.getFullYear();

    const mm = String(today.getMonth() + 1).padStart(2, "0");

    const dd = String(today.getDate()).padStart(2, "0");

    const prefix = `JU-${yyyy}${mm}${dd}`;

    const res = await fetch(`/api/jurnal/next-number?prefix=${prefix}`);

    const data: {
      next_number: string;
    } = await res.json();

    setNoBukti(data.next_number);
  }

  async function fetchActivePeriode(): Promise<void> {
    const res = await fetch("/api/periode");

    if (!res.ok) {
      return;
    }

    const result: {
      id_periode: number;
      status: "OPEN" | "CLOSED";
    }[] = await res.json();

    const openPeriode = result.find((item) => item.status === "OPEN");

    if (openPeriode) {
      setActivePeriodeId(openPeriode.id_periode);
    }
  }

  useEffect(() => {
    async function initialize(): Promise<void> {
      await fetchCoa();

      await fetchActivePeriode();

      await generateNoBukti();
    }

    initialize().catch(console.error);
  }, []);

  function updateDetail(
    index: number,
    field: keyof DetailInput,
    value: number | null,
  ): void {
    const newDetails = [...details];
    newDetails[index] = {
      ...newDetails[index],
      [field]: value,
    };
    setDetails(newDetails);
  }

  function addRow(): void {
    setDetails([...details, { id_coa: null, debit: 0, kredit: 0 }]);
  }

  function removeRow(index: number): void {
    const newDetails = details.filter((_, i) => i !== index);
    setDetails(newDetails);
  }

  function totalDebit(): number {
    return details.reduce((sum, d) => sum + d.debit, 0);
  }

  function totalKredit(): number {
    return details.reduce((sum, d) => sum + d.kredit, 0);
  }

  async function handleSubmit(): Promise<void> {
    try {
      if (loading) {
        return;
      }

      setLoading(true);

      if (totalDebit() !== totalKredit()) {
        alert("Debit dan Kredit harus balance");

        return;
      }

      const payload = {
        tanggal,

        no_bukti: noBukti,

        keterangan,

        sumber: "UMUM",

        id_periode: activePeriodeId,

        is_posted: true,

        details: details
          .filter((d): boolean => d.id_coa !== null)
          .map((d) => ({
            id_coa: Number(d.id_coa),

            debit: d.debit,

            kredit: d.kredit,
          })),
      };

      const res = await fetch("/api/jurnal", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      });

      const result: {
        message?: string;
      } = await res.json();

      if (!res.ok) {
        alert(result.message ?? "Gagal menyimpan jurnal");

        return;
      }

      router.push("/accounting/jurnal");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Terjadi kesalahan";

      alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Tambah Jurnal Umum">
        {/* HEADER */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-sm">Tanggal</label>
            <input
              type="date"
              className="w-full border px-3 py-2 rounded"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">No Bukti</label>
            <input
              type="text"
              readOnly
              className="w-full border px-3 py-2 rounded"
              value={noBukti}
              onChange={(e) => setNoBukti(e.target.value)}
            />
          </div>

          <div className="col-span-2">
            <label className="text-sm">Keterangan</label>
            <input
              type="text"
              className="w-full border px-3 py-2 rounded"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
            />
          </div>
        </div>

        {/* DETAIL */}
        <div className="space-y-3 mb-6">
          {details.map((row, index) => (
            <div key={index} className="grid grid-cols-12 gap-2">
              {/* COA */}
              <select
                className="col-span-6 border px-2 py-2 rounded"
                value={row.id_coa ?? ""}
                onChange={(e) =>
                  updateDetail(index, "id_coa", Number(e.target.value))
                }
              >
                <option value="">Pilih COA</option>
                {coaList.map((c) => (
                  <option key={c.id_coa} value={c.id_coa}>
                    {c.kode} - {c.nama}
                  </option>
                ))}
              </select>

              {/* DEBIT */}
              <input
                type="number"
                className="col-span-2 border px-2 py-2 rounded text-right"
                value={row.debit}
                onChange={(e) =>
                  updateDetail(index, "debit", Number(e.target.value))
                }
              />

              {/* KREDIT */}
              <input
                type="number"
                className="col-span-2 border px-2 py-2 rounded text-right"
                value={row.kredit}
                onChange={(e) =>
                  updateDetail(index, "kredit", Number(e.target.value))
                }
              />

              {/* DELETE */}
              <button
                onClick={() => removeRow(index)}
                className="col-span-2 text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* TOTAL */}
        <div className="flex justify-end gap-6 mb-6 text-sm font-semibold">
          <div>Debit: {totalDebit().toLocaleString("id-ID")}</div>
          <div>Kredit: {totalKredit().toLocaleString("id-ID")}</div>
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

          <Button onClick={addRow}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Baris
          </Button>

          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
