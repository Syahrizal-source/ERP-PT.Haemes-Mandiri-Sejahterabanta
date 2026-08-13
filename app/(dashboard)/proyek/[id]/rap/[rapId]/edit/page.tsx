"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type RAPForm = {
  id_rab: string;
  id_kategori: number;
  uraian: string;
  qty: number;
  satuan: string;
  harga: number;
  tanggal: string;
  keterangan: string;
};

export default function EditRAPPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = String(params.id ?? "");
  const rapId = String(params.rapId ?? "");

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [form, setForm] = useState<RAPForm>({
    id_rab: "",
    id_kategori: 0,
    uraian: "",
    qty: 0,
    satuan: "",
    harga: 0,
    tanggal: "",
    keterangan: "",
  });

  /* =========================
     LOAD DATA
  ========================= */
  useEffect(() => {
    async function fetchData(): Promise<void> {
      if (!rapId) return;

      const res = await fetch(`/api/proyek/rap/${rapId}`);

      if (!res.ok) {
        showToast("Gagal mengambil data RAP", "error");
        setLoading(false);
        return;
      }

      const data = await res.json();

      setForm({
        id_rab: data.id_rab ?? "",
        id_kategori: data.id_kategori,
        uraian: data.uraian,
        qty: Number(data.qty),
        satuan: data.satuan ?? "",
        harga: Number(data.harga),
        tanggal: data.tanggal?.slice(0, 10) ?? "",
        keterangan: data.keterangan ?? "",
      });

      setLoading(false);
    }

    fetchData();
  }, [rapId, showToast]);

  function handleChange<K extends keyof RAPForm>(
    field: K,
    value: RAPForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  const total: number = form.qty * form.harga;

  /* =========================
     UPDATE
  ========================= */
  async function handleSubmit(): Promise<void> {
    if (!form.uraian || !form.tanggal) {
      showToast("Uraian belum lengkap", "error");
      return;
    }

    if (!form.id_rab) {
      showToast("Referensi RAB tidak ditemukan.", "error");
      return;
    }

    if (form.qty <= 0 || form.harga <= 0) {
      showToast("Qty dan harga harus lebih dari 0", "error");
      return;
    }

    setSaving(true);

    const res = await fetch(`/api/proyek/rap/${rapId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    setSaving(false);

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error ?? "Gagal update RAP", "error");
      return;
    }

    showToast("RAP berhasil diupdate", "success");
    router.push(`/proyek/${proyekId}/rap`);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Edit RAP Proyek">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Kategori" value={form.id_kategori} readOnly />

          {/* NAMA ITEM */}
          <Input label="Nama Item" value={form.uraian} readOnly />

          {/* QTY */}
          <Input
            label="Qty"
            type="number"
            value={form.qty}
            onChange={(e) => handleChange("qty", Number(e.target.value))}
          />

          {/* SATUAN */}
          <Input label="Satuan" value={form.satuan} readOnly />

          {/* HARGA */}
          <Input label="Harga" type="number" value={form.harga} readOnly />

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

        {/* TOTAL */}
        <div className="mt-4 text-right font-semibold text-blue-600">
          Total: Rp {total.toLocaleString("id-ID")}
        </div>

        {/* ACTION */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}/rap`)}
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
