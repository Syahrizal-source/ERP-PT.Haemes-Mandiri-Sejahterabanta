"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type MetodePembayaranHutang = "KAS" | "KAS_BESAR" | "KAS_KECIL" | "BANK";

type PembayaranHutang = {
  id: string;
  id_hutang: string;
  tanggal: string;
  jumlah: number | string;
  metode: string | null;
  bank: string | null;
  created_at?: string;
};

type HutangStatus =
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";

type HutangItem = {
  id: string;
  id_proyek: string;
  supplier: string | null;
  tanggal: string | null;
  nilai: number | string;
  jatuh_tempo: string | null;
  status: HutangStatus | null;
  no_bukti: string | null;
  periode: string | null;
  jumlah_pembayaran: number | string;
  sisa: number | string;
};

type PembayaranForm = {
  tanggal: string;
  jumlah: number;
  metode: MetodePembayaranHutang;
  bank: string;
};

type PembayaranGetResponse = {
  success?: boolean;
  data?: PembayaranHutang;
  error?: string;
  detail?: string;
};

type HutangGetResponse = {
  success?: boolean;
  data?: HutangItem[];
  error?: string;
  detail?: string;
};

type UpdateResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  detail?: string;
};

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getMetodeLabel(metode: MetodePembayaranHutang): string {
  switch (metode) {
    case "KAS":
      return "Kas Proyek";

    case "KAS_BESAR":
      return "Kas Besar";

    case "KAS_KECIL":
      return "Kas Kecil";

    case "BANK":
      return "Bank";

    default:
      return metode;
  }
}

function isMetodePembayaranHutang(
  value: string | null,
): value is MetodePembayaranHutang {
  return (
    value === "KAS" ||
    value === "KAS_BESAR" ||
    value === "KAS_KECIL" ||
    value === "BANK"
  );
}

