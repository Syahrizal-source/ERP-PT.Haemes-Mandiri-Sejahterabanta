"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

/* ============================================================
   TYPE
============================================================ */

type HutangStatus =
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";

type HutangItem = {
  id: string;
  id_proyek: string;
  id_kategori: number | null;

  supplier: string | null;
  tanggal: string | null;
  nilai: number | string;

  jatuh_tempo: string | null;
  status: HutangStatus | null;

  no_bukti: string | null;
  periode: string | null;

  id_jurnal: number | null;
  sumber: string | null;
  id_referensi: string | null;

  jumlah_pembayaran: number | string;
  sisa: number | string;

  tanggal_pembayaran: string | null;
  keterangan: string | null;

  created_at?: string;
  updated_at?: string;
};

type HutangForm = {
  supplier: string;
  tanggal: string;
  nilai: number;
  jatuh_tempo: string;
  periode: string;
  keterangan: string;
};

type HutangGetResponse = {
  success: boolean;
  data?: HutangItem[];
  error?: string;
  detail?: string;
};

type HutangUpdateResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  detail?: string;
};

/* ============================================================
   PAGE
============================================================ */

export default function EditHutangPage() {
  const params = useParams<{
    id: string;
    hutangId: string;
  }>();

  const router = useRouter();

  const proyekId = params.id;
  const hutangId = params.hutangId;

  const [form, setForm] = useState<HutangForm>({
    supplier: "",
    tanggal: "",
    nilai: 0,
    jatuh_tempo: "",
    periode: "",
    keterangan: "",
  });

  const [loading, setLoading] = useState<boolean>(true);

  const [saving, setSaving] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string>("");

  /* ============================================================
     LOAD DATA
  ============================================================ */

  useEffect(() => {
    let cancelled = false;

    async function fetchData(): Promise<void> {
      try {
        setLoading(true);
        setErrorMessage("");

        const response = await fetch(
          `/api/proyek/hutang?id_proyek=${encodeURIComponent(proyekId)}`,
        );

        const result: unknown = await response.json();

        if (!response.ok) {
          const apiResult = result as HutangGetResponse;

          throw new Error(
            apiResult.error ?? "Gagal mengambil data hutang proyek.",
          );
        }

        const apiResult = result as HutangGetResponse;

        if (!apiResult.success || !Array.isArray(apiResult.data)) {
          throw new Error("Format response hutang proyek tidak valid.");
        }

        const row = apiResult.data.find((item) => item.id === hutangId);

        if (!row) {
          throw new Error("Data hutang proyek tidak ditemukan.");
        }

        if (cancelled) {
          return;
        }

        setForm({
          supplier: row.supplier ?? "",
          tanggal: row.tanggal ?? "",
          nilai: Number(row.nilai),
          jatuh_tempo: row.jatuh_tempo ?? "",
          periode: row.periode ?? "",
          keterangan: row.keterangan ?? "",
        });
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        console.error("GET DETAIL HUTANG PROYEK:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Gagal mengambil data hutang proyek.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [proyekId, hutangId]);

  /* ============================================================
     UPDATE
  ============================================================ */

  async function handleSubmit(): Promise<void> {
    if (saving) {
      return;
    }

    /* ----------------------------------------------------------
       VALIDASI FORM
    ---------------------------------------------------------- */

    const supplier = form.supplier.trim();

    const periode = form.periode.trim();

    const keterangan = form.keterangan.trim();

    if (!supplier) {
      window.alert("Supplier wajib diisi.");
      return;
    }

    if (!form.tanggal) {
      window.alert("Tanggal hutang wajib diisi.");
      return;
    }

    if (!Number.isFinite(form.nilai) || form.nilai <= 0) {
      window.alert("Nilai hutang harus lebih besar dari 0.");
      return;
    }

    if (form.jatuh_tempo && form.jatuh_tempo < form.tanggal) {
      window.alert("Jatuh tempo tidak boleh lebih kecil dari tanggal hutang.");
      return;
    }

    setSaving(true);

    try {
      /* --------------------------------------------------------
         PENTING:

         Tidak mengirim:
         - id_coa
         - id_coa_beban
         - id_jurnal
         - sumber
         - id_referensi
         - jumlah_pembayaran
         - sisa
         - status

         COA tetap dikelola backend melalui
         coa_mapping PROYEK.
      -------------------------------------------------------- */

      const payload = {
        supplier,
        tanggal: form.tanggal,
        nilai: form.nilai,
        jatuh_tempo: form.jatuh_tempo || null,
        periode: periode || null,
        keterangan: keterangan || null,
      };

      const response = await fetch(`/api/proyek/hutang/${hutangId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result: unknown = await response.json();

      const apiResult = result as HutangUpdateResponse;

      if (!response.ok) {
        throw new Error(
          apiResult.error ??
            apiResult.detail ??
            "Gagal mengupdate hutang proyek.",
        );
      }

      window.alert(apiResult.message ?? "Hutang proyek berhasil diupdate.");

      router.push(`/proyek/${proyekId}/hutang`);

      router.refresh();
    } catch (error: unknown) {
      console.error("UPDATE HUTANG PROYEK:", error);

      window.alert(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengupdate hutang proyek.",
      );
    } finally {
      setSaving(false);
    }
  }

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card title="Edit Hutang Proyek">
          <div className="py-8 text-center text-gray-500">
            Memuat data hutang...
          </div>
        </Card>
      </div>
    );
  }

  /* ============================================================
     ERROR
  ============================================================ */

  if (errorMessage) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card title="Edit Hutang Proyek">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-medium">Gagal memuat hutang proyek</p>

            <p className="mt-1 text-sm">{errorMessage}</p>

            <div className="mt-4">
              <Button
                variant="secondary"
                onClick={() => router.push(`/proyek/${proyekId}/hutang`)}
              >
                Kembali
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  /* ============================================================
     FORM
  ============================================================ */

  return (
    <div className="mx-auto max-w-4xl">
      <Card title="Edit Hutang Proyek">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Supplier"
            value={form.supplier}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                supplier: event.target.value,
              }))
            }
            placeholder="Nama supplier"
            disabled={saving}
          />

          <Input
            type="date"
            label="Tanggal Hutang"
            value={form.tanggal}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                tanggal: event.target.value,
              }))
            }
            disabled={saving}
          />

          <Input
            type="number"
            label="Nilai Hutang"
            min={0}
            value={form.nilai}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                nilai: Number(event.target.value),
              }))
            }
            disabled={saving}
          />

          <Input
            type="date"
            label="Jatuh Tempo"
            value={form.jatuh_tempo}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                jatuh_tempo: event.target.value,
              }))
            }
            disabled={saving}
          />

          <Input
            label="Periode"
            value={form.periode}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                periode: event.target.value,
              }))
            }
            placeholder="Contoh: Agustus 2026"
            disabled={saving}
          />

          <Input
            label="Keterangan"
            value={form.keterangan}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                keterangan: event.target.value,
              }))
            }
            placeholder="Keterangan hutang"
            disabled={saving}
          />
        </div>

        {/* ======================================================
            ACCOUNTING INFORMATION
        ======================================================= */}

        <div className="mt-6 rounded-lg border bg-gray-50 p-4">
          <p className="font-medium">Informasi Accounting</p>

          <p className="mt-1 text-sm text-gray-600">
            COA tidak dapat diubah dari form ini. Posting accounting menggunakan
            COA mapping proyek yang telah ditetapkan di database.
          </p>

          <p className="mt-2 text-xs text-gray-500">
            Data jurnal, pembayaran, saldo hutang, dan referensi accounting
            tidak diubah langsung melalui form ini.
          </p>
        </div>

        {/* ======================================================
            BUTTON
        ======================================================= */}

        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}/hutang`)}
            disabled={saving}
          >
            Kembali
          </Button>

          <Button
            onClick={() => {
              void handleSubmit();
            }}
            disabled={saving}
          >
            {saving ? "Menyimpan..." : "Update"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
