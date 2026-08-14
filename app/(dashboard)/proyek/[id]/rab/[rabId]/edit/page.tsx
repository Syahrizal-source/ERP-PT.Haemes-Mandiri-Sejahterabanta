"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type RABForm = {
  id_kategori: number;
  uraian: string;
  volume: number;
  satuan: string;
  harga_satuan: number;
  keterangan: string;
};

type KategoriBiaya = {
  id: number;
  kode: string;
  nama: string;
  jenis: "BIAYA" | "MATERIAL";
};

export default function EditRABPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;
  const rabId = params.rabId as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [kategoriList, setKategoriList] = useState<KategoriBiaya[]>([]);

  const [form, setForm] = useState<RABForm>({
    id_kategori: 0,
    uraian: "",
    volume: 0,
    satuan: "",
    harga_satuan: 0,
    keterangan: "",
  });

  const total = useMemo(() => {
    return Number(form.volume) * Number(form.harga_satuan);
  }, [form.volume, form.harga_satuan]);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch(`/api/proyek/rab/${rabId}`);
      if (!res.ok) {
        showToast("Gagal mengambil data RAB", "error");
        setLoading(false);
        return;
      }

      const data: RABForm = await res.json();

      setForm({
        id_kategori: data.id_kategori,
        uraian: data.uraian ?? "",
        volume: data.volume,
        satuan: data.satuan ?? "",
        harga_satuan: data.harga_satuan,
        keterangan: data.keterangan ?? "",
      });

      setLoading(false);
    }

    fetchData();
  }, [rabId, showToast]);

  useEffect(() => {
    async function loadKategori() {
      const res = await fetch("/api/master/kategori-biaya-proyek");

      if (!res.ok) return;

      const data: KategoriBiaya[] = await res.json();
      setKategoriList(data);
    }

    loadKategori();
  }, []);

  function handleChange<K extends keyof RABForm>(
    field: K,
    value: RABForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    setSaving(true);

    const res = await fetch(`/api/proyek/rab/${rabId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error ?? "Gagal update RAB", "error");
      return;
    }

    showToast("RAB berhasil diupdate", "success");
    router.push(`/proyek/${proyekId}/rab`);
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
      <Card title="Edit RAB Proyek">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Kategori</label>
            <select
              className="w-full rounded-md border border-gray-300 p-2"
              value={form.id_kategori}
              onChange={(e) =>
                handleChange("id_kategori", Number(e.target.value))
              }
            >
              <option value={0}>-- Pilih Kategori --</option>

              <optgroup label="BIAYA">
                {kategoriList
                  .filter((x) => x.jenis === "BIAYA")
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nama}
                    </option>
                  ))}
              </optgroup>

              <optgroup label="MATERIAL">
                {kategoriList
                  .filter((x) => x.jenis === "MATERIAL")
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nama}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          <Input
            label="Uraian"
            value={form.uraian}
            onChange={(e) => handleChange("uraian", e.target.value)}
          />

          <Input
            label="Volume"
            type="number"
            value={form.volume}
            onChange={(e) => handleChange("volume", Number(e.target.value))}
          />

          <Input
            label="Satuan"
            value={form.satuan}
            onChange={(e) => handleChange("satuan", e.target.value)}
          />

          <Input
            label="Harga Satuan"
            type="number"
            value={form.harga_satuan}
            onChange={(e) =>
              handleChange("harga_satuan", Number(e.target.value))
            }
          />

          <Input
            label="Keterangan"
            value={form.keterangan}
            onChange={(e) => handleChange("keterangan", e.target.value)}
          />

          <Input label="Total" value={total.toLocaleString("id-ID")} readOnly />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}/rab`)}
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
