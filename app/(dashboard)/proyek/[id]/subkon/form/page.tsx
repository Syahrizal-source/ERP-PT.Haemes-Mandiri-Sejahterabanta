"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type MetodePembayaran = "KAS" | "BANK" | "HUTANG";

type StatusSubkon = "AKTIF" | "SELESAI" | "DIBATALKAN";

type FormState = {
  tanggal: string;
  id_kategori: number;
  nama_vendor: string;
  pekerjaan: string;
  nilai_kontrak: number;
  metode_pembayaran: MetodePembayaran;
  periode: string;
  status: StatusSubkon;
  keterangan: string;
};

type KategoriBiayaProyek = {
  id: number;
  kode: string;
  nama: string;
  jenis: "BIAYA" | "MATERIAL";
  aktif: boolean;
};

export default function TambahSubkonPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;

  const [form, setForm] = useState<FormState>({
    tanggal: new Date().toISOString().slice(0, 10),
    id_kategori: 0,
    nama_vendor: "",
    pekerjaan: "",
    nilai_kontrak: 0,
    metode_pembayaran: "BANK",
    periode: "",
    status: "AKTIF",
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
      showToast("Kategori subkon wajib dipilih.", "error");
      return;
    }

    if (!form.nama_vendor.trim()) {
      showToast("Nama vendor wajib diisi.", "error");
      return;
    }

    if (!form.pekerjaan.trim()) {
      showToast("Pekerjaan wajib diisi.", "error");
      return;
    }

    if (form.nilai_kontrak <= 0) {
      showToast("Nilai kontrak harus lebih besar dari nol.", "error");
      return;
    }

    if (!form.periode.trim()) {
      showToast("Periode wajib diisi.", "error");
      return;
    }

    setSaving(true);

    const res = await fetch("/api/proyek/subkon", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id_proyek: proyekId,
        tanggal: form.tanggal,
        id_kategori: form.id_kategori,
        nama_vendor: form.nama_vendor.trim(),
        pekerjaan: form.pekerjaan.trim(),
        nilai_kontrak: form.nilai_kontrak,
        metode_pembayaran: form.metode_pembayaran,
        periode: form.periode.trim() || null,
        status: form.status,
        keterangan: form.keterangan.trim() || null,
      }),
    });

    const result = await res.json();

    console.log(result);

    if (!res.ok) {
      console.error(result);
      showToast(result.error ?? "Terjadi kesalahan", "error");
      return;
    }

    showToast("Subkon berhasil ditambahkan", "success");
    router.push(`/proyek/${proyekId}/subkon`);
    router.refresh();
  }

  useEffect(() => {
    async function loadKategori(): Promise<void> {
      try {
        const res = await fetch("/api/master/kategori-biaya-proyek");

        if (!res.ok) {
          showToast("Gagal mengambil kategori biaya proyek.", "error");
          return;
        }

        const data: KategoriBiayaProyek[] = await res.json();

        /*
         * Subkon menggunakan kategori SUBKON.
         * Tetap mengambil dari master kategori biaya
         * proyek agar ID kategori berasal dari database.
         */
        const kategoriSubkon = data.filter(
          (item) => item.aktif && item.kode === "SUBKON",
        );

        setKategoriList(kategoriSubkon);
      } catch (error: unknown) {
        console.error("LOAD KATEGORI SUBKON ERROR:", error);

        showToast("Gagal mengambil kategori subkon.", "error");
      }
    }

    void loadKategori();
  }, [showToast]);

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Tambah Subkon Proyek">
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
              <option value={0}>Pilih</option>

              {kategoriList.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nama}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Nama Vendor"
            value={form.nama_vendor}
            onChange={(e) => handleChange("nama_vendor", e.target.value)}
          />

          <Input
            label="Pekerjaan"
            value={form.pekerjaan}
            onChange={(e) => handleChange("pekerjaan", e.target.value)}
          />

          <Input
            label="Nilai Kontrak"
            type="number"
            value={form.nilai_kontrak}
            onChange={(e) =>
              handleChange("nilai_kontrak", Number(e.target.value))
            }
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
            placeholder=""
          />

          <div>
            <label className="mb-1 block text-sm font-medium">Status</label>
            <select
              className="w-full rounded-md border p-2"
              value={form.status}
              onChange={(e) =>
                handleChange("status", e.target.value as StatusSubkon)
              }
            >
              <option value="AKTIF">AKTIF</option>
              <option value="SELESAI">SELESAI</option>
              <option value="DIBATALKAN">DIBATALKAN</option>
            </select>
          </div>

          <Input
            label="Keterangan"
            value={form.keterangan}
            onChange={(e) => handleChange("keterangan", e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}/subkon`)}
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
