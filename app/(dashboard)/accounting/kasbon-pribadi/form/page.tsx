"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

/**
 * ============================================================
 * COA KAS / BANK
 * ============================================================
 */
type CoaKas = {
  id_coa: number;
  kode: string;
  nama: string;
};

/**
 * ============================================================
 * FORM INPUT KASBON PRIBADI
 * ============================================================
 *
 * COA Piutang tidak dipilih di form.
 *
 * Piutang otomatis:
 *   KASBON_PRIBADI / PIUTANG
 *   → 2518
 *   → 12006 Piutang Karyawan Internal
 *
 * COA Kas/Bank dipilih berdasarkan transaksi.
 */
type KasbonPribadiInput = {
  tanggal: string;
  no_voucher: string;
  deskripsi: string;
  debit: number;
  kredit: number;
  id_coa_kas: number | null;
};

/**
 * ============================================================
 * RESPONSE API
 * ============================================================
 */
type CoaKasApiResponse = CoaKas[];

/**
 * ============================================================
 * PAGE
 * ============================================================
 */
export default function CreateKasbonPribadiPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingCoa, setLoadingCoa] = useState(true);

  const [coaKas, setCoaKas] = useState<CoaKas[]>([]);

  const [form, setForm] = useState<KasbonPribadiInput>({
    tanggal: "",
    no_voucher: "",
    deskripsi: "",
    debit: 0,
    kredit: 0,
    id_coa_kas: null,
  });

  /**
   * ==========================================================
   * LOAD COA KAS / BANK
   * ==========================================================
   *
   * Endpoint hanya mengembalikan COA:
   *   - aktif
   *   - is_cash = true
   *   - is_header = false
   *
   * Tidak mengambil COA PIUTANG.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadCoaKas(): Promise<void> {
      try {
        setLoadingCoa(true);

        const res = await fetch("/api/kasbon-pribadi/coa-kasbon-pribadi", {
          method: "GET",
          cache: "no-store",
        });

        const result: unknown = await res.json();

        if (!res.ok) {
          const message =
            typeof result === "object" &&
            result !== null &&
            "error" in result &&
            typeof result.error === "string"
              ? result.error
              : "Gagal mengambil akun kas/bank";

          throw new Error(message);
        }

        if (!Array.isArray(result)) {
          throw new Error("Format data COA kas/bank tidak valid");
        }

        const mapped: CoaKas[] = result
          .filter(
            (item): item is Record<string, unknown> =>
              typeof item === "object" && item !== null,
          )
          .map((item) => ({
            id_coa: Number(item.id_coa),
            kode: String(item.kode),
            nama: String(item.nama),
          }))
          .filter((item) => Number.isInteger(item.id_coa) && item.id_coa > 0);

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
            : "Gagal mengambil akun kas/bank";

        setCoaKas([]);

        await Swal.fire({
          icon: "error",
          title: "Gagal Memuat COA",
          text: message,
        });
      } finally {
        if (!cancelled) {
          setLoadingCoa(false);
        }
      }
    }

    void loadCoaKas();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * ==========================================================
   * HANDLE CHANGE
   * ==========================================================
   */
  function handleChange(field: keyof KasbonPribadiInput, value: string): void {
    setForm((prev) => {
      if (field === "debit") {
        return {
          ...prev,
          debit: Number(value),
        };
      }

      if (field === "kredit") {
        return {
          ...prev,
          kredit: Number(value),
        };
      }

      if (field === "id_coa_kas") {
        return {
          ...prev,
          id_coa_kas: value === "" ? null : Number(value),
        };
      }

      if (
        field === "tanggal" ||
        field === "no_voucher" ||
        field === "deskripsi"
      ) {
        return {
          ...prev,
          [field]: value,
        };
      }

      return prev;
    });
  }

  /**
   * ==========================================================
   * SUBMIT
   * ==========================================================
   */
  async function handleSubmit(): Promise<void> {
    if (!form.tanggal) {
      await Swal.fire({
        icon: "warning",
        title: "Tanggal Wajib Diisi",
        text: "Silakan pilih tanggal kasbon pribadi.",
      });
      return;
    }

    if (!form.no_voucher.trim()) {
      await Swal.fire({
        icon: "warning",
        title: "No Voucher Wajib Diisi",
        text: "Silakan isi nomor voucher.",
      });
      return;
    }

    if (!form.deskripsi.trim()) {
      await Swal.fire({
        icon: "warning",
        title: "Deskripsi Wajib Diisi",
        text: "Silakan isi deskripsi kasbon.",
      });
      return;
    }

    if (!Number.isFinite(form.debit) || form.debit <= 0) {
      await Swal.fire({
        icon: "warning",
        title: "Nominal Tidak Valid",
        text: "Nominal kasbon pribadi harus lebih dari 0.",
      });
      return;
    }

    /**
     * Kasbon baru tidak menggunakan kredit.
     */
    if (!Number.isFinite(form.kredit) || form.kredit !== 0) {
      await Swal.fire({
        icon: "warning",
        title: "Kredit Tidak Valid",
        text: "Kredit harus 0 untuk transaksi kasbon pribadi.",
      });
      return;
    }

    /**
     * COA Kas/Bank wajib dipilih.
     */
    if (
      form.id_coa_kas === null ||
      !Number.isInteger(form.id_coa_kas) ||
      form.id_coa_kas <= 0
    ) {
      await Swal.fire({
        icon: "warning",
        title: "COA Kas/Bank Wajib Dipilih",
        text: "Silakan pilih akun kas atau bank yang digunakan.",
      });
      return;
    }

    setLoading(true);

    try {
      /**
       * Jangan kirim COA Piutang.
       *
       * Backend akan mengambil:
       *
       * KASBON_PRIBADI / PIUTANG
       * → 2518
       * → 12006 Piutang Karyawan Internal
       */
      const payload: KasbonPribadiInput = {
        tanggal: form.tanggal,
        no_voucher: form.no_voucher.trim(),
        deskripsi: form.deskripsi.trim(),
        debit: form.debit,
        kredit: 0,
        id_coa_kas: form.id_coa_kas,
      };

      const res = await fetch("/api/kasbon-pribadi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result: unknown = await res.json();

      if (!res.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Gagal menyimpan kasbon pribadi";

        throw new Error(message);
      }

      const message =
        typeof result === "object" &&
        result !== null &&
        "message" in result &&
        typeof result.message === "string"
          ? result.message
          : "Kasbon Pribadi berhasil disimpan & jurnal terbentuk";

      await Swal.fire({
        icon: "success",
        title: "Kasbon Pribadi Berhasil",
        text: message,
        confirmButtonText: "OK",
      });

      router.push("/accounting/kasbon-pribadi");
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal menyimpan kasbon pribadi";

      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: message,
      });
    } finally {
      setLoading(false);
    }
  }

  /**
   * ==========================================================
   * RENDER
   * ==========================================================
   */
  return (
    <div className="max-w-3xl mx-auto">
      <Card title="Tambah Kasbon Pribadi">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            label="No Voucher"
            value={form.no_voucher}
            onChange={(e) => handleChange("no_voucher", e.target.value)}
          />

          <Input
            label="Deskripsi"
            value={form.deskripsi}
            onChange={(e) => handleChange("deskripsi", e.target.value)}
          />

          <Input
            label="Debit"
            type="number"
            min="0"
            value={form.debit}
            onChange={(e) => handleChange("debit", e.target.value)}
          />

          <Input
            label="Kredit"
            type="number"
            min="0"
            value={form.kredit}
            onChange={(e) => handleChange("kredit", e.target.value)}
            disabled
          />

          {/* ==================================================
              COA KAS / BANK
              ================================================== */}
          <div className="flex flex-col gap-1">
            <label htmlFor="id_coa_kas" className="text-sm font-medium">
              Kas / Bank
            </label>

            <select
              id="id_coa_kas"
              value={form.id_coa_kas ?? ""}
              onChange={(e) => handleChange("id_coa_kas", e.target.value)}
              disabled={loading || loadingCoa || coaKas.length === 0}
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-gray-500 disabled:bg-gray-100"
            >
              <option value="">
                {loadingCoa
                  ? "Memuat akun kas/bank..."
                  : coaKas.length === 0
                    ? "Tidak ada akun kas/bank"
                    : "Pilih Kas / Bank"}
              </option>

              {coaKas.map((coa) => (
                <option key={coa.id_coa} value={coa.id_coa}>
                  {coa.kode} - {coa.nama}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ====================================================
            INFORMASI JURNAL
            ==================================================== */}
        <div className="mt-5 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm">
          <div className="font-medium mb-2">Jurnal Kasbon Pribadi</div>

          <div className="space-y-1 text-gray-700">
            <div>
              <span className="font-medium">Debit:</span> 12006 - Piutang
              Karyawan Internal
            </div>

            <div>
              <span className="font-medium">Kredit:</span> Kas / Bank yang
              dipilih
            </div>
          </div>
        </div>

        {/* ====================================================
            BUTTON
            ==================================================== */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/accounting/kasbon-pribadi")}
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={loading || loadingCoa || coaKas.length === 0}
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
