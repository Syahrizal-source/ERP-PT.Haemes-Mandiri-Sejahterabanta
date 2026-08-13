"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type OperasionalForm = {
  tanggal: string;
  id_kategori: number;
  uraian: string;
  qty: number;
  satuan: string;
  harga: number;
  supplier: string;
  periode: string;
  metode_pembayaran: "KAS" | "BANK" | "HUTANG";
  keterangan: string;
};

type OperasionalResponse = {
  id: string;
  id_proyek: string;
  tanggal: string;
  no_bukti: string;
  id_kategori: number;
  uraian: string;
  qty: number;
  satuan: string;
  harga: number;
  total: number;
  supplier: string | null;
  metode_pembayaran: "KAS" | "BANK" | "HUTANG";
  periode: string | null;
  status: "DRAFT" | "POSTED";
  id_jurnal: number | null;
  created_by: string | null;
  keterangan: string | null;
  kategori: {
    id: number;
    kode: string;
    nama: string;
    jenis: "BIAYA" | "MATERIAL";
  };
};

type KategoriOperasional = {
  id: number;
  kode: string;
  nama: string;
  jenis: "BIAYA" | "MATERIAL";
  aktif: boolean;
};

export default function EditOperasionalPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;
  const operasionalId = params.operasionalId as string;

  const [form, setForm] = useState<OperasionalForm | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [kategoriList, setKategoriList] = useState<KategoriOperasional[]>([]);

  function handleChange<K extends keyof OperasionalForm>(
    key: K,
    value: OperasionalForm[K],
  ): void {
    if (!form) return;
    setForm({ ...form, [key]: value });
  }

  async function fetchDetail(): Promise<void> {
    const res = await fetch(`/api/proyek/operasional?id_proyek=${proyekId}`);

    if (!res.ok) {
      showToast("Gagal mengambil data operasional", "error");
      setLoading(false);
      return;
    }

    const data: OperasionalResponse[] = await res.json();

    const found = data.find((item) => item.id === operasionalId);

    if (!found) {
      showToast("Data tidak ditemukan", "error");
      setLoading(false);
      return;
    }

    setForm({
      tanggal: found.tanggal,
      id_kategori: found.id_kategori,
      uraian: found.uraian,
      qty: found.qty,
      satuan: found.satuan,
      harga: found.harga,
      supplier: found.supplier ?? "",
      periode: found.periode ?? "",
      metode_pembayaran: found.metode_pembayaran,
      keterangan: found.keterangan ?? "",
    });

    setLoading(false);
  }

  async function handleSubmit(): Promise<void> {
    if (!form) return;

    if (form.id_kategori === 0) {
      showToast("Kategori material wajib dipilih", "error");
      return;
    }

    if (!form.satuan.trim()) {
      showToast("Satuan wajib diisi", "error");
      return;
    }

    if (form.qty <= 0) {
      showToast("Qty harus lebih dari 0", "error");
      return;
    }

    if (form.harga <= 0) {
      showToast("Harga harus lebih dari 0", "error");
      return;
    }

    setSaving(true);

    const res = await fetch(`/api/proyek/operasional/${operasionalId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error ?? "Gagal update operasional", "error");
      return;
    }

    showToast("Operasional berhasil diupdate", "success");
    router.push(`/proyek/${proyekId}/operasional`);
    router.refresh();
  }

  useEffect(() => {
    async function loadKategori() {
      const res = await fetch("/api/master/kategori-biaya-proyek");

      if (!res.ok) return;

      const data: KategoriOperasional[] = await res.json();

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

  useEffect(() => {
    void fetchDetail(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operasionalId]);

  if (loading || !form) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data operasional...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Edit Operasional Proyek">
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
                  e.target.value as OperasionalForm["metode_pembayaran"],
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
            label="Total"
            value={new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              maximumFractionDigits: 0,
            }).format(form.qty * form.harga)}
            readOnly
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
                Update
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
