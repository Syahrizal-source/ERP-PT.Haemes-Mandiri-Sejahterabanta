"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type CoaKas = {
  id_coa: number;
  kode: string;
  nama: string;
};

type KasbonInput = {
  tanggal: string;
  no_voucher: string;
  deskripsi: string;
  debit: number;
  id_coa_kas: number | null;
};

type ApiErrorResponse = {
  error?: string;
};

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    ("error" in value
      ? typeof value.error === "string" || typeof value.error === "undefined"
      : true)
  );
}

export default function CreateKasbonDireksiPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState<boolean>(false);
  const [loadingKas, setLoadingKas] = useState<boolean>(true);

  const [coaKas, setCoaKas] = useState<CoaKas[]>([]);

  const [form, setForm] = useState<KasbonInput>({
    tanggal: "",
    no_voucher: "",
    deskripsi: "",
    debit: 0,
    id_coa_kas: null,
  });

  /* =========================
     LOAD COA KAS / BANK
  ========================= */

  useEffect(() => {
    let cancelled = false;

    async function loadCoaKas(): Promise<void> {
      try {
        setLoadingKas(true);

        const response = await fetch("/api/kasbon-direksi/coa-kas", {
          method: "GET",
          cache: "no-store",
        });

        const result: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          const message =
            isApiErrorResponse(result) && typeof result.error === "string"
              ? result.error
              : "Gagal mengambil daftar akun kas/bank";

          throw new Error(message);
        }

        if (!Array.isArray(result)) {
          throw new Error("Format data akun kas/bank tidak valid");
        }

        const mapped: CoaKas[] = result.filter(
          (item: unknown): item is CoaKas => {
            if (typeof item !== "object" || item === null) {
              return false;
            }

            if (!("id_coa" in item) || !("kode" in item) || !("nama" in item)) {
              return false;
            }

            const candidate = item as {
              id_coa: unknown;
              kode: unknown;
              nama: unknown;
            };

            return (
              typeof candidate.id_coa === "number" &&
              Number.isInteger(candidate.id_coa) &&
              candidate.id_coa > 0 &&
              typeof candidate.kode === "string" &&
              typeof candidate.nama === "string"
            );
          },
        );

        if (!cancelled) {
          setCoaKas(mapped);
        }
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Gagal mengambil daftar akun kas/bank";

        setCoaKas([]);

        showToast(message, "error");
      } finally {
        if (!cancelled) {
          setLoadingKas(false);
        }
      }
    }

    void loadCoaKas();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  /* =========================
     HANDLE CHANGE
  ========================= */

  function handleChange(field: keyof KasbonInput, value: string): void {
    if (field === "debit") {
      setForm((prev) => ({
        ...prev,
        debit: value === "" ? 0 : Number(value),
      }));

      return;
    }

    if (field === "id_coa_kas") {
      setForm((prev) => ({
        ...prev,
        id_coa_kas: value === "" ? null : Number(value),
      }));

      return;
    }

    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  /* =========================
     SUBMIT
  ========================= */

  async function handleSubmit(): Promise<void> {
    if (loading) {
      return;
    }

    /* =========================
       VALIDASI FORM
    ========================= */

    if (!form.tanggal) {
      await Swal.fire({
        icon: "warning",
        title: "Tanggal belum diisi",
        text: "Silakan pilih tanggal kasbon.",
      });

      return;
    }

    if (!form.no_voucher.trim()) {
      await Swal.fire({
        icon: "warning",
        title: "No Voucher belum diisi",
        text: "Silakan isi nomor voucher.",
      });

      return;
    }

    if (!form.deskripsi.trim()) {
      await Swal.fire({
        icon: "warning",
        title: "Deskripsi belum diisi",
        text: "Silakan isi deskripsi kasbon.",
      });

      return;
    }

    if (!Number.isFinite(form.debit) || form.debit <= 0) {
      await Swal.fire({
        icon: "warning",
        title: "Nilai tidak valid",
        text: "Nilai kasbon harus lebih besar dari 0.",
      });

      return;
    }

    if (
      form.id_coa_kas === null ||
      !Number.isInteger(form.id_coa_kas) ||
      form.id_coa_kas <= 0
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Akun Kas/Bank belum dipilih",
        text:
          "Silakan pilih akun kas atau bank yang digunakan " +
          "untuk membayar kasbon direksi.",
      });

      return;
    }

    /* =========================
       PASTIKAN COA TERPILIH
       ADA DI DAFTAR KAS/BANK
    ========================= */

    const selectedCoa = coaKas.find((coa) => coa.id_coa === form.id_coa_kas);

    if (!selectedCoa) {
      await Swal.fire({
        icon: "warning",
        title: "Akun Kas/Bank tidak valid",
        text:
          "Akun Kas/Bank yang dipilih tidak tersedia " +
          "dalam daftar akun aktif.",
      });

      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/kasbon-direksi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tanggal: form.tanggal,
          no_voucher: form.no_voucher.trim(),
          deskripsi: form.deskripsi.trim(),
          debit: form.debit,
          kredit: 0,
          id_coa_kas: selectedCoa.id_coa,
        }),
      });

      const result: unknown = await response.json().catch(() => null);

      /* =========================
         ERROR API
      ========================= */

      if (!response.ok) {
        const message =
          isApiErrorResponse(result) && typeof result.error === "string"
            ? result.error
            : "Gagal menyimpan kasbon direksi";

        await Swal.fire({
          icon: "error",
          title: "Gagal",
          text: message,
        });

        return;
      }

      /* =========================
         SUCCESS
      ========================= */

      let successMessage =
        "Kasbon Direksi berhasil disimpan dan jurnal terbentuk.";

      if (
        typeof result === "object" &&
        result !== null &&
        "message" in result &&
        typeof result.message === "string"
      ) {
        successMessage = result.message;
      }

      await Swal.fire({
        icon: "success",
        title: "Kasbon Direksi Berhasil",
        text: successMessage,
        confirmButtonText: "OK",
      });

      router.push("/accounting/kasbon-direksi");

      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menyimpan kasbon direksi";

      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: message,
      });
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="max-w-3xl mx-auto">
      <Card title="Tambah Kasbon Direksi">
        <div className="grid grid-cols-2 gap-4">
          {/* =========================
              TANGGAL
          ========================= */}

          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
            disabled={loading}
          />

          {/* =========================
              NO VOUCHER
          ========================= */}

          <Input
            label="No Voucher"
            value={form.no_voucher}
            onChange={(e) => handleChange("no_voucher", e.target.value)}
            disabled={loading}
          />

          {/* =========================
              DESKRIPSI
          ========================= */}

          <Input
            label="Deskripsi"
            value={form.deskripsi}
            onChange={(e) => handleChange("deskripsi", e.target.value)}
            disabled={loading}
          />

          {/* =========================
              NILAI
          ========================= */}

          <Input
            label="Nilai"
            type="number"
            value={form.debit}
            onChange={(e) => handleChange("debit", e.target.value)}
            disabled={loading}
          />

          {/* =========================
              AKUN KAS / BANK
          ========================= */}

          <div className="col-span-2">
            <label
              htmlFor="id_coa_kas"
              className="block text-sm font-medium mb-1"
            >
              Akun Kas / Bank
            </label>

            <select
              id="id_coa_kas"
              value={form.id_coa_kas === null ? "" : String(form.id_coa_kas)}
              onChange={(e) => handleChange("id_coa_kas", e.target.value)}
              disabled={loadingKas || loading}
              className="w-full rounded-md border px-3 py-2 bg-white"
            >
              <option value="">
                {loadingKas ? "Memuat akun kas/bank..." : "Pilih akun kas/bank"}
              </option>

              {coaKas.map((coa) => (
                <option key={coa.id_coa} value={coa.id_coa}>
                  {coa.kode} - {coa.nama}
                </option>
              ))}
            </select>

            {!loadingKas && coaKas.length === 0 && (
              <p className="mt-1 text-sm text-red-600">
                Tidak ada akun kas/bank aktif yang tersedia.
              </p>
            )}
          </div>
        </div>

        {/* =========================
            INFORMASI JURNAL
        ========================= */}

        <div className="mt-4 rounded-md border p-3 text-sm">
          <div className="font-medium">Jurnal Otomatis</div>

          <div className="mt-2 space-y-1">
            <div>
              <span className="font-medium">Debit:</span> Piutang Direksi
            </div>

            <div>
              <span className="font-medium">Kredit:</span> Akun Kas / Bank yang
              dipilih
            </div>
          </div>

          <div className="mt-2 text-xs text-gray-500">
            COA Piutang Direksi ditentukan otomatis melalui mapping
            KASBON_DIREKSI / PIUTANG.
          </div>
        </div>

        {/* =========================
            ACTION
        ========================= */}

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.back()}
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() => void handleSubmit()}
            disabled={loading || loadingKas || coaKas.length === 0}
          >
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
