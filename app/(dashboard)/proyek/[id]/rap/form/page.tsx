"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type FormState = {
  kategori:
  | "alat"
  | "tenaga_kerja"
  | "bbm"
  | "sparepart"
  | "subcontract"
  | "overhead";
  nama_item: string;
  qty: number;
  harga: number;
  tanggal: string;
  keterangan: string;
};

export default function CreateRAPPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const idProyek = params.id as string;

  const [loading, setLoading] = useState<boolean>(false);

  const [form, setForm] = useState<FormState>({
    kategori: "alat",
    nama_item: "",
    qty: 0,
    harga: 0,
    tanggal: "",
    keterangan: "",
  });

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const total: number = form.qty * form.harga;

  async function handleSubmit(): Promise<void> {
    if (!form.nama_item || !form.tanggal) {
      showToast("Data wajib belum lengkap", "error");
      return;
    }

    if (form.qty <= 0 || form.harga <= 0) {
      showToast("Qty dan harga harus lebih dari 0", "error");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/proyek/rap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...form,
        id_proyek: idProyek,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error ?? "Gagal menyimpan RAP", "error");
      return;
    }

    showToast("RAP berhasil ditambahkan", "success");
    router.push(`/proyek/${idProyek}/rap`);
    router.refresh();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Tambah RAP Proyek">
        <div className="grid grid-cols-2 gap-4">
          {/* KATEGORI */}
          <div>
            <label className="text-sm font-medium">Kategori</label>
            <select
              className="w-full border rounded p-2"
              value={form.kategori}
              onChange={(e) =>
                handleChange(
                  "kategori",
                  e.target.value as FormState["kategori"],
                )
              }
            >
              <option value="alat">Alat</option>
              <option value="tenaga_kerja">Tenaga Kerja</option>
              <option value="bbm">BBM</option>
              <option value="sparepart">Sparepart</option>
              <option value="subcontract">Subcontract</option>
              <option value="overhead">Overhead</option>
            </select>
          </div>

          {/* NAMA ITEM */}
          <Input
            label="Nama Item"
            value={form.nama_item}
            onChange={(e) => handleChange("nama_item", e.target.value)}
          />

          {/* QTY */}
          <Input
            label="Qty"
            type="number"
            value={form.qty}
            onChange={(e) => handleChange("qty", Number(e.target.value))}
          />

          {/* HARGA */}
          <Input
            label="Harga"
            type="number"
            value={form.harga}
            onChange={(e) => handleChange("harga", Number(e.target.value))}
          />

          {/* TANGGAL */}
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          {/* KETERANGAN */}
          <Input
            label="Keterangan"
            value={form.keterangan}
            onChange={(e) => handleChange("keterangan", e.target.value)}
          />
        </div>

        {/* TOTAL (AUTO HITUNG) */}
        <div className="mt-4 text-right font-semibold text-blue-600">
          Total: Rp {total.toLocaleString("id-ID")}
        </div>

        {/* ACTION */}
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
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