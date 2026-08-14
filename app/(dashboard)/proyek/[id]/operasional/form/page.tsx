"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type FormState = {
  tanggal: string;
  id_kategori: number;
  qty: number;
  satuan: string;
  harga: number;
  uraian: string;
  supplier: string;
  periode: string;
  metode_pembayaran: "KAS" | "BANK" | "HUTANG";
  keterangan: string;
};

type KategoriBiayaProyek = {
  id: number;
  kode: string;
  nama: string;
  jenis: "MATERIAL" | "BIAYA";
  aktif: boolean;
};

export default function TambahOperasionalPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;

  const [form, setForm] = useState<FormState>({
    tanggal: new Date().toISOString().slice(0, 10),
    id_kategori: 0,
    qty: 0,
    satuan: "",
    harga: 0,
    uraian: "",
    supplier: "",
    periode: "",
    metode_pembayaran: "BANK",
    keterangan: "",
  });

  const [saving, setSaving] = useState<boolean>(false);
  const [kategoriList, setKategoriList] = useState<KategoriBiayaProyek[]>([]);

  function handleChange<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(): Promise<void> {
    if (form.id_kategori === 0) {
      showToast("Kategori operasional wajib dipilih.", "error");
      return;
    }

    if (form.qty <= 0) {
      showToast("Qty harus lebih besar dari nol.", "error");
      return;
    }

    if (form.harga <= 0) {
      showToast("Harga harus lebih besar dari nol.", "error");
      return;
    }

    if (!form.satuan.trim()) {
      showToast("Satuan wajib diisi.", "error");
      return;
    }

    if (!form.supplier.trim()) {
      showToast("Supplier wajib diisi.", "error");
      return;
    }

    setSaving(true);

    const res = await fetch("/api/proyek/operasional", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id_proyek: proyekId,
        tanggal: form.tanggal,
        id_kategori: form.id_kategori,
        uraian: form.uraian,
        qty: form.qty,
        satuan: form.satuan,
        harga: form.harga,
        supplier: form.supplier,
        periode: form.periode,
        metode_pembayaran: form.metode_pembayaran,
        keterangan: form.keterangan,
      }),
    });

    const result = await res.json();

    console.log(result);

    if (!res.ok) {
      console.error(result);
      showToast(result.error ?? "Terjadi kesalahan", "error");
      return;
    }

    showToast("Operasional berhasil ditambahkan", "success");
    router.push(`/proyek/${proyekId}/operasional`);
    router.refresh();
  }

  useEffect(() => {
    async function loadKategori() {
      const res = await fetch("/api/master/kategori-biaya-proyek");

      if (!res.ok) return;

      const data: KategoriBiayaProyek[] = await res.json();

      const kategoriOperasional = data.filter(
        (item) =>
          item.aktif &&
          [
            "BBM",
            "OLI",
            "SPAREPART",
            "TRANSPORTASI",
            "AKOMODASI",
            "KONSUMSI",
            "PERIZINAN",
            "OVERHEAD",
            "LAINNYA",
          ].includes(item.kode),
      );

      setKategoriList(kategoriOperasional);
    }

    void loadKategori();
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Tambah Operasional Proyek">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <div>
            <label className="mb-1 block text-sm font-medium">Kategori</label>

            <select
              className="w-full rounded-md border p-2"
              value={form.id_kategori}
              onChange={(e) =>
                handleChange("id_kategori", Number(e.target.value))
              }
            >
              <option value={0}>Pilih Jenis Operasional</option>

              {kategoriList.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nama}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Uraian Operasional"
            value={form.uraian}
            onChange={(e) => handleChange("uraian", e.target.value)}
          />

          <Input
            label="Qty"
            type="number"
            value={form.qty}
            onChange={(e) => handleChange("qty", Number(e.target.value))}
          />

          <Input
            label="Satuan"
            value={form.satuan}
            onChange={(e) => handleChange("satuan", e.target.value)}
          />

          <Input
            label="Supplier"
            value={form.supplier}
            onChange={(e) => handleChange("supplier", e.target.value)}
          />

          <div>
            <label className="mb-1 block text-sm font-medium">
              Metode Pembayaran
            </label>

            <select
              className="w-full rounded-md border p-2"
              value={form.metode_pembayaran}
              onChange={(e) =>
                handleChange(
                  "metode_pembayaran",
                  e.target.value as FormState["metode_pembayaran"],
                )
              }
            >
              <option value="KAS">Kas Proyek</option>
              <option value="BANK">BNI - 1918768145</option>
              <option value="HUTANG">Hutang Supplier</option>
            </select>
          </div>

          <Input
            label="Periode"
            value={form.periode}
            onChange={(e) => handleChange("periode", e.target.value)}
            placeholder="Agustus 2026"
          />

          <Input
            label="Keterangan"
            value={form.keterangan}
            onChange={(e) => handleChange("keterangan", e.target.value)}
          />

          <Input
            label="Harga"
            type="number"
            value={form.harga}
            onChange={(e) => handleChange("harga", Number(e.target.value))}
          />

          <Input
            label="Total Operasional"
            readOnly
            value={`Rp ${(form.qty * form.harga).toLocaleString("id-ID")}`}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}/operasional`)}
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
