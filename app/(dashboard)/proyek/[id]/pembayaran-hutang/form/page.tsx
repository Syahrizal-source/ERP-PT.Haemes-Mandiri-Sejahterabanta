"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Card from "@/components/ui/Card";
import { useToast } from "@/components/ui/toast-context";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

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
  jumlah_pembayaran: number | string;
  sisa: number | string;
};

type HutangApiResponse = {
  success?: boolean;
  data?: HutangItem[];
  error?: string;
};

type FormState = {
  id_hutang: string;
  tanggal: string;
  jumlah: number;
  metode: "KAS" | "KAS_BESAR" | "KAS_KECIL" | "BANK";
  bank: string;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  error?: string;
};

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function FormPembayaranHutangPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const router = useRouter();
  const { showToast } = useToast();

  const [hutang, setHutang] = useState<HutangItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [form, setForm] = useState<FormState>({
    id_hutang: "",
    tanggal: new Date().toISOString().slice(0, 10),
    jumlah: 0,
    metode: "BANK",
    bank: "",
  });

  useEffect(() => {
    async function loadHutang(): Promise<void> {
      try {
        setLoading(true);

        /*
         * PENTING:
         * Pembayaran mengambil DATA HUTANG
         * dari endpoint hutang proyek.
         */
        const response = await fetch(
          `/api/proyek/hutang?id_proyek=${encodeURIComponent(id)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const result: unknown = await response.json();

        if (!response.ok) {
          const errorData = result as HutangApiResponse;

          throw new Error(errorData.error ?? "Gagal mengambil hutang proyek.");
        }

        let rows: HutangItem[] = [];

        /*
         * Mendukung response lama:
         * [...]
         */
        if (Array.isArray(result)) {
          rows = result;
        } else {
          /*
           * Mendukung response baru:
           * { success: true, data: [...] }
           */
          const apiResult = result as HutangApiResponse;

          if (!apiResult.success || !Array.isArray(apiResult.data)) {
            throw new Error("Format data hutang proyek tidak valid.");
          }

          rows = apiResult.data;
        }

        /*
         * Normalisasi angka dari Supabase.
         */
        const normalizedRows: HutangItem[] = rows.map((item) => ({
          ...item,
          nilai: Number(item.nilai),
          jumlah_pembayaran: Number(item.jumlah_pembayaran ?? 0),
          sisa: Number(item.sisa ?? item.nilai),
        }));

        /*
         * Hanya hutang yang masih mempunyai saldo.
         */
        const belumLunas = normalizedRows.filter(
          (item) =>
            Number(item.sisa) > 0 &&
            item.status !== "Paid (Pembayaran Penuh/ Lunas)",
        );

        setHutang(belumLunas);
      } catch (error: unknown) {
        console.error("GET HUTANG UNTUK PEMBAYARAN:", error);

        showToast(
          error instanceof Error
            ? error.message
            : "Gagal menyimpan pembayaran hutang.",
          "error",
        );
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      void loadHutang();
    }
  }, [id]);

  const selectedHutang =
    hutang.find((item) => item.id === form.id_hutang) ?? null;

  function handleHutangChange(hutangId: string): void {
    const selected = hutang.find((item) => item.id === hutangId);

    if (!selected) {
      setForm((previous) => ({
        ...previous,
        id_hutang: hutangId,
        jumlah: 0,
      }));

      return;
    }

    setForm((previous) => ({
      ...previous,
      id_hutang: hutangId,
      jumlah: Number(selected.sisa),
    }));
  }

  async function handleSubmit(): Promise<void> {
    if (saving) {
      return;
    }

    if (!form.id_hutang) {
      showToast("Hutang wajib dipilih.", "error");
      return;
    }

    if (!form.tanggal) {
      showToast("Tanggal pembayaran wajib diisi.", "error");
      return;
    }

    if (!Number.isFinite(form.jumlah) || form.jumlah <= 0) {
      showToast("Jumlah pembayaran harus lebih besar dari 0.", "error");
      return;
    }

    if (!selectedHutang) {
      window.alert("Data hutang tidak ditemukan.");
      return;
    }

    const sisa = Number(selectedHutang.sisa);

    if (form.jumlah > sisa) {
      showToast(
        `Jumlah pembayaran tidak boleh melebihi sisa hutang ${formatRupiah(sisa)}.`,
        "error",
      );
      return;
    }

    if (form.metode === "BANK" && !form.bank.trim()) {
      window.alert("Bank wajib diisi untuk pembayaran melalui bank.");

      return;
    }

    setSaving(true);

    try {
      /*
       * TIDAK ADA COA DI FORM.
       *
       * Backend yang menentukan:
       *
       * PROYEK + HUTANG
       * PROYEK + KAS
       * PROYEK + KAS_BESAR
       * PROYEK + KAS_KECIL
       * PROYEK + BANK
       */

      const response = await fetch("/api/proyek/pembayaran-hutang", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_hutang: form.id_hutang,
          tanggal: form.tanggal,
          jumlah: form.jumlah,
          metode: form.metode,
          bank: form.metode === "BANK" ? form.bank.trim() : null,
        }),
      });

      const result: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Gagal menyimpan pembayaran hutang.");
      }

      showToast(
        result.message ??
          "Pembayaran hutang proyek berhasil disimpan dan diposting.",
        "success",
      );

      router.push(`/proyek/${id}/pembayaran-hutang`);

      router.refresh();
    } catch (error: unknown) {
      console.error("POST PEMBAYARAN HUTANG:", error);

      window.alert(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan pembayaran hutang.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card title="Pembayaran Hutang Proyek">
          <p>Memuat hutang proyek...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Card title="Tambah Pembayaran Hutang Proyek">
        {hutang.length === 0 ? (
          <div className="rounded-lg border p-6 text-center">
            <p className="font-medium">Tidak ada hutang yang dapat dibayar.</p>

            <p className="mt-1 text-sm text-gray-500">
              Semua hutang proyek sudah lunas atau belum tersedia.
            </p>

            <div className="mt-6">
              <Button
                variant="secondary"
                onClick={() => router.push(`/proyek/${id}/pembayaran-hutang`)}
              >
                Kembali
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="id_hutang"
                  className="mb-1 block text-sm font-medium"
                >
                  Hutang Proyek
                </label>

                <select
                  id="id_hutang"
                  value={form.id_hutang}
                  onChange={(event) => handleHutangChange(event.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  disabled={saving}
                >
                  <option value="">Pilih hutang</option>

                  {hutang.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.no_bukti ?? "-"} - {item.supplier ?? "-"} -{" "}
                      {formatRupiah(Number(item.sisa))}
                    </option>
                  ))}
                </select>
              </div>

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
              />

              <div>
                <label
                  htmlFor="metode"
                  className="mb-1 block text-sm font-medium"
                >
                  Metode Pembayaran
                </label>

                <select
                  id="metode"
                  value={form.metode}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      metode: event.target.value as FormState["metode"],
                      bank: event.target.value === "BANK" ? previous.bank : "",
                    }))
                  }
                  className="w-full rounded-md border px-3 py-2"
                  disabled={saving}
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

            {selectedHutang && (
              <div className="mt-6 rounded-lg border bg-gray-50 p-4">
                <p className="font-medium">Informasi Hutang</p>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-xs text-gray-500">No. Bukti</p>

                    <p className="font-medium">
                      {selectedHutang.no_bukti ?? "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Supplier</p>

                    <p className="font-medium">
                      {selectedHutang.supplier ?? "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Nilai Hutang</p>

                    <p className="font-medium">
                      {formatRupiah(Number(selectedHutang.nilai))}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Sudah Dibayar</p>

                    <p className="font-medium">
                      {formatRupiah(Number(selectedHutang.jumlah_pembayaran))}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Sisa Hutang</p>

                    <p className="font-semibold">
                      {formatRupiah(Number(selectedHutang.sisa))}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Jatuh Tempo</p>

                    <p className="font-medium">
                      {selectedHutang.jatuh_tempo ?? "-"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 rounded-lg border bg-gray-50 p-4">
              <p className="font-medium">Informasi Accounting</p>

              <p className="mt-1 text-sm text-gray-600">
                COA tidak dipilih dari form. Sistem mengambil COA hutang dan COA
                kas/bank melalui mapping COA modul PROYEK.
              </p>

              <p className="mt-2 text-xs text-gray-500">
                Pembayaran akan mengurangi saldo hutang dan membuat jurnal
                pembayaran secara otomatis.
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => router.push(`/proyek/${id}/pembayaran-hutang`)}
              >
                Kembali
              </Button>

              <Button
                disabled={saving}
                onClick={() => {
                  void handleSubmit();
                }}
              >
                {saving ? "Menyimpan..." : "Simpan & Posting"}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
