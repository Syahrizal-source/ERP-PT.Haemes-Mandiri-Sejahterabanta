"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type CoaRow = {
  id_coa: number;
  kode: string;
  nama: string;
};

type PeriodeRow = {
  id_periode: number;
  nama_periode: string;
};

type DetailRow = {
  id_coa: number;
  debit: number;
  kredit: number;
};

export default function JurnalPenyesuaianPage() {
  const [tanggal, setTanggal] = useState<string>("");
  const [keterangan, setKeterangan] = useState<string>("");
  const [idPeriode, setIdPeriode] = useState<number>(0);
  const [coa, setCoa] = useState<CoaRow[]>([]);
  const [periode, setPeriode] = useState<PeriodeRow[]>([]);
  const [details, setDetails] = useState<DetailRow[]>([
    { id_coa: 0, debit: 0, kredit: 0 },
    { id_coa: 0, debit: 0, kredit: 0 },
  ]);

  useEffect(() => {
    fetch("/api/coa")
      .then((r) => r.json())
      .then((data: CoaRow[]) => setCoa(data));

    fetch("/api/periode")
      .then((r) => r.json())
      .then((data: PeriodeRow[]) => setPeriode(data));
  }, []);

  function addRow(): void {
    setDetails([...details, { id_coa: 0, debit: 0, kredit: 0 }]);
  }

  function updateDetail(
    index: number,
    field: keyof DetailRow,
    value: number,
  ): void {
    const copy = [...details];
    copy[index][field] = value;
    setDetails(copy);
  }

  async function handleSubmit(): Promise<void> {
    const res = await fetch("/api/jurnal-penyesuaian", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tanggal,
        keterangan,
        id_periode: idPeriode,
        details,
      }),
    });

    if (!res.ok) {
      alert("Gagal posting jurnal penyesuaian");
      return;
    }

    alert("Berhasil posting jurnal penyesuaian");
    window.location.reload();
  }

  return (
    <Card title="Jurnal Penyesuaian">
      <div className="space-y-4">
        <div>
          <label>Tanggal</label>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="border p-2 w-full"
          />
        </div>

        <div>
          <label>Keterangan</label>
          <input
            type="text"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            className="border p-2 w-full"
          />
        </div>

        <div>
          <label>Periode</label>
          <select
            value={idPeriode}
            onChange={(e) => setIdPeriode(Number(e.target.value))}
            className="border p-2 w-full"
          >
            <option value={0}>Pilih Periode</option>
            {periode.map((p) => (
              <option key={p.id_periode} value={p.id_periode}>
                {p.nama_periode}
              </option>
            ))}
          </select>
        </div>

        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">COA</th>
              <th className="border p-2">Debit</th>
              <th className="border p-2">Kredit</th>
            </tr>
          </thead>
          <tbody>
            {details.map((d, i) => (
              <tr key={i}>
                <td className="border p-2">
                  <select
                    value={d.id_coa}
                    onChange={(e) =>
                      updateDetail(i, "id_coa", Number(e.target.value))
                    }
                    className="border p-1 w-full"
                  >
                    <option value={0}>Pilih Akun</option>
                    {coa.map((c) => (
                      <option key={c.id_coa} value={c.id_coa}>
                        {c.kode} - {c.nama}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border p-2">
                  <input
                    type="number"
                    value={d.debit}
                    onChange={(e) =>
                      updateDetail(i, "debit", Number(e.target.value))
                    }
                    className="border p-1 w-full"
                  />
                </td>
                <td className="border p-2">
                  <input
                    type="number"
                    value={d.kredit}
                    onChange={(e) =>
                      updateDetail(i, "kredit", Number(e.target.value))
                    }
                    className="border p-1 w-full"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex gap-2">
          <Button onClick={addRow}>Tambah Baris</Button>
          <Button onClick={handleSubmit}>Posting</Button>
        </div>
      </div>
    </Card>
  );
}
