"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type FormState = {
  id_rab: string;
  id_kategori: number;
  uraian: string;
  qty: number;
  satuan: string;
  harga: number;
  tanggal: string;
  keterangan: string;
};

type RABItem = {
  id: string;
  id_proyek: string;
  id_kategori: number;
  kategori: {
    id: number;
    kode: string;
    nama: string;
    jenis: "BIAYA" | "MATERIAL";
  };
  uraian: string;
  volume: number;
  satuan: string;
  harga_satuan: number;
  total: number;
  keterangan: string | null;
};

export default function CreateRAPPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const idProyek = params.id as string;

  const [loading, setLoading] = useState<boolean>(false);

  const [form, setForm] = useState<FormState>({
    id_rab: "",
    id_kategori: 0,
    uraian: "",
    qty: 0,
    satuan: "",
    harga: 0,
    tanggal: "",
    keterangan: "",
  });
  const [rabList, setRabList] = useState<RABItem[]>([]);

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const total: number = form.qty * form.harga;

  useEffect(() => {
    async function loadRAB(): Promise<void> {
      const res = await fetch(`/api/proyek/rab?id_proyek=${idProyek}`);
      if (!res.ok) return;
      const result: RABItem[] = await res.json();
      setRabList(result);
    }
    void loadRAB();
  }, [idProyek]);

  async function handleSubmit(): Promise<void> {
    if (!form.uraian || !form.tanggal) {
      showToast("Data wajib belum lengkap", "error");
      return;
    }

    if (!form.id_rab) {
      showToast("Pilih Item RAB terlebih dahulu", "error");
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
          {/* RAB */}
          <div>
            <label className="text-sm font-medium">Item RAB</label>
            <select
              className="w-full rounded-md border border-gray-300 p-2"
              value={form.id_rab}
              onChange={(e) => {
                const rab = rabList.find((x) => x.id === e.target.value);

                if (!rab) return;

                setForm((prev) => ({
                  ...prev,
                  id_rab: rab.id,
                  id_kategori: rab.id_kategori,
                  uraian: rab.uraian,
                  satuan: rab.satuan,
                  harga: rab.harga_satuan,
                }));
              }}
            >
              <option value="">-- Pilih Item RAB --</option>

              {rabList.map((item) => (
                <option key={item.id} value={item.id}>
                  [{item.kategori.kode}] {item.kategori.nama} - {item.uraian}
                </option>
              ))}
            </select>
          </div>

          {/* TANGGAL */}
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          {/* NAMA ITEM */}
          <Input label="Nama Item" value={form.uraian} readOnly />

          {/* QTY */}
          <Input
            label="Qty"
            type="number"
            value={form.qty}
            onChange={(e) => handleChange("qty", Number(e.target.value))}
          />

          <Input label="Satuan" value={form.satuan} readOnly />

          {/* HARGA */}
          <Input
            label="Harga"
            value={form.harga.toLocaleString("id-ID")}
            readOnly
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
