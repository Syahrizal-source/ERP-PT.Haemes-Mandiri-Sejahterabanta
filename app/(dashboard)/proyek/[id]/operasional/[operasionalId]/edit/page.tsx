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

type StatusOperasional = "DRAFT" | "POSTED" | "DIBATALKAN";

type OperasionalForm = {
  tanggal: string;
  id_kategori: number;
  uraian: string;
  qty: number;
  satuan: string;
  harga: number;
  supplier: string;
  periode: string;
  metode_pembayaran: MetodePembayaran;
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
  satuan: string | null;
  harga: number;
  total: number;
  supplier: string | null;
  metode_pembayaran: MetodePembayaran;
  periode: string | null;
  status: StatusOperasional;
  id_jurnal: number | null;
  created_by: string | null;
  keterangan: string | null;
  created_at: string | null;
  updated_at: string | null;
  kategori: {
    id: number;
    kode: string;
    nama: string;
    jenis: "BIAYA" | "MATERIAL";
  } | null;
};

type KategoriOperasional = {
  id: number;
  kode: string;
  nama: string;
  jenis: "BIAYA" | "MATERIAL";
  aktif: boolean;
};

// =====================================================
// KATEGORI OPERASIONAL
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

  const [status, setStatus] = useState<StatusOperasional>("DRAFT");

  const [idJurnal, setIdJurnal] = useState<number | null>(null);

  // ===================================================
  // TOTAL
  // ===================================================

  const total = useMemo(() => {
    if (!form) {
      return 0;
    }

    const qty = Number(form.qty);
    const harga = Number(form.harga);

    if (!Number.isFinite(qty) || !Number.isFinite(harga)) {
      return 0;
    }

    return qty * harga;
  }, [form]);

  // ===================================================
  // HANDLE CHANGE
  // ===================================================

  function handleChange<K extends keyof OperasionalForm>(
    key: K,
    value: OperasionalForm[K],
  ): void {
    setForm((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        [key]: value,
      };
    });
  }

  // ===================================================
  // LOAD KATEGORI
  // ===================================================

  useEffect(() => {
    async function loadKategori(): Promise<void> {
      try {
        const response = await fetch("/api/master/kategori-biaya-proyek", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          showToast("Gagal mengambil kategori operasional.", "error");
          return;
        }

        const result: unknown = await response.json();

        if (!Array.isArray(result)) {
          showToast("Data kategori tidak valid.", "error");
          return;
        }

        const data = result as KategoriOperasional[];

        const kategoriOperasional = data.filter(
          (item) =>
            item.aktif &&
            item.jenis === "BIAYA" &&
            KODE_OPERASIONAL.includes(item.kode),
        );

        setKategoriList(kategoriOperasional);
      } catch {
        showToast("Gagal mengambil kategori operasional.", "error");
      }
    }

    void loadKategori();
  }, [showToast]);

  // ===================================================
  // FETCH DETAIL
  // ===================================================

  useEffect(() => {
    async function fetchDetail(): Promise<void> {
      setLoading(true);

      try {
        const response = await fetch(
          `/api/proyek/operasional?id_proyek=${encodeURIComponent(proyekId)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        if (!response.ok) {
          showToast("Gagal mengambil data operasional.", "error");
          return;
        }

        const result: unknown = await response.json();

        if (!Array.isArray(result)) {
          showToast("Data operasional tidak valid.", "error");
          return;
        }

        const data = result as OperasionalResponse[];

        const found = data.find((item) => item.id === operasionalId);

        if (!found) {
          showToast("Data operasional tidak ditemukan.", "error");
          return;
        }

        // Pastikan transaksi memang milik proyek
        if (found.id_proyek !== proyekId) {
          showToast("Operasional tidak sesuai dengan proyek.", "error");
          return;
        }

        setStatus(found.status);
        setIdJurnal(found.id_jurnal);

        setForm({
          tanggal: found.tanggal,
          id_kategori: found.id_kategori,
          uraian: found.uraian,
          qty: Number(found.qty),
          satuan: found.satuan ?? "",
          harga: Number(found.harga),
          supplier: found.supplier ?? "",
          periode: found.periode ?? "",
          metode_pembayaran: found.metode_pembayaran,
          keterangan: found.keterangan ?? "",
        });
      } catch {
        showToast(
          "Terjadi kesalahan saat mengambil data operasional.",
          "error",
        );
      } finally {
        setLoading(false);
      }
    }

    void fetchDetail();
  }, [operasionalId, proyekId, showToast]);

  // ===================================================
  // SUBMIT UPDATE
  // ===================================================

  async function handleSubmit(): Promise<void> {
    if (!form) {
      return;
    }

    // -------------------------------------------------
    // JANGAN EDIT POSTED
    // -------------------------------------------------

    if (idJurnal !== null) {
      showToast(
        "Operasional sudah diposting ke jurnal dan tidak dapat diubah.",
        "error",
      );
      return;
    }

    if (status === "POSTED") {
      showToast(
        "Operasional sudah berstatus POSTED dan tidak dapat diubah.",
        "error",
      );
      return;
    }

    // -------------------------------------------------
    // VALIDASI
    // -------------------------------------------------

    if (!form.tanggal) {
      showToast("Tanggal wajib diisi.", "error");
      return;
    }

    if (form.id_kategori <= 0) {
      showToast("Kategori operasional wajib dipilih.", "error");
      return;
    }

    if (!form.uraian.trim()) {
      showToast("Uraian operasional wajib diisi.", "error");
      return;
    }

    if (!Number.isFinite(form.qty) || form.qty <= 0) {
      showToast("Qty harus lebih besar dari 0.", "error");
      return;
    }

    if (!form.satuan.trim()) {
      showToast("Satuan wajib diisi.", "error");
      return;
    }

    if (!Number.isFinite(form.harga) || form.harga < 0) {
      showToast("Harga tidak boleh negatif.", "error");
      return;
    }

    if (!Number.isFinite(total) || total <= 0) {
      showToast("Total operasional harus lebih besar dari 0.", "error");
      return;
    }

    if (form.supplier.length > 200) {
      showToast("Supplier maksimal 200 karakter.", "error");
      return;
    }

    setSaving(true);

    try {
      // ------------------------------------------------
      // PENTING:
      // id_proyek wajib dikirim karena validator PUT
      // menggunakan proyekOperasionalSchema.
      // ------------------------------------------------

      const response = await fetch(`/api/proyek/operasional/${operasionalId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_proyek: proyekId,
          id_kategori: form.id_kategori,
          tanggal: form.tanggal,
          no_bukti: undefined,
          uraian: form.uraian.trim(),
          qty: form.qty,
          satuan: form.satuan.trim(),
          harga: form.harga,
          supplier: form.supplier.trim() || null,
          metode_pembayaran: form.metode_pembayaran,
          periode: form.periode.trim() || null,
          keterangan: form.keterangan.trim() || null,
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
            : "Gagal update operasional.";

        showToast(message, "error");
        return;
      }

      showToast("Operasional berhasil diperbarui.", "success");

      router.push(`/proyek/${proyekId}/operasional`);

      router.refresh();
    } catch {
      showToast("Terjadi kesalahan saat update operasional.", "error");
    } finally {
      setSaving(false);
    }
  }

  // ===================================================
  // LOADING
  // ===================================================

  if (loading || !form) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Memuat data operasional...
      </div>
    );
  }

  const posted = idJurnal !== null || status === "POSTED";

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="mx-auto max-w-4xl">
      <Card title="Edit Operasional Proyek">
        {/* =============================================
            STATUS POSTING
        ============================================= */}

        {posted && (
          <div className="mb-5 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <div className="font-semibold">Transaksi sudah POSTED</div>

            <div className="mt-1">Nomor jurnal: {idJurnal ?? "-"}</div>

            <div className="mt-1">
              Transaksi yang sudah diposting tidak dapat diubah.
            </div>
          </div>
        )}

        {/* =============================================
            FORM
        ============================================= */}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            disabled={posted || saving}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          {/* NO BUKTI */}

          <Input label="Nomor Bukti" value="Nomor bukti tetap" readOnly />

          {/* KATEGORI */}

          <div>
            <label className="mb-1 block text-sm font-medium">
              Kategori Operasional
            </label>

            <select
              className="w-full rounded-md border p-2"
              value={form.id_kategori}
              disabled={posted || saving}
              onChange={(e) =>
                handleChange("id_kategori", Number(e.target.value))
              }
            >
              <option value={0}>Pilih Jenis Operasional</option>

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
            disabled={posted || saving}
            onChange={(e) => handleChange("uraian", e.target.value)}
          />

          {/* QTY */}

          <Input
            label="Qty"
            type="number"
            min={0}
            step="0.01"
            value={form.qty}
            disabled={posted || saving}
            onChange={(e) => handleChange("qty", Number(e.target.value))}
          />

          {/* SATUAN */}

          <Input
            label="Satuan"
            value={form.satuan}
            disabled={posted || saving}
            onChange={(e) => handleChange("satuan", e.target.value)}
          />

          {/* HARGA */}

          <Input
            label="Harga"
            type="number"
            min={0}
            step="0.01"
            value={form.harga}
            disabled={posted || saving}
            onChange={(e) => handleChange("harga", Number(e.target.value))}
          />

          {/* SUPPLIER */}

          <Input
            label="Supplier"
            value={form.supplier}
            disabled={posted || saving}
            onChange={(e) => handleChange("supplier", e.target.value)}
          />

          {/* METODE PEMBAYARAN */}

          <div>
            <label className="mb-1 block text-sm font-medium">
              Metode Pembayaran
            </label>

            <select
              className="w-full rounded-md border p-2"
              value={form.metode_pembayaran}
              disabled={posted || saving}
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
            disabled={posted || saving}
            onChange={(e) => handleChange("periode", e.target.value)}
          />

          {/* KETERANGAN */}

          <Input
            label="Keterangan"
            value={form.keterangan}
            disabled={posted || saving}
            onChange={(e) => handleChange("keterangan", e.target.value)}
          />

          {/* TOTAL */}

          <Input
            label="Total Operasional"
            value={`Rp ${total.toLocaleString("id-ID")}`}
            readOnly
          />
        </div>

        {/* =============================================
            INFO
        ============================================= */}

        {!posted && (
          <div className="mt-5 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            Operasional ini belum memiliki jurnal. Perubahan masih dapat
            dilakukan.
          </div>
        )}

        {/* =============================================
            ACTION
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

          {!posted && (
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
