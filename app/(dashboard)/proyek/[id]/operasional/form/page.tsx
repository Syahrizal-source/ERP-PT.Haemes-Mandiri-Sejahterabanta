"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

// =====================================================
// TYPES
// =====================================================

type MetodePembayaran = "KAS" | "KAS_BESAR" | "KAS_KECIL" | "BANK" | "HUTANG";

type FormState = {
  tanggal: string;
  id_kategori: number;
  qty: number;
  satuan: string;
  harga: number;
  uraian: string;
  supplier: string;
  periode: string;
  metode_pembayaran: MetodePembayaran;
  keterangan: string;
};

type KategoriBiayaProyek = {
  id: number;
  kode: string;
  nama: string;
  jenis: "MATERIAL" | "BIAYA";
  aktif: boolean;
};

// =====================================================
// KODE KATEGORI OPERASIONAL
// =====================================================

const KODE_OPERASIONAL: readonly string[] = [
  "BBM",
  "OLI",
  "SPAREPART",
  "TRANSPORTASI",
  "AKOMODASI",
  "KONSUMSI",
  "PERIZINAN",
  "OVERHEAD",
  "LAINNYA",
];

// =====================================================
// PAGE
// =====================================================

export default function TambahOperasionalPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;

  // ===================================================
  // FORM
  // ===================================================

  const [form, setForm] = useState<FormState>({
    tanggal: new Date().toISOString().slice(0, 10),
    id_kategori: 0,
    qty: 1,
    satuan: "",
    harga: 0,
    uraian: "",
    supplier: "",
    periode: "",
    metode_pembayaran: "BANK",
    keterangan: "",
  });

  // ===================================================
  // STATE
  // ===================================================

  const [saving, setSaving] = useState<boolean>(false);

  const [loadingKategori, setLoadingKategori] = useState<boolean>(true);

  const [kategoriList, setKategoriList] = useState<KategoriBiayaProyek[]>([]);

  // ===================================================
  // TOTAL
  // ===================================================

  const total = useMemo(() => {
    const qty = Number(form.qty);
    const harga = Number(form.harga);

    if (!Number.isFinite(qty) || !Number.isFinite(harga)) {
      return 0;
    }

    return qty * harga;
  }, [form.qty, form.harga]);

  // ===================================================
  // HANDLE CHANGE
  // ===================================================

  function handleChange<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  // ===================================================
  // LOAD KATEGORI
  // ===================================================

  useEffect(() => {
    async function loadKategori(): Promise<void> {
      setLoadingKategori(true);

      try {
        const response = await fetch("/api/master/kategori-biaya-proyek", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          showToast("Gagal mengambil kategori biaya proyek.", "error");
          return;
        }

        const result: unknown = await response.json();

        if (!Array.isArray(result)) {
          showToast("Data kategori biaya proyek tidak valid.", "error");
          return;
        }

        const data = result as KategoriBiayaProyek[];

        const kategoriOperasional = data.filter(
          (item) =>
            item.aktif &&
            item.jenis === "BIAYA" &&
            KODE_OPERASIONAL.includes(item.kode),
        );

        setKategoriList(kategoriOperasional);
      } catch {
        showToast("Terjadi kesalahan saat mengambil kategori.", "error");
      } finally {
        setLoadingKategori(false);
      }
    }

    void loadKategori();
  }, [showToast]);

  // ===================================================
  // SUBMIT
  // ===================================================

  async function handleSubmit(): Promise<void> {
    // -----------------------------------------------
    // VALIDASI PROYEK
    // -----------------------------------------------

    if (!proyekId) {
      showToast("ID proyek tidak ditemukan.", "error");
      return;
    }

    // -----------------------------------------------
    // VALIDASI TANGGAL
    // -----------------------------------------------

    if (!form.tanggal) {
      showToast("Tanggal wajib diisi.", "error");
      return;
    }

    // -----------------------------------------------
    // VALIDASI KATEGORI
    // -----------------------------------------------

    if (form.id_kategori <= 0) {
      showToast("Kategori operasional wajib dipilih.", "error");
      return;
    }

    // -----------------------------------------------
    // VALIDASI URAIAN
    // -----------------------------------------------

    if (!form.uraian.trim()) {
      showToast("Uraian operasional wajib diisi.", "error");
      return;
    }

    // -----------------------------------------------
    // VALIDASI QTY
    // -----------------------------------------------

    if (!Number.isFinite(form.qty) || form.qty <= 0) {
      showToast("Qty harus lebih besar dari nol.", "error");
      return;
    }

    // -----------------------------------------------
    // VALIDASI SATUAN
    // -----------------------------------------------

    if (!form.satuan.trim()) {
      showToast("Satuan wajib diisi.", "error");
      return;
    }

    // -----------------------------------------------
    // VALIDASI HARGA
    // -----------------------------------------------

    if (!Number.isFinite(form.harga) || form.harga < 0) {
      showToast("Harga tidak boleh negatif.", "error");
      return;
    }

    // -----------------------------------------------
    // VALIDASI TOTAL
    // -----------------------------------------------

    if (!Number.isFinite(total) || total <= 0) {
      showToast("Total operasional harus lebih besar dari nol.", "error");
      return;
    }

    // -----------------------------------------------
    // SUPPLIER
    // -----------------------------------------------

    if (form.supplier.trim().length > 200) {
      showToast("Nama supplier maksimal 200 karakter.", "error");
      return;
    }

    // -----------------------------------------------
    // SIMPAN
    // -----------------------------------------------

    setSaving(true);

    try {
      const response = await fetch("/api/proyek/operasional", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_proyek: proyekId,
          id_kategori: form.id_kategori,
          tanggal: form.tanggal,

          // no_bukti sengaja tidak dikirim.
          // API akan membuat nomor otomatis.

          uraian: form.uraian.trim(),

          qty: form.qty,

          satuan: form.satuan.trim(),

          harga: form.harga,

          supplier: form.supplier.trim() || null,

          metode_pembayaran: form.metode_pembayaran,

          periode: form.periode.trim() || null,

          keterangan: form.keterangan.trim() || null,

          // Jangan kirim:
          // total
          // status
          // id_jurnal
          // created_by
          //
          // Semua tersebut ditangani backend.
        }),
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Operasional proyek gagal disimpan.";

        showToast(message, "error");
        return;
      }

      showToast(
        "Operasional proyek berhasil ditambahkan dan diposting.",
        "success",
      );

      router.push(`/proyek/${proyekId}/operasional`);

      router.refresh();
    } catch {
      showToast("Terjadi kesalahan saat menyimpan operasional.", "error");
    } finally {
      setSaving(false);
    }
  }

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="mx-auto max-w-4xl">
      <Card title="Tambah Operasional Proyek">
        {/* =============================================
            FORM
        ============================================= */}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* TANGGAL */}

          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          {/* KATEGORI */}

          <div>
            <label className="mb-1 block text-sm font-medium">
              Kategori Operasional
            </label>

            <select
              className="w-full rounded-md border p-2"
              value={form.id_kategori}
              disabled={loadingKategori || saving}
              onChange={(e) =>
                handleChange("id_kategori", Number(e.target.value))
              }
            >
              <option value={0}>
                {loadingKategori
                  ? "Memuat kategori..."
                  : "Pilih Jenis Operasional"}
              </option>

              {kategoriList.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.kode} - {item.nama}
                </option>
              ))}
            </select>
          </div>

          {/* URAIAN */}

          <Input
            label="Uraian Operasional"
            value={form.uraian}
            onChange={(e) => handleChange("uraian", e.target.value)}
            placeholder="Contoh: Pembelian BBM operasional proyek"
          />

          {/* SUPPLIER */}

          <Input
            label="Supplier"
            value={form.supplier}
            onChange={(e) => handleChange("supplier", e.target.value)}
            placeholder="Nama supplier"
          />

          {/* QTY */}

          <Input
            label="Qty"
            type="number"
            min={0}
            step="0.01"
            value={form.qty}
            onChange={(e) => handleChange("qty", Number(e.target.value))}
          />

          {/* SATUAN */}

          <Input
            label="Satuan"
            value={form.satuan}
            onChange={(e) => handleChange("satuan", e.target.value)}
            placeholder="Liter / Unit / Hari / LS"
          />

          {/* HARGA */}

          <Input
            label="Harga"
            type="number"
            min={0}
            step="0.01"
            value={form.harga}
            onChange={(e) => handleChange("harga", Number(e.target.value))}
          />

          {/* METODE PEMBAYARAN */}

          <div>
            <label className="mb-1 block text-sm font-medium">
              Metode Pembayaran
            </label>

            <select
              className="w-full rounded-md border p-2"
              value={form.metode_pembayaran}
              disabled={saving}
              onChange={(e) =>
                handleChange(
                  "metode_pembayaran",
                  e.target.value as MetodePembayaran,
                )
              }
            >
              <option value="KAS">Kas</option>

              <option value="KAS_BESAR">Kas Besar</option>

              <option value="KAS_KECIL">Kas Kecil</option>

              <option value="BANK">Bank</option>

              <option value="HUTANG">Hutang Supplier</option>
            </select>
          </div>

          {/* PERIODE */}

          <Input
            label="Periode"
            value={form.periode}
            onChange={(e) => handleChange("periode", e.target.value)}
            placeholder="Agustus 2026"
          />

          {/* TOTAL */}

          <Input
            label="Total Operasional"
            readOnly
            value={`Rp ${total.toLocaleString("id-ID")}`}
          />

          {/* KETERANGAN */}

          <Input
            label="Keterangan"
            value={form.keterangan}
            onChange={(e) => handleChange("keterangan", e.target.value)}
            placeholder="Keterangan tambahan"
          />
        </div>

        {/* =============================================
            INFO POSTING
        ============================================= */}

        <div className="mt-5 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <div className="font-medium">Transaksi langsung diposting</div>

          <div className="mt-1">
            Setelah disimpan, sistem akan membuat nomor bukti otomatis dan
            memposting jurnal berdasarkan kategori operasional serta metode
            pembayaran yang dipilih.
          </div>
        </div>

        {/* =============================================
            BUTTON
        ============================================= */}

        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => router.push(`/proyek/${proyekId}/operasional`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>

          <Button onClick={handleSubmit} disabled={saving || loadingKategori}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan & Posting...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Simpan & Posting
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
