"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type StatusTagihan =
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";

type FormState = {
  nomor_invoice: string;
  no_bukti: string;
  tanggal: string;
  periode: string;
  nilai: number;
  nilai_ppn: number;
  nilai_pph: number;
  status: StatusTagihan;
};

type ApiErrorResponse = {
  error?: string;
};

const INITIAL_FORM: FormState = {
  nomor_invoice: "",
  no_bukti: "",
  tanggal: new Date().toISOString().slice(0, 10),
  periode: "",
  nilai: 0,
  nilai_ppn: 0,
  nilai_pph: 0,
  status: "Unpaid (Menunggu Pembayaran)",
};

export default function CreateTagihanPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    if (!proyekId) {
      showToast("ID proyek tidak ditemukan.", "error");
      return;
    }

    if (!form.nomor_invoice.trim()) {
      showToast("Nomor invoice wajib diisi.", "error");
      return;
    }

    if (!form.tanggal) {
      showToast("Tanggal wajib diisi.", "error");
      return;
    }

    if (!Number.isFinite(form.nilai) || form.nilai <= 0) {
      showToast("Nilai tagihan harus lebih besar dari 0.", "error");
      return;
    }

    if (!Number.isFinite(form.nilai_ppn) || form.nilai_ppn < 0) {
      showToast("Nilai PPN tidak boleh minus.", "error");
      return;
    }

    if (!Number.isFinite(form.nilai_pph) || form.nilai_pph < 0) {
      showToast("Nilai PPh tidak boleh minus.", "error");
      return;
    }

    try {
      setSaving(true);

      const payload: FormState & {
        id_proyek: string;
        details: [];
      } = {
        id_proyek: proyekId,
        nomor_invoice: form.nomor_invoice.trim(),
        no_bukti: form.no_bukti.trim(),
        tanggal: form.tanggal,
        periode: form.periode.trim(),
        nilai: form.nilai,
        nilai_ppn: form.nilai_ppn,
        nilai_pph: form.nilai_pph,
        status: form.status,
        details: [],
      };

      console.log("PAYLOAD TAGIHAN:", payload);

      const res = await fetch("/api/proyek/tagihan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result: unknown = await res.json();

      if (!res.ok) {
        const errorResult = result as ApiErrorResponse;

        showToast(errorResult.error ?? "Gagal menyimpan tagihan.", "error");

        return;
      }

      showToast("Tagihan berhasil dibuat.", "success");

      router.push(`/proyek/${proyekId}/tagihan`);
      router.refresh();
    } catch (error: unknown) {
      console.error("CREATE TAGIHAN ERROR:", error);

      showToast("Terjadi kesalahan saat menyimpan tagihan.", "error");
    } finally {
      setSaving(false);
    }
  }

  const grandTotal = form.nilai + form.nilai_ppn - form.nilai_pph;

  return (
    <div className="p-6">
      <Card title="Tambah Tagihan Proyek">
        <div className="mb-6">
          <p className="mt-1 text-sm text-gray-500">
            Buat header tagihan proyek dan hubungkan sumber biaya melalui detail
            tagihan.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Nomor Invoice"
            value={form.nomor_invoice}
            onChange={(e) => handleChange("nomor_invoice", e.target.value)}
            placeholder="INV-2026-001"
          />

          <Input
            label="Nomor Bukti"
            value={form.no_bukti}
            onChange={(e) => handleChange("no_bukti", e.target.value)}
            placeholder="INV-20260810-001"
          />

          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            label="Periode"
            value={form.periode}
            onChange={(e) => handleChange("periode", e.target.value)}
            placeholder="Agustus 2026"
          />

          <Input
            label="Nilai Tagihan"
            type="number"
            min={0}
            value={form.nilai}
            onChange={(e) => handleChange("nilai", Number(e.target.value))}
          />

          <div>
            <label className="mb-1 block text-sm font-medium">
              Status Tagihan
            </label>

            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) =>
                handleChange("status", e.target.value as StatusTagihan)
              }
            >
              <option value="Unpaid (Menunggu Pembayaran)">
                Unpaid (Menunggu Pembayaran)
              </option>

              <option value="Partial (Pembayaran Sebagian)">
                Partial (Pembayaran Sebagian)
              </option>

              <option value="Paid (Pembayaran Penuh/ Lunas)">
                Paid (Pembayaran Penuh/ Lunas)
              </option>
            </select>
          </div>

          <Input
            label="Nilai PPN"
            type="number"
            min={0}
            value={form.nilai_ppn}
            onChange={(e) => handleChange("nilai_ppn", Number(e.target.value))}
          />

          <Input
            label="Nilai PPh"
            type="number"
            min={0}
            value={form.nilai_pph}
            onChange={(e) => handleChange("nilai_pph", Number(e.target.value))}
          />

          <div className="rounded-md border bg-gray-50 p-4">
            <div className="flex justify-between text-sm">
              <span>Nilai Sebelum Pajak</span>

              <span className="font-semibold">
                Rp {form.nilai.toLocaleString("id-ID")}
              </span>
            </div>

            <div className="mt-2 flex justify-between text-sm">
              <span>PPN</span>

              <span>Rp {form.nilai_ppn.toLocaleString("id-ID")}</span>
            </div>

            <div className="mt-2 flex justify-between text-sm">
              <span>PPh</span>

              <span>Rp {form.nilai_pph.toLocaleString("id-ID")}</span>
            </div>

            <div className="mt-3 flex justify-between border-t pt-3 text-base font-bold">
              <span>Grand Total</span>

              <span>Rp {grandTotal.toLocaleString("id-ID")}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-md border bg-gray-50 p-4">
          <div className="text-sm font-semibold">Sumber Detail Tagihan</div>

          <p className="mt-1 text-xs text-gray-500">
            Setelah header tagihan dibuat, detail dapat berasal dari Material,
            Alat Berat, Tenaga Kerja, Operasional, Realisasi, Subkon, dan
            Progress.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 md:grid-cols-4">
            <span>• MATERIAL</span>
            <span>• ALAT_BERAT</span>
            <span>• TENAGA_KERJA</span>
            <span>• OPERASIONAL</span>
            <span>• REALISASI</span>
            <span>• SUBKON</span>
            <span>• PROGRESS</span>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}/tagihan`)}
            disabled={saving}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>

          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Simpan Tagihan
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
