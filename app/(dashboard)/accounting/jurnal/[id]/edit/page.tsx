"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface DetailRow {
  id_detail?: string;
  id_coa: number;
  debit: number;
  kredit: number;
}

interface JurnalData {
  id_jurnal: string;
  tanggal: string;
  no_bukti: string;
  keterangan: string;
  id_periode: number;
  details: DetailRow[];
}

function toSafeNumber(value: string): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 0;
  if (parsed < 0) return 0;
  return parsed;
}

export default function EditJurnalPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [form, setForm] = useState<JurnalData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function fetchData(): Promise<void> {
    const res = await fetch(`/api/jurnal/${params.id}`);

    if (!res.ok) {
      setLoading(false);
      return;
    }

    const data = await res.json();

    setForm({
      id_jurnal: data.id_jurnal,
      tanggal: data.tanggal,
      no_bukti: data.no_bukti,
      keterangan: data.keterangan,
      id_periode: Number(data.id_periode),
      details: data.jurnal_detail.map(
        (d: {
          id_detail: string;
          id_coa: string;
          debit: number;
          kredit: number;
        }) => ({
          id_detail: d.id_detail,
          id_coa: Number(d.id_coa),
          debit: d.debit,
          kredit: d.kredit,
        }),
      ),
    });

    setLoading(false);
  }

  useEffect(() => {
    fetchData();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDetailChange(
    index: number,
    field: keyof DetailRow,
    value: string,
  ): void {
    if (!form) return;

    const updated = [...form.details];

    updated[index] = {
      ...updated[index],
      [field]: toSafeNumber(value),
    };

    setForm({ ...form, details: updated });
  }

  async function handleSubmit(): Promise<void> {
    if (!form) return;

    setErrorMessage("");

    const totalDebit = form.details.reduce((sum, d) => sum + d.debit, 0);

    const totalKredit = form.details.reduce((sum, d) => sum + d.kredit, 0);

    if (totalDebit !== totalKredit) {
      setErrorMessage("Debit dan kredit harus balance");
      return;
    }

    setSaving(true);

    const response = await fetch(`/api/jurnal/${form.id_jurnal}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tanggal: form.tanggal,
        no_bukti: form.no_bukti,
        keterangan: form.keterangan,
        id_periode: form.id_periode,
        sumber: "UMUM",
        details: form.details,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      setErrorMessage("Gagal update jurnal");
      return;
    }

    router.push(`/accounting/jurnal/${form.id_jurnal}`);
  }

  if (loading || !form) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Edit Jurnal">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
          />

          <Input
            label="No Bukti"
            value={form.no_bukti}
            onChange={(e) => setForm({ ...form, no_bukti: e.target.value })}
          />

          <Input
            label="Keterangan"
            value={form.keterangan}
            onChange={(e) =>
              setForm({
                ...form,
                keterangan: e.target.value,
              })
            }
          />
        </div>

        <div className="mt-6">
          {form.details.map((row, index) => (
            <div key={index} className="grid grid-cols-3 gap-3 mb-3">
              <Input
                label="ID COA"
                type="number"
                value={row.id_coa}
                onChange={(e) =>
                  handleDetailChange(index, "id_coa", e.target.value)
                }
              />

              <Input
                label="Debit"
                type="number"
                value={row.debit}
                onChange={(e) =>
                  handleDetailChange(index, "debit", e.target.value)
                }
              />

              <Input
                label="Kredit"
                type="number"
                value={row.kredit}
                onChange={(e) =>
                  handleDetailChange(index, "kredit", e.target.value)
                }
              />
            </div>
          ))}
        </div>

        {errorMessage && <p className="text-red-600 mt-4">{errorMessage}</p>}

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/accounting/jurnal/${form.id_jurnal}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Update
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
