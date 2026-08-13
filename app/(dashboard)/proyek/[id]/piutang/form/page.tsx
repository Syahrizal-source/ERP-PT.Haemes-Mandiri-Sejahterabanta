"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, RefreshCw } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

// =====================================================
// TYPE
// =====================================================

type StatusPiutangProyek =
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";

type TagihanOption = {
  id: string;
  nomor_invoice: string;
  tanggal: string;
  nilai: number;
  grand_total: number;
  status:
    | "Unpaid (Menunggu Pembayaran)"
    | "Partial (Pembayaran Sebagian)"
    | "Paid (Pembayaran Penuh/ Lunas)";
  id_jurnal: number | null;
};

type FormState = {
  id_proyek: string;
  id_tagihan: string;
  tanggal: string;
  customer: string;
  tanggal_pembayaran: string;
  nilai_piutang: number;
  penerimaan: number;
  keterangan: string;
  status: StatusPiutangProyek;
};

type ApiErrorResponse = {
  error?: string;
};

// =====================================================
// FORMAT RUPIAH
// =====================================================

function formatRupiah(value: number): string {
  return `Rp ${Number(value).toLocaleString("id-ID")}`;
}

// =====================================================
// FORMAT TANGGAL
// =====================================================

function formatTanggal(value: string): string {
  if (!value) {
    return "-";
  }

  const parts = value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// =====================================================
// PAGE
// =====================================================

export default function CreatePiutangProyekPage() {
  const router = useRouter();

  const params = useParams<{
    id: string;
  }>();

  const { showToast } = useToast();

  const proyekId = params.id;
  const [saving, setSaving] = useState(false);
  const [loadingTagihan, setLoadingTagihan] = useState(true);
  const [tagihanList, setTagihanList] = useState<TagihanOption[]>([]);
  const [form, setForm] = useState<FormState>({
    id_proyek: proyekId,
    id_tagihan: "",
    tanggal: "",
    customer: "",
    tanggal_pembayaran: "",
    nilai_piutang: 0,
    penerimaan: 0,
    keterangan: "",
    status: "Unpaid (Menunggu Pembayaran)",
  });

  // ===================================================
  // LOAD TAGIHAN PROYEK
  // ===================================================

  async function loadTagihan(): Promise<void> {
    if (!proyekId) {
      showToast("ID proyek tidak ditemukan.", "error");
      return;
    }

    try {
      setLoadingTagihan(true);

      const res = await fetch(
        `/api/proyek/tagihan?id_proyek=${encodeURIComponent(proyekId)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const result: unknown = await res.json();

      if (!res.ok) {
        const errorResult = result as ApiErrorResponse;

        throw new Error(errorResult.error ?? "Gagal mengambil tagihan proyek.");
      }

      if (!Array.isArray(result)) {
        throw new Error("Format data tagihan tidak valid.");
      }

      const normalized: TagihanOption[] = result
        .map((item: unknown) => {
          const row = item as Record<string, unknown>;

          return {
            id: String(row.id ?? ""),

            nomor_invoice: String(row.nomor_invoice ?? ""),

            tanggal: String(row.tanggal ?? ""),

            nilai: Number(row.nilai ?? 0),

            grand_total: Number(row.grand_total ?? 0),

            status: row.status as TagihanOption["status"],

            id_jurnal:
              row.id_jurnal === null || row.id_jurnal === undefined
                ? null
                : Number(row.id_jurnal),
          };
        })
        .filter(
          (item) =>
            item.id !== "" && item.grand_total > 0 && item.id_jurnal !== null,
        );

      setTagihanList(normalized);
    } catch (error: unknown) {
      console.error("LOAD TAGIHAN PIUTANG ERROR:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Gagal mengambil tagihan proyek.",
        "error",
      );
    } finally {
      setLoadingTagihan(false);
    }
  }

  // ===================================================
  // INITIAL LOAD
  // ===================================================

  useEffect(() => {
    void loadTagihan();
  }, [proyekId]);

  // ===================================================
  // PILIH TAGIHAN
  // ===================================================

  function handleTagihanChange(idTagihan: string): void {
    const selected = tagihanList.find((item) => item.id === idTagihan);

    if (!selected) {
      setForm((previous) => ({
        ...previous,
        id_tagihan: "",
        tanggal: "",
        nilai_piutang: 0,
      }));

      return;
    }

    setForm((previous) => ({
      ...previous,

      id_tagihan: selected.id,

      tanggal: selected.tanggal,

      nilai_piutang: selected.grand_total,

      penerimaan: 0,

      status: "Unpaid (Menunggu Pembayaran)",
    }));
  }

  // ===================================================
  // HANDLE CHANGE
  // ===================================================

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((previous) => {
      const updated = {
        ...previous,
        [field]: value,
      };

      const nilaiPiutang = Number(updated.nilai_piutang);

      const penerimaan = Number(updated.penerimaan);

      const saldo = nilaiPiutang - penerimaan;

      if (!Number.isFinite(penerimaan) || penerimaan < 0) {
        updated.status = "Unpaid (Menunggu Pembayaran)";

        return updated;
      }

      if (saldo === 0) {
        updated.status = "Paid (Pembayaran Penuh/ Lunas)";
      } else if (penerimaan > 0) {
        updated.status = "Partial (Pembayaran Sebagian)";
      } else {
        updated.status = "Unpaid (Menunggu Pembayaran)";
      }

      return updated;
    });
  }

  // ===================================================
  // SUBMIT
  // ===================================================

  async function handleSubmit(): Promise<void> {
    if (!proyekId) {
      showToast("ID proyek tidak ditemukan.", "error");
      return;
    }

    if (!form.id_tagihan) {
      showToast("Tagihan proyek wajib dipilih.", "error");
      return;
    }

    if (!form.tanggal) {
      showToast("Tanggal wajib diisi.", "error");
      return;
    }

    if (form.customer.trim().length < 2) {
      showToast("Customer wajib diisi.", "error");
      return;
    }

    if (!Number.isFinite(form.nilai_piutang) || form.nilai_piutang <= 0) {
      showToast("Nilai piutang harus lebih besar dari 0.", "error");
      return;
    }

    if (!Number.isFinite(form.penerimaan) || form.penerimaan < 0) {
      showToast("Penerimaan tidak boleh minus.", "error");
      return;
    }

    if (form.penerimaan > form.nilai_piutang) {
      showToast("Penerimaan tidak boleh melebihi nilai piutang.", "error");
      return;
    }

    // =================================================
    // PASTIKAN NILAI SESUAI TAGIHAN
    // =================================================

    const selected = tagihanList.find((item) => item.id === form.id_tagihan);

    if (!selected) {
      showToast("Tagihan yang dipilih tidak ditemukan.", "error");
      return;
    }

    if (selected.id_jurnal === null) {
      showToast("Tagihan belum Posted dan belum memiliki jurnal.", "error");
      return;
    }

    if (Number(form.nilai_piutang) !== Number(selected.grand_total)) {
      showToast(
        "Nilai piutang harus sama dengan Grand Total tagihan.",
        "error",
      );
      return;
    }

    try {
      setSaving(true);

      // =================================================
      // PENTING:
      // saldo TIDAK dikirim karena database GENERATED.
      // =================================================

      const payload = {
        id_proyek: proyekId,

        id_tagihan: form.id_tagihan,

        tanggal: form.tanggal,

        customer: form.customer.trim(),

        tanggal_pembayaran: form.tanggal_pembayaran || null,

        nilai_piutang: form.nilai_piutang,

        penerimaan: form.penerimaan,

        keterangan: form.keterangan.trim() || null,

        status: form.status,
      };

      console.log("POST PIUTANG PROYEK:", payload);

      const res = await fetch("/api/proyek/piutang", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      });

      const result: unknown = await res.json();

      if (!res.ok) {
        const errorResult = result as ApiErrorResponse;

        throw new Error(errorResult.error ?? "Gagal menyimpan piutang proyek.");
      }

      showToast("Piutang proyek berhasil dibuat.", "success");

      router.push(`/proyek/${proyekId}/piutang`);

      router.refresh();
    } catch (error: unknown) {
      console.error("CREATE PIUTANG PROYEK ERROR:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan piutang proyek.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="mx-auto max-w-5xl">
      <Card title="Tambah Piutang Proyek">
        <div className="mb-6">
          <p className="text-sm text-gray-500">
            Hubungkan piutang dengan tagihan proyek yang sudah memiliki jurnal
            Posted.
          </p>
        </div>

        {/* =================================================
            TAGIHAN
        ================================================= */}

        <div className="mb-6 rounded-lg border bg-gray-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium">Tagihan Proyek</label>

            <Button
              variant="secondary"
              onClick={() => {
                void loadTagihan();
              }}
              disabled={loadingTagihan}
            >
              {loadingTagihan ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>

          <select
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            value={form.id_tagihan}
            onChange={(event) => handleTagihanChange(event.target.value)}
            disabled={saving || loadingTagihan}
          >
            <option value="">-- Pilih tagihan Posted --</option>

            {tagihanList.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nomor_invoice} - {formatRupiah(item.grand_total)}
              </option>
            ))}
          </select>

          {tagihanList.length === 0 && !loadingTagihan && (
            <p className="mt-2 text-xs text-red-600">
              Belum ada tagihan Posted yang dapat dibuat menjadi piutang.
            </p>
          )}
        </div>

        {/* =================================================
            DETAIL TAGIHAN
        ================================================= */}

        {form.id_tagihan && (
          <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg border p-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500">No Invoice</p>

              <p className="font-semibold">
                {
                  tagihanList.find((item) => item.id === form.id_tagihan)
                    ?.nomor_invoice
                }
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Tanggal Tagihan</p>

              <p className="font-semibold">{formatTanggal(form.tanggal)}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Grand Total</p>

              <p className="font-semibold">
                {formatRupiah(form.nilai_piutang)}
              </p>
            </div>
          </div>
        )}

        {/* =================================================
            FORM
        ================================================= */}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            disabled
            onChange={() => {
              return;
            }}
          />

          <Input
            label="Customer"
            value={form.customer}
            onChange={(event) => handleChange("customer", event.target.value)}
            placeholder="Nama customer"
          />

          <Input
            label="Tanggal Pembayaran"
            type="date"
            value={form.tanggal_pembayaran}
            onChange={(event) =>
              handleChange("tanggal_pembayaran", event.target.value)
            }
          />

          <Input
            label="Nilai Piutang"
            type="number"
            value={form.nilai_piutang}
            disabled
            onChange={() => {
              return;
            }}
          />

          <Input
            label="Penerimaan"
            type="number"
            min={0}
            value={form.penerimaan}
            onChange={(event) =>
              handleChange("penerimaan", Number(event.target.value))
            }
          />

          {/* ===============================================
              SALDO
              Hanya preview.
              Tidak dikirim ke API.
          =============================================== */}

          <div>
            <label className="mb-1 block text-sm font-medium">Saldo</label>

            <input
              type="text"
              value={formatRupiah(
                Math.max(0, form.nilai_piutang - form.penerimaan),
              )}
              disabled
              readOnly
              className="w-full rounded-md border bg-gray-100 px-3 py-2 text-sm"
            />

            <p className="mt-1 text-xs text-gray-500">
              Saldo final dihitung oleh database.
            </p>
          </div>

          {/* ===============================================
              STATUS
          =============================================== */}

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Status</label>

            <input
              type="text"
              value={form.status}
              disabled
              readOnly
              className="w-full rounded-md border bg-gray-100 px-3 py-2 text-sm"
            />

            <p className="mt-1 text-xs text-gray-500">
              Status dihitung otomatis berdasarkan penerimaan.
            </p>
          </div>

          {/* ===============================================
              KETERANGAN
          =============================================== */}

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Keterangan</label>

            <textarea
              rows={4}
              value={form.keterangan}
              onChange={(event) =>
                handleChange("keterangan", event.target.value)
              }
              placeholder="Keterangan piutang..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* =================================================
            SUMMARY
        ================================================= */}

        <div className="mt-6 rounded-lg border bg-gray-50 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500">Nilai Piutang</p>

              <p className="text-lg font-semibold">
                {formatRupiah(form.nilai_piutang)}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Penerimaan</p>

              <p className="text-lg font-semibold">
                {formatRupiah(form.penerimaan)}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Sisa</p>

              <p className="text-lg font-semibold">
                {formatRupiah(
                  Math.max(0, form.nilai_piutang - form.penerimaan),
                )}
              </p>
            </div>
          </div>
        </div>

        {/* =================================================
            ACTION
        ================================================= */}

        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}/piutang`)}
            disabled={saving}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={saving || loadingTagihan || !form.id_tagihan}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Simpan Piutang
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
