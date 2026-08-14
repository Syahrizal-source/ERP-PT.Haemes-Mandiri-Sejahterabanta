"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import type { TipeTenagaKerja, StatusTenagaKerja } from "@/types/proyek";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type FormState = {
  nama: string;
  jabatan: string;
  tipe: TipeTenagaKerja;
  upah: number;
  periode: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: StatusTenagaKerja;
  keterangan: string;
  metode_pembayaran: "KAS" | "BANK" | "HUTANG";
};

export default function CreateTenagaKerjaPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;

  const [saving, setSaving] = useState<boolean>(false);
  const [form, setForm] = useState<FormState>({
    nama: "",
    jabatan: "",
    tipe: "OPERATOR_ALAT_BERAT",
    upah: 0,
    periode: "",
    tanggal_mulai: "",
    tanggal_selesai: "",
    status: "AKTIF",
    keterangan: "",
    metode_pembayaran: "BANK",
  });

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(): Promise<void> {
    if (!form.nama.trim()) {
      showToast("Nama wajib diisi", "error");
      return;
    }

    if (!form.jabatan.trim()) {
      showToast("Jabatan wajib diisi", "error");
      return;
    }

    if (!form.tanggal_mulai) {
      showToast("Tanggal mulai wajib diisi", "error");
      return;
    }

    if (form.tanggal_selesai && form.tanggal_selesai < form.tanggal_mulai) {
      showToast("Tanggal selesai tidak boleh lebih kecil", "error");
      return;
    }

    if (form.upah <= 0) {
      showToast("Upah harus lebih besar dari nol", "error");
      return;
    }

    setSaving(true);

    const res = await fetch("/api/proyek/tenaga-kerja", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_proyek: proyekId,
        nama: form.nama,
        jabatan: form.jabatan || null,
        tipe: form.tipe,
        upah: form.upah,
        periode: form.periode || null,
        tanggal_mulai: form.tanggal_mulai,
        tanggal_selesai: form.tanggal_selesai || null,
        status: form.status,
        keterangan: form.keterangan || null,
        metode_pembayaran: form.metode_pembayaran,
      }),
    });

    const result = await res.json();
    console.log(result);

    setSaving(false);

    if (!res.ok) {
      showToast(result.error ?? "Gagal", "error");
      return;
    }

    showToast("Tenaga kerja berhasil ditambahkan", "success");
    router.push(`/proyek/${proyekId}/tenaga-kerja`);
    router.refresh();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Tambah Tenaga Kerja">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nama"
            value={form.nama}
            onChange={(e) => handleChange("nama", e.target.value)}
          />

          <Input
            label="Jabatan"
            value={form.jabatan}
            onChange={(e) => handleChange("jabatan", e.target.value)}
          />

          <div>
            <label className="text-sm font-medium">Tipe</label>
            <select
              className="w-full border rounded p-2"
              value={form.tipe}
              onChange={(e) =>
                handleChange("tipe", e.target.value as FormState["tipe"])
              }
            >
              <option value="MANAJEMEN_PROYEK">Manajemen Proyek</option>
              <option value="TENAGA_AHLI">Tenaga Ahli</option>
              <option value="TEKNISI_ANALIS">Teknisi / Analis</option>
              <option value="OPERATOR_ALAT_BERAT">Operator Alat Berat</option>
              <option value="OPERATOR_ANGKUTAN">Operator Angkutan</option>
              <option value="PEKERJA_LAPANGAN">Pekerja Lapangan</option>
              <option value="ADMINISTRASI">Administrasi</option>
            </select>
          </div>

          <Input
            label="Upah"
            type="number"
            value={form.upah}
            onChange={(e) => handleChange("upah", Number(e.target.value))}
          />

          <Input
            label="Periode"
            placeholder="Contoh: Jan 2026"
            value={form.periode}
            onChange={(e) => handleChange("periode", e.target.value)}
          />

          <div>
            <label className="text-sm font-medium">Metode Pembayaran</label>

            <select
              className="w-full rounded border p-2"
              value={form.metode_pembayaran}
              onChange={(e) =>
                handleChange(
                  "metode_pembayaran",
                  e.target.value as FormState["metode_pembayaran"],
                )
              }
            >
              <option value="KAS">Kas</option>
              <option value="BANK">Bank (BNI)</option>
              <option value="HUTANG">Hutang</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              className="w-full rounded border p-2"
              value={form.status}
              onChange={(e) =>
                handleChange("status", e.target.value as StatusTenagaKerja)
              }
            >
              <option value="AKTIF">AKTIF</option>
              <option value="SELESAI">SELESAI</option>
              <option value="DIBATALKAN">DIBATALKAN</option>
            </select>
          </div>

          <Input
            type="date"
            label="Tanggal Mulai"
            value={form.tanggal_mulai}
            onChange={(e) => handleChange("tanggal_mulai", e.target.value)}
          />

          <Input
            type="date"
            label="Tanggal Selesai"
            value={form.tanggal_selesai}
            onChange={(e) => handleChange("tanggal_selesai", e.target.value)}
          />

          <Input
            label="Keterangan"
            value={form.keterangan}
            onChange={(e) => handleChange("keterangan", e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}/tenaga-kerja`)}
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
