"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

import {
  pendapatanProyekSchema,
  hitungPendapatanProyek,
  type JenisTransaksiPendapatan,
  type JenisPajakPendapatan,
  type NormalizedPendapatanProyek,
} from "@/lib/validators/pendapatanProyek";

/* ============================================================
   TYPE
============================================================ */

type Proyek = {
  id: string;
  kode_proyek: string;
  nama_proyek: string;
};

type FormState = {
  tanggal: string;
  no_bukti: string;
  jenis_transaksi: JenisTransaksiPendapatan;
  nilai_pendapatan: number;
  jenis_pajak: JenisPajakPendapatan;
  keterangan: string;
};

/* ============================================================
   HELPER
============================================================ */

function getToday(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isProyek(value: unknown): value is Proyek {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    isUuid(item.id) &&
    typeof item.kode_proyek === "string" &&
    typeof item.nama_proyek === "string"
  );
}

function getErrorMessage(value: unknown, fallback: string): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string"
  ) {
    return value.message;
  }

  return fallback;
}

/* ============================================================
   PAGE
============================================================ */

export default function CreatePendapatanProyekPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = typeof params.id === "string" ? params.id : "";

  const [proyek, setProyek] = useState<Proyek | null>(null);
  const [loadingProyek, setLoadingProyek] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>({
    tanggal: getToday(),
    no_bukti: "",
    jenis_transaksi: "TERMIN",
    nilai_pendapatan: 0,
    jenis_pajak: "FINAL_PPH42",
    keterangan: "",
  });

  /* ==========================================================
     LOAD DATA PROYEK
  ========================================================== */

  useEffect(() => {
    const controller = new AbortController();

    async function loadProyek(): Promise<void> {
      if (!proyekId || !isUuid(proyekId)) {
        setProyek(null);
        setLoadingProyek(false);
        return;
      }

      try {
        setLoadingProyek(true);

        const response = await fetch("/api/proyek/master", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        const result: unknown = await response.json();

        if (!response.ok) {
          throw new Error(
            getErrorMessage(result, "Gagal mengambil data proyek."),
          );
        }

        let list: Proyek[] = [];

        if (Array.isArray(result)) {
          list = result.filter(isProyek);
        } else if (
          typeof result === "object" &&
          result !== null &&
          "data" in result &&
          Array.isArray(result.data)
        ) {
          list = result.data.filter(isProyek);
        } else {
          throw new Error("Format data proyek tidak valid.");
        }

        const found = list.find((item) => item.id === proyekId);

        if (!found) {
          throw new Error("Proyek tidak ditemukan.");
        }

        setProyek(found);
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("GET PROJECT PENDAPATAN:", error);

        setProyek(null);

        showToast(
          error instanceof Error
            ? error.message
            : "Gagal mengambil data proyek.",
          "error",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingProyek(false);
        }
      }
    }

    void loadProyek();

    return () => {
      controller.abort();
    };
  }, [proyekId, showToast]);

  /* ==========================================================
     JENIS TRANSAKSI
  ========================================================== */

  function handleJenisTransaksiChange(
    jenisTransaksi: JenisTransaksiPendapatan,
  ): void {
    setForm((previous) => ({
      ...previous,
      jenis_transaksi: jenisTransaksi,
    }));
  }

  const isNonRevenueTransaction =
    form.jenis_transaksi === "UANG_MUKA" ||
    form.jenis_transaksi === "PENERIMAAN_PIUTANG";

  /* ==========================================================
     NORMALIZED DATA UNTUK PERHITUNGAN
  ========================================================== */

  const normalizedForCalculation: NormalizedPendapatanProyek = useMemo(
    () => ({
      id_proyek: proyekId,
      tanggal: form.tanggal,
      no_bukti: form.no_bukti.trim(),
      jenis_transaksi: form.jenis_transaksi,
      keterangan: form.keterangan.trim() || null,
      nilai_pendapatan: form.nilai_pendapatan,
      jenis_pajak: form.jenis_pajak,
      tarif_pajak: form.jenis_pajak === "FINAL_PPH42" ? 2.65 : 2.0,
      klasifikasi_pendapatan:
        form.jenis_pajak === "FINAL_PPH42" ? "FINAL" : "NON_FINAL",
      kode_pajak: null,
      dpp_pajak: form.nilai_pendapatan,
      tanggal_regulasi_pajak: null,
    }),
    [
      proyekId,
      form.tanggal,
      form.no_bukti,
      form.jenis_transaksi,
      form.keterangan,
      form.nilai_pendapatan,
      form.jenis_pajak,
    ],
  );

  const hasilPerhitungan = useMemo(
    () => hitungPendapatanProyek(normalizedForCalculation),
    [normalizedForCalculation],
  );

  const tarifPajak = hasilPerhitungan.tarif_pajak;
  const nilaiPajak = hasilPerhitungan.nilai_pajak;
  const nilaiBersih = hasilPerhitungan.nilai_bersih;

  /* ==========================================================
     KETERANGAN ACCOUNTING
  ========================================================== */

  function getAccountingDescription(): string {
    switch (form.jenis_transaksi) {
      case "TUNAI":
        return "Pembayaran tunai langsung dicatat sebagai kas proyek dan pendapatan. Pajak dihitung otomatis.";

      case "TERMIN":
        return "Pendapatan termin dicatat sebagai piutang proyek dan pendapatan. Pajak dihitung otomatis.";

      case "PENERIMAAN_PIUTANG":
        return "Penerimaan piutang hanya mencatat pelunasan piutang ke kas proyek dan tidak mengakui pendapatan baru.";

      case "UANG_MUKA":
        return "Uang muka dicatat sebagai penerimaan kas dan Uang Muka Proyek. Belum menjadi pendapatan.";

      case "REALISASI_UANG_MUKA":
        return "Realisasi uang muka digunakan untuk mengakui pendapatan proyek sesuai transaksi yang direalisasikan.";

      default: {
        const exhaustiveCheck: never = form.jenis_transaksi;
        return exhaustiveCheck;
      }
    }
  }

  /* ==========================================================
     SUBMIT
  ========================================================== */

  async function handleSubmit(): Promise<void> {
    if (saving) {
      return;
    }

    try {
      if (!isUuid(proyekId)) {
        showToast(
          "ID proyek tidak valid. Form harus dibuka dari proyek yang valid.",
          "error",
        );
        return;
      }

      if (!proyek) {
        showToast("Data proyek belum tersedia.", "error");
        return;
      }

      if (!form.tanggal) {
        showToast("Tanggal pendapatan wajib diisi.", "error");
        return;
      }

      const noBukti = form.no_bukti.trim();

      if (!noBukti) {
        showToast("Nomor bukti wajib diisi.", "error");
        return;
      }

      if (
        !Number.isFinite(form.nilai_pendapatan) ||
        form.nilai_pendapatan <= 0
      ) {
        showToast("Nilai transaksi harus lebih besar dari 0.", "error");
        return;
      }

      /*
       * ID proyek selalu berasal dari URL [id].
       * Tidak mengambil ID proyek dari input form.
       */
      const payload = {
        id_proyek: proyekId,
        tanggal: form.tanggal,
        no_bukti: noBukti,
        jenis_transaksi: form.jenis_transaksi,
        keterangan: form.keterangan.trim() || null,
        nilai_pendapatan: form.nilai_pendapatan,
        jenis_pajak: form.jenis_pajak,
        tarif_pajak: tarifPajak,
        nilai_pajak: nilaiPajak,
        nilai_bersih: nilaiBersih,
        klasifikasi_pendapatan:
          form.jenis_pajak === "FINAL_PPH42" ? "FINAL" : "NON_FINAL",
        kode_pajak: null,
        dpp_pajak: form.nilai_pendapatan,
        tanggal_regulasi_pajak: null,
      };

      const parsed = pendapatanProyekSchema.safeParse(payload);

      if (!parsed.success) {
        showToast(
          parsed.error.issues[0]?.message ??
            "Data pendapatan proyek tidak valid.",
          "error",
        );
        return;
      }

      setSaving(true);

      const response = await fetch("/api/proyek/pendapatan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(result, "Gagal menyimpan pendapatan proyek."),
        );
      }

      showToast("Pendapatan proyek berhasil disimpan.", "success");

      router.push(`/proyek/${proyekId}/pendapatan`);

      router.refresh();
    } catch (error: unknown) {
      console.error("POST PENDAPATAN PROYEK:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan pendapatan proyek.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="mx-auto max-w-4xl">
      <Card title="Tambah Pendapatan Proyek">
        <div className="mb-6 rounded-md border bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Proyek</p>

          {loadingProyek ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat data proyek...
            </div>
          ) : proyek ? (
            <>
              <p className="mt-1 text-base font-semibold text-gray-900">
                {proyek.kode_proyek}
              </p>

              <p className="text-sm text-gray-600">{proyek.nama_proyek}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-red-600">Proyek tidak ditemukan.</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Tanggal Pendapatan"
            type="date"
            value={form.tanggal}
            disabled={saving}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                tanggal: event.target.value,
              }))
            }
          />

          <Input
            label="No. Bukti"
            type="text"
            value={form.no_bukti}
            disabled={saving}
            maxLength={255}
            placeholder="Contoh: INV-PRJ009-001"
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                no_bukti: event.target.value,
              }))
            }
          />

          <div>
            <label className="mb-1 block text-sm font-medium">
              Jenis Transaksi
            </label>

            <select
              className="w-full rounded border px-3 py-2"
              value={form.jenis_transaksi}
              disabled={saving}
              onChange={(event) =>
                handleJenisTransaksiChange(
                  event.target.value as JenisTransaksiPendapatan,
                )
              }
            >
              <option value="TERMIN">TERMIN</option>
              <option value="TUNAI">TUNAI</option>
              <option value="PENERIMAAN_PIUTANG">PENERIMAAN PIUTANG</option>
              <option value="UANG_MUKA">UANG MUKA</option>
              <option value="REALISASI_UANG_MUKA">REALISASI UANG MUKA</option>
            </select>
          </div>

          <Input
            label={
              form.jenis_transaksi === "UANG_MUKA"
                ? "Nilai Uang Muka"
                : form.jenis_transaksi === "PENERIMAAN_PIUTANG"
                  ? "Jumlah Penerimaan"
                  : "Nilai Pendapatan"
            }
            type="number"
            min={0}
            step="0.01"
            value={form.nilai_pendapatan}
            disabled={saving}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                nilai_pendapatan:
                  event.target.value === "" ? 0 : Number(event.target.value),
              }))
            }
          />

          <div>
            <label className="mb-1 block text-sm font-medium">
              Jenis Pajak
            </label>

            <select
              className="w-full rounded border px-3 py-2"
              value={form.jenis_pajak}
              disabled={saving || isNonRevenueTransaction}
              onChange={(event) => {
                const value = event.target.value;

                if (value === "FINAL_PPH42" || value === "NON_FINAL_PPH23") {
                  setForm((previous) => ({
                    ...previous,
                    jenis_pajak: value,
                  }));
                }
              }}
            >
              <option value="FINAL_PPH42">Final PPh 4(2) - 2,65%</option>
              <option value="NON_FINAL_PPH23">Non Final PPh 23 - 2%</option>
            </select>

            {isNonRevenueTransaction && (
              <p className="mt-1 text-xs text-gray-500">
                Transaksi ini tidak mengakui pendapatan baru. Nilai pajak
                transaksi dihitung nol.
              </p>
            )}
          </div>

          <Input
            label="Tarif Pajak"
            type="text"
            value={`${tarifPajak.toFixed(2)}%`}
            disabled
            readOnly
          />

          <Input
            label="Nilai Pajak"
            type="text"
            value={formatRupiah(nilaiPajak)}
            disabled
            readOnly
          />

          <Input
            label="Nilai Bersih"
            type="text"
            value={formatRupiah(nilaiBersih)}
            disabled
            readOnly
          />
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium">Keterangan</label>

          <textarea
            className="w-full rounded border px-3 py-2"
            rows={4}
            maxLength={500}
            value={form.keterangan}
            disabled={saving}
            placeholder="Contoh: Pendapatan termin proyek PRJ-009."
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                keterangan: event.target.value,
              }))
            }
          />

          <p className="mt-1 text-right text-xs text-gray-500">
            {form.keterangan.length}/500
          </p>
        </div>

        <div className="mt-6 rounded-md border bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-900">Accounting</p>

          <p className="mt-1 text-sm text-gray-600">
            {getAccountingDescription()}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded border bg-white p-3">
              <p className="text-xs text-gray-500">Nilai</p>
              <p className="mt-1 font-semibold">
                {formatRupiah(form.nilai_pendapatan)}
              </p>
            </div>

            <div className="rounded border bg-white p-3">
              <p className="text-xs text-gray-500">Pajak</p>
              <p className="mt-1 font-semibold">{formatRupiah(nilaiPajak)}</p>
            </div>

            <div className="rounded border bg-white p-3">
              <p className="text-xs text-gray-500">Bersih</p>
              <p className="mt-1 font-semibold">{formatRupiah(nilaiBersih)}</p>
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            COA tidak dipilih manual. Posting menggunakan mapping PROYEK yang
            sudah tersedia di database.
          </p>
        </div>

        <div className="mt-6 flex gap-3 border-t pt-5">
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => router.push(`/proyek/${proyekId}/pendapatan`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>

          <Button
            onClick={() => void handleSubmit()}
            disabled={saving || loadingProyek || !proyek || !isUuid(proyekId)}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Simpan
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
