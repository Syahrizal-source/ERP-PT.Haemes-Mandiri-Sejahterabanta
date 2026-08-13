"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type KategoriBiaya = {
  id: number;
  kode: string;
  nama: string;
  jenis: "BIAYA" | "MATERIAL";
};

type FormState = {
  id_kategori: number;
  uraian: string;
  volume: number;
  satuan: string;
  harga_satuan: number;
  keterangan: string;
};

export default function CreateRABPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [kategoriList, setKategoriList] = useState<KategoriBiaya[]>([]);

  const idProyek = params.id as string;

  const [loading, setLoading] = useState<boolean>(false);
  const [form, setForm] = useState<FormState>({
    id_kategori: 0,
    uraian: "",
    volume: 0,
    satuan: "",
    harga_satuan: 0,
    keterangan: "",
  });

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(): Promise<void> {
    setLoading(true);

    const res = await fetch("/api/proyek/rab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        id_proyek: idProyek,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error ?? "Gagal menyimpan RAB", "error");
      return;
    }

    showToast("RAB berhasil ditambahkan", "success");
    router.push(`/proyek/${idProyek}/rab`);
    router.refresh();
  }

  useEffect(() => {
    async function loadKategori() {
      const res = await fetch("/api/master/kategori-biaya-proyek");

      if (!res.ok) return;

      const data: KategoriBiaya[] = await res.json();

      setKategoriList(data);
    }

    loadKategori();
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Tambah RAB Proyek">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Kategori</label>

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
        </div>

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
