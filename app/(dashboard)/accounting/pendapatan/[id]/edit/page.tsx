"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/toast-context";

/* =========================
   TYPES
========================= */

interface Coa {
  id_coa: number;
  kode: string;
  nama: string;
}

interface FormState {
  tanggal: string;
  id_coa: number;
  nominal: number;
  ppn: number;
  pph23: number;
  keterangan: string;
}

/* =========================
   PAGE
========================= */

export default function EditPendapatanPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [coas, setCoas] = useState<Coa[]>([]);

  const [form, setForm] = useState<FormState>({
    tanggal: "",
    id_coa: 0,
    nominal: 0,
    ppn: 0,
    pph23: 0,
    keterangan: "",
  });

  /* =========================
     FETCH
  ========================= */

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const [resData, resCoa] = await Promise.all([
        fetch(`/api/pendapatan/${id}`),
        fetch("/api/coa"),
      ]);

      if (!resData.ok) {
        showToast("Gagal ambil data", "error");
        setLoading(false);
        return;
      }

      const data = await resData.json();
      const coaList: Coa[] = await resCoa.json();

      if (data.id_jurnal) {
        showToast("Data sudah diposting, tidak bisa edit", "error");
        router.push(`/accounting/pendapatan/${id}`);
        return;
      }

      setCoas(coaList);

      setForm({
        tanggal: data.tanggal,
        id_coa: data.id_coa,
        nominal: data.nominal,
        ppn: data.ppn,
        pph23: data.pph23,
        keterangan: data.keterangan,
      });

      setLoading(false);
    }

    fetchData();
  }, [id, router, showToast]);

  /* =========================
     CHANGE
  ========================= */

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };

      const nominal = Number(updated.nominal) || 0;

      return {
        ...updated,
        ppn: nominal * 0.11,
        pph23: nominal * 0.02,
      };
    });
  }

  const total: number = form.nominal + form.ppn - form.pph23;

  /* =========================
     SUBMIT
  ========================= */

  async function handleSubmit(): Promise<void> {
    setSaving(true);

    const res = await fetch(`/api/pendapatan/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    setSaving(false);

    if (!res.ok) {
      showToast("Gagal update", "error");
      return;
    }

    showToast("Berhasil update", "success");

    router.push(`/accounting/pendapatan/${id}`);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Edit Pendapatan">
        <div className="grid grid-cols-2 gap-4">
          <select
            className="border p-2 rounded"
            value={form.id_coa}
            onChange={(e) => handleChange("id_coa", Number(e.target.value))}
          >
            <option value={0}>-- Pilih COA --</option>
            {coas.map((c) => (
              <option key={c.id_coa} value={c.id_coa}>
                {c.kode} - {c.nama}
              </option>
            ))}
          </select>

          <Input
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            type="number"
            value={form.nominal}
            onChange={(e) => handleChange("nominal", Number(e.target.value))}
          />

          <Input value={form.ppn} disabled />
          <Input value={form.pph23} disabled />

          <Input
            value={form.keterangan}
            onChange={(e) => handleChange("keterangan", e.target.value)}
          />
        </div>

        <div className="mt-6">
          <p>Total: {total.toLocaleString("id-ID")}</p>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/accounting/pendapatan/${id}`)}
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
