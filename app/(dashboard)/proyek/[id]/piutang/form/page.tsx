"use client";

import { useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { ArrowLeft, Loader2, Save } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

import { useToast } from "@/components/ui/toast-context";

import { piutangProyekSchema } from "@/lib/validators/piutang-proyek";

/* =========================
   TYPES
========================= */

type FormState = {
  id_proyek: string;
  tanggal: string;

  customer: string;

  tanggal_pembayaran: string;

  nilai_piutang: number;

  penerimaan: number;

  saldo: number;

  keterangan: string;

  status:
    | "Unpaid (Menunggu Pembayaran)"
    | "Partial (Pembayaran Sebagian)"
    | "Paid (Pembayaran Penuh/ Lunas)";
};

/* =========================
   PAGE
========================= */

export default function CreatePiutangProyekPage() {
  const router = useRouter();

  const params = useParams<{
    id: string;
  }>();

  const { showToast } = useToast();

  const [saving, setSaving] = useState<boolean>(false);

  const [form, setForm] = useState<FormState>({
    id_proyek: params.id,
    tanggal: "",

    customer: "",

    tanggal_pembayaran: "",

    nilai_piutang: 0,

    penerimaan: 0,

    saldo: 0,

    keterangan: "",

    status: "Unpaid (Menunggu Pembayaran)",
  });

  /* =========================
     HANDLE CHANGE
  ========================= */

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    const updated = {
      ...form,

      [field]: value,
    };

    const saldo = Number(updated.nilai_piutang) - Number(updated.penerimaan);

    /* =========================
       ANTI MINUS
    ========================= */

    updated.saldo = saldo < 0 ? 0 : saldo;

    /* =========================
       STATUS OTOMATIS
    ========================= */

    if (updated.saldo === 0) {
      updated.status = "Paid (Pembayaran Penuh/ Lunas)";
    } else if (Number(updated.penerimaan) > 0) {
      updated.status = "Partial (Pembayaran Sebagian)";
    } else {
      updated.status = "Unpaid (Menunggu Pembayaran)";
    }

    setForm(updated);
  }

  /* =========================
     SUBMIT
  ========================= */

  async function handleSubmit(): Promise<void> {
    try {
      const parsed = piutangProyekSchema.parse(form);

      if (Number(parsed.penerimaan) > Number(parsed.nilai_piutang)) {
        showToast("Penerimaan tidak boleh melebihi piutang", "error");

        return;
      }

      setSaving(true);

      const res = await fetch("/api/proyek/piutang", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(parsed),
      });

      const result = await res.json();

      setSaving(false);

      if (!res.ok) {
        showToast(result.error ?? "Gagal menyimpan piutang proyek", "error");

        return;
      }

      showToast("Piutang proyek & jurnal berhasil dibuat", "success");

      router.push(`/proyek/${params.id}/piutang`);

      router.refresh();
    } catch (error: unknown) {
      setSaving(false);

      showToast((error as Error).message, "error");
    }
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Piutang Proyek">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            label="Customer"
            value={form.customer}
            onChange={(e) => handleChange("customer", e.target.value)}
          />

          <Input
            label="Tanggal Pembayaran"
            type="date"
            value={form.tanggal_pembayaran}
            onChange={(e) => handleChange("tanggal_pembayaran", e.target.value)}
          />

          <Input
            label="Nilai Piutang"
            type="number"
            value={form.nilai_piutang}
            onChange={(e) =>
              handleChange("nilai_piutang", Number(e.target.value))
            }
          />

          <Input
            label="Penerimaan"
            type="number"
            value={form.penerimaan}
            onChange={(e) => handleChange("penerimaan", Number(e.target.value))}
          />

          <Input
            label="Saldo"
            type="number"
            value={form.saldo}
            disabled
            onChange={() => {
              return;
            }}
          />

          <div className="col-span-2">
            <label className="text-sm font-medium">Status</label>

            <input
              className="w-full border rounded px-3 py-2 bg-gray-100"
              value={form.status}
              disabled
            />
          </div>

          <div className="col-span-2">
            <label className="text-sm font-medium">Keterangan</label>

            <textarea
              className="w-full border rounded px-3 py-2"
              rows={4}
              value={form.keterangan}
              onChange={(e) => handleChange("keterangan", e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${params.id}/piutang`)}
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
                Simpan
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