export default function EditPembayaranHutangPage() {
  const params = useParams<{
    id: string;
    pembayaranId: string;
  }>();

  const router = useRouter();

  const proyekId = params.id;
  const pembayaranId = params.pembayaranId;

  const [form, setForm] = useState<PembayaranForm>({
    tanggal: "",
    jumlah: 0,
    metode: "BANK",
    bank: "",
  });

  const [pembayaran, setPembayaran] = useState<PembayaranHutang | null>(null);

  const [hutang, setHutang] = useState<HutangItem | null>(null);

  const [loading, setLoading] = useState<boolean>(true);

  const [saving, setSaving] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string>("");

  /*
   * ============================================================
   * LOAD PEMBAYARAN
   * ============================================================
   */
  useEffect(() => {
    let cancelled = false;

    async function fetchData(): Promise<void> {
      try {
        setLoading(true);
        setErrorMessage("");

        /*
         * Ambil detail pembayaran.
         *
         * API detail:
         * /api/proyek/pembayaran-hutang/[pembayaranId]
         */
        const pembayaranResponse = await fetch(
          `/api/proyek/pembayaran-hutang/${pembayaranId}`,
        );

        const pembayaranResult: unknown = await pembayaranResponse.json();

        if (!pembayaranResponse.ok) {
          const apiResult = pembayaranResult as PembayaranGetResponse;

          throw new Error(
            apiResult.error ??
              apiResult.detail ??
              "Gagal mengambil data pembayaran hutang.",
          );
        }

        const pembayaranApi = pembayaranResult as PembayaranGetResponse;

        if (!pembayaranApi.data || typeof pembayaranApi.data !== "object") {
          throw new Error("Data pembayaran hutang tidak valid.");
        }

        const payment = pembayaranApi.data;

        if (cancelled) {
          return;
        }

        setPembayaran({
          ...payment,
          jumlah: Number(payment.jumlah),
        });

        const metode = isMetodePembayaranHutang(payment.metode)
          ? payment.metode
          : "BANK";

        setForm({
          tanggal: payment.tanggal ?? "",
          jumlah: Number(payment.jumlah),
          metode,
          bank: payment.bank ?? "",
        });

        /*
         * ========================================================
         * AMBIL HUTANG INDUK
         * ========================================================
         *
         * Data tetap berasal dari proyek_hutang.
         */
        const hutangResponse = await fetch(
          `/api/proyek/hutang?id_proyek=${encodeURIComponent(proyekId)}`,
        );

        const hutangResult: unknown = await hutangResponse.json();

        if (!hutangResponse.ok) {
          const apiResult = hutangResult as HutangGetResponse;

          throw new Error(
            apiResult.error ??
              apiResult.detail ??
              "Gagal mengambil data hutang proyek.",
          );
        }

        const hutangApi = hutangResult as HutangGetResponse;

        if (!hutangApi.success || !Array.isArray(hutangApi.data)) {
          throw new Error("Format response hutang proyek tidak valid.");
        }

        const parentHutang = hutangApi.data.find(
          (item) => item.id === payment.id_hutang,
        );

        if (!parentHutang) {
          throw new Error("Hutang induk pembayaran tidak ditemukan.");
        }

        if (cancelled) {
          return;
        }

        setHutang({
          ...parentHutang,
          nilai: Number(parentHutang.nilai),
          jumlah_pembayaran: Number(parentHutang.jumlah_pembayaran),
          sisa: Number(parentHutang.sisa),
        });
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        console.error("GET EDIT PEMBAYARAN HUTANG:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Gagal mengambil data pembayaran hutang.",
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
  }, [proyekId, pembayaranId]);

  /*
   * ============================================================
   * UPDATE
   * ============================================================
   */
  async function handleSubmit(): Promise<void> {
    if (saving) {
      return;
    }

    if (!pembayaran || !hutang) {
      window.alert("Data pembayaran atau hutang tidak ditemukan.");
      return;
    }

    if (!form.tanggal) {
      window.alert("Tanggal pembayaran wajib diisi.");
      return;
    }

    if (!Number.isFinite(form.jumlah) || form.jumlah <= 0) {
      window.alert("Jumlah pembayaran harus lebih besar dari 0.");
      return;
    }

    if (!form.metode) {
      window.alert("Metode pembayaran wajib dipilih.");
      return;
    }

    if (form.metode === "BANK" && !form.bank.trim()) {
      window.alert("Bank wajib diisi untuk pembayaran melalui bank.");
      return;
    }

    /*
     * ==========================================================
     * HITUNG BATAS PEMBAYARAN
     * ==========================================================
     *
     * Karena pembayaran yang sedang diedit sudah termasuk
     * dalam jumlah_pembayaran hutang, maka:
     *
     * batas pembayaran =
     * sisa hutang sekarang + jumlah pembayaran lama
     */
    const jumlahPembayaranLama = Number(pembayaran.jumlah);

    const sisaSekarang = Number(hutang.sisa);

    const maksimumPembayaran = sisaSekarang + jumlahPembayaranLama;

    if (form.jumlah > maksimumPembayaran) {
      window.alert(
        `Jumlah pembayaran tidak boleh melebihi ${formatRupiah(
          maksimumPembayaran,
        )}.`,
      );
      return;
    }

    setSaving(true);

    try {
      /*
       * ========================================================
       * JANGAN KIRIM COA
       * ========================================================
       *
       * Tidak mengirim:
       *
       * id_coa
       * id_coa_hutang
       * id_coa_kas
       * id_jurnal
       * status
       * sisa
       * jumlah_pembayaran
       *
       * Semua accounting ditangani backend.
       */
      const payload = {
        id_hutang: pembayaran.id_hutang,
        tanggal: form.tanggal,
        jumlah: form.jumlah,
        metode: form.metode,
        bank: form.metode === "BANK" ? form.bank.trim() : null,
      };

      const response = await fetch(
        `/api/proyek/pembayaran-hutang/${pembayaranId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result: unknown = await response.json();

      const apiResult = result as UpdateResponse;

      if (!response.ok) {
        throw new Error(
          apiResult.error ??
            apiResult.detail ??
            "Gagal mengupdate pembayaran hutang.",
        );
      }

      window.alert(apiResult.message ?? "Pembayaran hutang berhasil diupdate.");

      router.push(`/proyek/${proyekId}/pembayaran-hutang`);

      router.refresh();
    } catch (error: unknown) {
      console.error("UPDATE PEMBAYARAN HUTANG:", error);

      window.alert(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengupdate pembayaran hutang.",
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */
  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card title="Edit Pembayaran Hutang Proyek">
          <div className="py-8 text-center text-gray-500">
            Memuat data pembayaran hutang...
          </div>
        </Card>
      </div>
    );
  }

  /*
   * ============================================================
   * ERROR
   * ============================================================
   */
  if (errorMessage) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card title="Edit Pembayaran Hutang Proyek">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-medium">Gagal memuat pembayaran hutang</p>

            <p className="mt-1 text-sm">{errorMessage}</p>

            <div className="mt-4">
              <Button
                variant="secondary"
                onClick={() =>
                  router.push(`/proyek/${proyekId}/pembayaran-hutang`)
                }
              >
                Kembali
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!pembayaran || !hutang) {
    return null;
  }

  /*
   * ============================================================
   * FORM
   * ============================================================
   */
  return (
    <div className="mx-auto max-w-4xl">
      <Card title="Edit Pembayaran Hutang Proyek">
        {/* ======================================================
            INFORMASI HUTANG INDUK
        ======================================================= */}
        <div className="mb-6 rounded-lg border bg-gray-50 p-4">
          <p className="font-medium">Informasi Hutang</p>

          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500">No. Bukti</p>

              <p className="font-medium">{hutang.no_bukti ?? "-"}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Supplier</p>

              <p className="font-medium">{hutang.supplier ?? "-"}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Nilai Hutang</p>

              <p className="font-medium">
                {formatRupiah(Number(hutang.nilai))}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Pembayaran Lama</p>

              <p className="font-medium">
                {formatRupiah(Number(pembayaran.jumlah))}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Sisa Saat Ini</p>

              <p className="font-semibold">
                {formatRupiah(Number(hutang.sisa))}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Status</p>

              <p className="font-medium">{hutang.status ?? "-"}</p>
            </div>
          </div>
        </div>

        {/* ======================================================
            FORM PEMBAYARAN
        ======================================================= */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            type="date"
            label="Tanggal Pembayaran"
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
            label="Jumlah Pembayaran"
            min={0}
            value={form.jumlah}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                jumlah: Number(event.target.value),
              }))
            }
            disabled={saving}
          />

          <div>
            <label htmlFor="metode" className="mb-1 block text-sm font-medium">
              Metode Pembayaran
            </label>

            <select
              id="metode"
              value={form.metode}
              disabled={saving}
              onChange={(event) => {
                const value = event.target.value;

                if (!isMetodePembayaranHutang(value)) {
                  return;
                }

                setForm((previous) => ({
                  ...previous,
                  metode: value,
                  bank: value === "BANK" ? previous.bank : "",
                }));
              }}
              className="w-full rounded-md border px-3 py-2"
            >
              <option value="BANK">Bank</option>

              <option value="KAS">Kas Proyek</option>

              <option value="KAS_BESAR">Kas Besar</option>

              <option value="KAS_KECIL">Kas Kecil</option>
            </select>
          </div>

          {form.metode === "BANK" && (
            <Input
              label="Bank"
              value={form.bank}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  bank: event.target.value,
                }))
              }
              placeholder="Contoh: Mandiri"
              disabled={saving}
            />
          )}
        </div>

        {/* ======================================================
            ACCOUNTING
        ======================================================= */}
        <div className="mt-6 rounded-lg border bg-gray-50 p-4">
          <p className="font-medium">Informasi Accounting</p>

          <p className="mt-1 text-sm text-gray-600">
            COA tidak dapat dipilih atau diubah dari form ini. Sistem
            menggunakan COA mapping PROYEK yang telah ditetapkan di database.
          </p>

          <p className="mt-2 text-xs text-gray-500">
            Hutang menggunakan mapping <strong>PROYEK / HUTANG</strong>,
            sedangkan akun kredit mengikuti metode pembayaran: KAS, KAS_BESAR,
            KAS_KECIL, atau BANK.
          </p>
        </div>

        {/* ======================================================
            PERINGATAN EDIT
        ======================================================= */}
        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm font-medium text-yellow-800">Perhatian</p>

          <p className="mt-1 text-xs text-yellow-700">
            Perubahan jumlah pembayaran akan memengaruhi saldo dan status
            hutang. Backend harus menghitung ulang saldo hutang dan jurnal
            pembayaran berdasarkan nilai terbaru.
          </p>
        </div>

        {/* ======================================================
            BUTTON
        ======================================================= */}
        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}/pembayaran-hutang`)}
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
            {saving ? "Menyimpan..." : "Update Pembayaran"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
