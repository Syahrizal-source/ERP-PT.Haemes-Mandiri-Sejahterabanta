"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import Swal from "sweetalert2";

import { ArrowLeft, Loader2, Save } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

/* ============================================================
 * TYPE
 * ============================================================ */

type PpnStatus = "UNPAID" | "PARTIAL" | "PAID";

interface Ppn {
  id: number;
  id_transaksi: number;
  jenis_ppn: "keluaran" | "masukan";
  nilai_dasar: number;
  tarif_ppn: number;
  nilai_ppn: number;
  tanggal_transaksi: string;
  nomor_seri: string | null;
  vendor_id: number | null;
  keterangan: string | null;
  nilai_transaksi: number;
  terbayar: number;
  sisa: number;
  status: PpnStatus;
}

interface CoaKas {
  id_coa: number;
  kode: string;
  nama: string;
  is_cash: boolean;
  is_header: boolean;
  aktif: boolean;
}

interface PembayaranPpn {
  id: number;
  tanggal: string;
  id_ppn: number;
  nominal: number;
  keterangan: string;
  id_coa_kas: number;
  id_jurnal: number | null;
  created_at: string;
}

interface FormState {
  tanggal: string;
  id_ppn: number;
  id_coa_kas: number;
  nominal: number;
  keterangan: string;
}

/* ============================================================
 * CONSTANT
 * ============================================================ */

const PPN_HUTANG_COA_ID = 53;
const PPN_HUTANG_COA_LABEL = "53 - 21301 Hutang Pajak PPN";

const PPN_ENDPOINT = "/api/ppn";
const PAYMENT_ENDPOINT = "/api/pembayaran-ppn";
const COA_ENDPOINT = "/api/coa";

/* ============================================================
 * PAGE
 * ============================================================ */

export default function Page(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const id: string = typeof params?.id === "string" ? params.id : "";

  const [data, setData] = useState<PembayaranPpn | null>(null);

  const [ppnList, setPpnList] = useState<Ppn[]>([]);

  const [coaKasList, setCoaKasList] = useState<CoaKas[]>([]);

  const [form, setForm] = useState<FormState>({
    tanggal: "",
    id_ppn: 0,
    id_coa_kas: 0,
    nominal: 0,
    keterangan: "",
  });

  const [loading, setLoading] = useState<boolean>(true);

  const [loadingPpn, setLoadingPpn] = useState<boolean>(true);

  const [loadingCoa, setLoadingCoa] = useState<boolean>(true);

  const [saving, setSaving] = useState<boolean>(false);

  /* ==========================================================
   * SELECTED DATA
   * ========================================================== */

  const selectedPpn: Ppn | undefined = ppnList.find(
    (item: Ppn): boolean => item.id === form.id_ppn,
  );

  const selectedCoaKas: CoaKas | undefined = coaKasList.find(
    (item: CoaKas): boolean => item.id_coa === form.id_coa_kas,
  );

  /*
   * Karena pembayaran lama sudah termasuk dalam
   * perhitungan sisa PPN, saat edit pembayaran ini
   * sendiri harus ditambahkan kembali ke batas maksimal.
   */
  const maxPayment: number = selectedPpn
    ? selectedPpn.id === data?.id_ppn
      ? Math.max(selectedPpn.sisa + (data?.nominal ?? 0), 0)
      : Math.max(selectedPpn.sisa, 0)
    : 0;

  const nominal: number = Number.isFinite(form.nominal)
    ? Math.max(form.nominal, 0)
    : 0;

  /* ==========================================================
   * LOAD PAYMENT
   * ========================================================== */

  useEffect(() => {
    let active = true;

    async function loadPayment(): Promise<void> {
      if (!id) {
        return;
      }

      try {
        setLoading(true);

        const response = await fetch(
          `${PAYMENT_ENDPOINT}/${encodeURIComponent(id)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const result: unknown = await readJsonSafely(response);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(result, "Gagal mengambil data pembayaran PPN."),
          );
        }

        const payment: PembayaranPpn = normalizePembayaranPpn(result);

        if (!active) {
          return;
        }

        setData(payment);

        setForm({
          tanggal: payment.tanggal,
          id_ppn: payment.id_ppn,
          id_coa_kas: payment.id_coa_kas,
          nominal: payment.nominal,
          keterangan: payment.keterangan,
        });
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        console.error("LOAD PAYMENT PPN ERROR:", error);

        await Swal.fire(
          "Error",
          getUnknownErrorMessage(error, "Gagal mengambil data pembayaran PPN."),
          "error",
        );

        router.back();
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPayment();

    return () => {
      active = false;
    };
  }, [id, router]);

  /* ==========================================================
   * LOAD PPN
   * ========================================================== */

  useEffect(() => {
    let active = true;

    async function loadPpn(): Promise<void> {
      try {
        setLoadingPpn(true);

        const [ppnResponse, paymentResponse] = await Promise.all([
          fetch(PPN_ENDPOINT, {
            method: "GET",
            cache: "no-store",
          }),
          fetch(PAYMENT_ENDPOINT, {
            method: "GET",
            cache: "no-store",
          }),
        ]);

        const ppnResult: unknown = await readJsonSafely(ppnResponse);
        const paymentResult: unknown = await readJsonSafely(paymentResponse);

        if (!ppnResponse.ok) {
          throw new Error(
            getErrorMessage(ppnResult, "Gagal mengambil daftar PPN."),
          );
        }

        if (!paymentResponse.ok) {
          throw new Error(
            getErrorMessage(
              paymentResult,
              "Gagal mengambil daftar pembayaran PPN.",
            ),
          );
        }

        if (!Array.isArray(ppnResult)) {
          throw new Error("Format daftar PPN tidak valid.");
        }

        if (!Array.isArray(paymentResult)) {
          throw new Error("Format daftar pembayaran PPN tidak valid.");
        }

        const normalizedPpn: Ppn[] = normalizePpnList(ppnResult);
        const payments: PembayaranPpn[] =
          normalizePembayaranPpnList(paymentResult);

        const totalByPpn: Map<number, number> = new Map();

        for (const payment of payments) {
          const previous: number = totalByPpn.get(payment.id_ppn) ?? 0;

          totalByPpn.set(payment.id_ppn, previous + payment.nominal);
        }

        const normalized: Ppn[] = normalizedPpn.map((item: Ppn): Ppn => {
          const terbayarFromPayments: number =
            totalByPpn.get(item.id) ?? item.terbayar;

          const terbayar: number = Math.max(
            Number.isFinite(terbayarFromPayments) ? terbayarFromPayments : 0,
            0,
          );

          const sisa: number = Math.min(
            Math.max(item.nilai_ppn - terbayar, 0),
            Math.max(item.nilai_ppn, 0),
          );

          return {
            ...item,
            terbayar,
            sisa,
            status: normalizeStatus(undefined, sisa),
          };
        });

        if (!active) {
          return;
        }

        setPpnList(normalized);
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        console.error("LOAD PPN ERROR:", error);

        setPpnList([]);

        await Swal.fire(
          "Error",
          getUnknownErrorMessage(error, "Gagal mengambil daftar PPN."),
          "error",
        );
      } finally {
        if (active) {
          setLoadingPpn(false);
        }
      }
    }

    void loadPpn();

    return () => {
      active = false;
    };
  }, []);

  /* ==========================================================
   * LOAD COA KAS / BANK
   * ========================================================== */

  useEffect(() => {
    let active = true;

    async function loadCoaKas(): Promise<void> {
      try {
        setLoadingCoa(true);

        const response = await fetch(COA_ENDPOINT, {
          method: "GET",
          cache: "no-store",
        });

        const result: unknown = await readJsonSafely(response);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(result, "Gagal mengambil daftar COA."),
          );
        }

        if (!Array.isArray(result)) {
          throw new Error("Format daftar COA tidak valid.");
        }

        const normalized: CoaKas[] = normalizeCoaKasList(result);

        if (!active) {
          return;
        }

        setCoaKasList(normalized);
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        console.error("LOAD COA KAS ERROR:", error);

        setCoaKasList([]);

        await Swal.fire(
          "COA Tidak Tersedia",
          getUnknownErrorMessage(
            error,
            "Daftar COA kas/bank tidak dapat dimuat.",
          ),
          "error",
        );
      } finally {
        if (active) {
          setLoadingCoa(false);
        }
      }
    }

    void loadCoaKas();

    return () => {
      active = false;
    };
  }, []);

  /* ==========================================================
   * CHANGE
   * ========================================================== */

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm(
      (previous: FormState): FormState => ({
        ...previous,
        [field]: value,
      }),
    );
  }

  /* ==========================================================
   * VALIDATE
   * ========================================================== */

  function validateForm(): string | null {
    if (!data) {
      return "Data pembayaran PPN tidak ditemukan.";
    }

    /*
     * Posted journal tidak boleh diedit langsung.
     *
     * Pembayaran yang sudah memiliki id_jurnal berarti
     * jurnal sudah dibuat/posting.
     */
    if (data.id_jurnal !== null) {
      return (
        "Pembayaran PPN ini sudah memiliki jurnal posted " +
        "dan tidak dapat diedit langsung."
      );
    }

    if (!form.tanggal) {
      return "Tanggal pembayaran PPN wajib diisi.";
    }

    if (form.id_ppn <= 0) {
      return "Pilih PPN terlebih dahulu.";
    }

    if (!selectedPpn) {
      return "Data PPN tidak tersedia.";
    }

    if (form.id_coa_kas <= 0) {
      return "Pilih kas/bank pembayaran.";
    }

    if (!selectedCoaKas) {
      return "COA kas/bank tidak tersedia.";
    }

    if (!selectedCoaKas.aktif) {
      return "COA kas/bank tidak aktif.";
    }

    if (!selectedCoaKas.is_cash) {
      return "COA yang dipilih bukan akun kas/bank.";
    }

    if (selectedCoaKas.is_header) {
      return "COA kas/bank harus berupa COA DETAIL, " + "bukan HEADER.";
    }

    /*
     * Guard eksplisit.
     *
     * 3 = 11100 Kas = HEADER.
     */
    if (selectedCoaKas.id_coa === 3) {
      return (
        "COA 3 - 11100 Kas adalah COA HEADER. " + "Gunakan COA kas/bank DETAIL."
      );
    }

    if (!Number.isFinite(form.nominal) || form.nominal <= 0) {
      return "Nominal pembayaran harus lebih besar dari 0.";
    }

    /*
     * Saat edit, nominal pembayaran lama harus
     * dikembalikan ke batas sisa.
     */
    if (Number.isFinite(maxPayment) && form.nominal > maxPayment + 0.01) {
      return (
        `Nominal melebihi sisa PPN. ` +
        `Maksimal pembayaran: ${formatRupiah(maxPayment)}.`
      );
    }

    if (!form.keterangan.trim()) {
      return "Keterangan wajib diisi.";
    }

    return null;
  }

  /* ==========================================================
   * SUBMIT
   * ========================================================== */

  async function handleSubmit(): Promise<void> {
    if (saving) {
      return;
    }

    const validationError: string | null = validateForm();

    if (validationError) {
      await Swal.fire("Data Tidak Dapat Disimpan", validationError, "warning");

      return;
    }

    try {
      setSaving(true);

      /*
       * JANGAN kirim:
       * - id_coa_hutang
       * - ppn
       * - COA lain
       * - total
       *
       * COA hutang PPN tetap ditentukan backend:
       *
       * PPN / HUTANG
       *       ↓
       * 53 - 21301 Hutang Pajak PPN
       */
      const payload = {
        tanggal: form.tanggal,
        id_ppn: form.id_ppn,
        id_coa_kas: form.id_coa_kas,
        nominal: form.nominal,
        keterangan: form.keterangan.trim(),
      };

      const response = await fetch(
        `${PAYMENT_ENDPOINT}/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result: unknown = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(result, "Gagal mengubah pembayaran PPN."),
        );
      }

      await Swal.fire(
        "Sukses",
        getSuccessMessage(result, "Pembayaran PPN berhasil diubah."),
        "success",
      );

      router.push("/pajak/pembayaran-ppn");

      router.refresh();
    } catch (error: unknown) {
      console.error("UPDATE PEMBAYARAN PPN ERROR:", error);

      await Swal.fire(
        "Error",
        getUnknownErrorMessage(error, "Gagal mengubah pembayaran PPN."),
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  /* ==========================================================
   * LOADING
   * ========================================================== */

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card title="Edit Pembayaran PPN">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />

            <span>Memuat data pembayaran PPN...</span>
          </div>
        </Card>
      </div>
    );
  }

  /* ==========================================================
   * NOT FOUND
   * ========================================================== */

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card title="Edit Pembayaran PPN">
          <div className="py-8 text-center">
            <p className="text-sm">Data pembayaran PPN tidak ditemukan.</p>

            <div className="mt-6">
              <Button
                variant="secondary"
                type="button"
                onClick={() => router.push("/pajak/pembayaran-ppn")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  /* ==========================================================
   * POSTED LOCK
   * ========================================================== */

  if (data.id_jurnal !== null) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card title="Edit Pembayaran PPN">
          <div className="rounded border p-4 text-sm">
            <p className="font-semibold">Pembayaran PPN sudah diposting.</p>

            <p className="mt-2">
              Pembayaran ini sudah terhubung dengan jurnal:
            </p>

            <p className="mt-1 font-semibold">ID Jurnal: {data.id_jurnal}</p>

            <div className="mt-4 rounded border p-3">
              <p>
                <strong>Debit:</strong> {PPN_HUTANG_COA_LABEL}
              </p>

              <p className="mt-1">
                <strong>Kredit:</strong> COA Kas / Bank DETAIL
              </p>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Jurnal yang sudah posted tidak diedit langsung agar data
              pembayaran dan jurnal tetap konsisten.
            </p>
          </div>

          <div className="mt-6">
            <Button
              variant="secondary"
              type="button"
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  /* ==========================================================
   * RENDER FORM
   * ========================================================== */

  return (
    <div className="mx-auto max-w-5xl">
      <Card title="Edit Pembayaran PPN">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* ==================================================
              TANGGAL
              ================================================== */}

          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            disabled={saving}
            onChange={(event) => handleChange("tanggal", event.target.value)}
          />

          {/* ==================================================
              PPN
              ================================================== */}

          <div>
            <label className="text-sm">PPN</label>

            <select
              className="w-full rounded border p-2"
              value={form.id_ppn}
              disabled={loadingPpn || saving}
              onChange={(event) =>
                handleChange("id_ppn", Number(event.target.value))
              }
            >
              <option value={0}>
                {loadingPpn ? "Memuat PPN..." : "Pilih PPN"}
              </option>

              {ppnList.map((item: Ppn) => {
                const isCurrent: boolean = item.id === data.id_ppn;

                const canSelect: boolean = isCurrent || item.sisa > 0;

                return (
                  <option key={item.id} value={item.id} disabled={!canSelect}>
                    PPN #{item.id} | {item.jenis_ppn.toUpperCase()} |{" "}
                    {formatTanggal(item.tanggal_transaksi)} | Nilai PPN:{" "}
                    {formatRupiah(item.nilai_ppn)} | Sisa:{" "}
                    {formatRupiah(item.sisa)} | {getStatusLabel(item.status)}
                  </option>
                );
              })}
            </select>

            <p className="mt-1 text-xs text-gray-500">
              PPN yang sedang diedit tetap dapat dipilih walaupun statusnya
              sebelumnya sudah PAID, karena pembayaran ini sedang dikoreksi.
            </p>
          </div>

          {/* ==================================================
              COA KAS / BANK
              ================================================== */}

          <div>
            <label className="text-sm">Kas / Bank Pembayaran</label>

            <select
              className="w-full rounded border p-2"
              value={form.id_coa_kas}
              disabled={loadingCoa || saving}
              onChange={(event) =>
                handleChange("id_coa_kas", Number(event.target.value))
              }
            >
              <option value={0}>
                {loadingCoa ? "Memuat COA kas/bank..." : "Pilih kas/bank"}
              </option>

              {coaKasList.map((coa: CoaKas) => (
                <option key={coa.id_coa} value={coa.id_coa}>
                  {coa.kode} - {coa.nama}
                </option>
              ))}
            </select>

            <p className="mt-1 text-xs text-gray-500">
              Hanya COA kas/bank DETAIL yang aktif. COA 3 - 11100 Kas adalah
              HEADER dan tidak boleh digunakan.
            </p>
          </div>

          {/* ==================================================
              NOMINAL
              ================================================== */}

          <Input
            label="Nominal Pembayaran PPN"
            type="number"
            min={0}
            value={form.nominal}
            disabled={saving}
            onChange={(event) =>
              handleChange("nominal", Number(event.target.value))
            }
          />

          {/* ==================================================
              KETERANGAN
              ================================================== */}

          <div className="md:col-span-2">
            <Input
              label="Keterangan"
              value={form.keterangan}
              disabled={saving}
              onChange={(event) =>
                handleChange("keterangan", event.target.value)
              }
            />
          </div>
        </div>

        {/* ====================================================
            INFORMASI PPN
            ==================================================== */}

        {selectedPpn ? (
          <div className="mt-6 rounded border p-4 text-sm">
            <p className="font-semibold">Informasi PPN</p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <InfoItem
                label="Jenis PPN"
                value={selectedPpn.jenis_ppn.toUpperCase()}
              />

              <InfoItem
                label="ID Transaksi"
                value={String(selectedPpn.id_transaksi)}
              />

              <InfoItem
                label="Nilai PPN"
                value={formatRupiah(selectedPpn.nilai_ppn)}
              />

              <InfoItem
                label="Sudah Dibayar"
                value={formatRupiah(selectedPpn.terbayar)}
              />

              <InfoItem
                label="Sisa Saat Ini"
                value={formatRupiah(selectedPpn.sisa)}
              />

              <InfoItem
                label="Maksimal Pembayaran Setelah Koreksi"
                value={formatRupiah(maxPayment)}
              />

              <InfoItem
                label="Nilai Dasar PPN"
                value={formatRupiah(selectedPpn.nilai_dasar)}
              />

              <InfoItem label="Tarif PPN" value={`${selectedPpn.tarif_ppn}%`} />

              <InfoItem
                label="Nilai Transaksi"
                value={formatRupiah(selectedPpn.nilai_transaksi)}
              />
            </div>
            <div className="mt-3">
              <InfoItem
                label="Nomor Seri"
                value={selectedPpn.nomor_seri ?? "-"}
              />
            </div>{" "}
          </div>
        ) : null}

        {/* ====================================================
            INFORMASI JURNAL
            ==================================================== */}

        <div className="mt-6 rounded border p-4 text-sm">
          <p className="font-semibold">Jurnal Pembayaran PPN</p>

          <p className="mt-2">
            <strong>Debit:</strong> {PPN_HUTANG_COA_LABEL}
          </p>

          <p className="mt-1">
            <strong>Kredit:</strong>{" "}
            {selectedCoaKas
              ? `${selectedCoaKas.kode} - ${selectedCoaKas.nama}`
              : "COA Kas / Bank DETAIL"}
          </p>

          <p className="mt-3 text-xs text-gray-500">
            COA hutang PPN tidak dapat diubah dari frontend. Backend tetap
            menggunakan COA 53 sesuai mapping PPN / HUTANG.
          </p>
        </div>

        {/* ====================================================
            BUTTON
            ==================================================== */}

        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            type="button"
            disabled={saving}
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>

          <Button
            type="button"
            disabled={saving || loadingPpn || loadingCoa}
            onClick={() => {
              void handleSubmit();
            }}
          >
            <Save className="mr-2 h-4 w-4" />

            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
 * NORMALIZE PAYMENT
 * ============================================================ */

function normalizePembayaranPpn(value: unknown): PembayaranPpn {
  if (typeof value !== "object" || value === null) {
    throw new Error("Format pembayaran PPN tidak valid.");
  }

  const item: Record<string, unknown> = value as Record<string, unknown>;

  const id: number = Number(item.id);

  const idPpn: number = Number(item.id_ppn);

  const nominal: number = Number(item.nominal);

  const idCoaKas: number = Number(item.id_coa_kas);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("ID pembayaran PPN tidak valid.");
  }

  if (!Number.isInteger(idPpn) || idPpn <= 0) {
    throw new Error("ID PPN tidak valid.");
  }

  if (!Number.isFinite(nominal) || nominal <= 0) {
    throw new Error("Nominal pembayaran PPN tidak valid.");
  }

  if (!Number.isInteger(idCoaKas) || idCoaKas <= 0) {
    throw new Error("COA kas/bank tidak valid.");
  }

  return {
    id,
    tanggal: String(item.tanggal ?? ""),
    id_ppn: idPpn,
    nominal,
    keterangan: String(item.keterangan ?? ""),
    id_coa_kas: idCoaKas,
    id_jurnal:
      item.id_jurnal === null || item.id_jurnal === undefined
        ? null
        : Number(item.id_jurnal),
    created_at: String(item.created_at ?? ""),
  };
}

/* ============================================================
 * NORMALIZE PAYMENT LIST
 * ============================================================ */

function normalizePembayaranPpnList(value: unknown[]): PembayaranPpn[] {
  return value
    .filter(
      (item: unknown): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map(
      (item: Record<string, unknown>): PembayaranPpn => ({
        id: Number(item.id),
        tanggal: String(item.tanggal ?? ""),
        id_ppn: Number(item.id_ppn),
        nominal: Number(item.nominal ?? 0),
        keterangan: String(item.keterangan ?? ""),
        id_coa_kas: Number(item.id_coa_kas),
        id_jurnal:
          item.id_jurnal === null || item.id_jurnal === undefined
            ? null
            : Number(item.id_jurnal),
        created_at: String(item.created_at ?? ""),
      }),
    )
    .filter(
      (item: PembayaranPpn): boolean =>
        Number.isInteger(item.id) &&
        item.id > 0 &&
        Number.isInteger(item.id_ppn) &&
        item.id_ppn > 0 &&
        Number.isFinite(item.nominal) &&
        item.nominal > 0,
    );
}

/* ============================================================
 * NORMALIZE PPN
 * ============================================================ */

function normalizePpnList(value: unknown[]): Ppn[] {
  return value
    .filter(
      (item: unknown): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item: Record<string, unknown>): Ppn => {
      const nilaiPpn: number = Number(item.nilai_ppn ?? 0);

      const terbayar: number = Number(
        item.terbayar ?? item.total_pembayaran ?? 0,
      );

      const calculatedSisa: number = Math.max(nilaiPpn - terbayar, 0);

      const apiSisa: number = Number(item.sisa ?? calculatedSisa);

      const sisa: number = Math.min(
        Math.max(Number.isFinite(apiSisa) ? apiSisa : calculatedSisa, 0),
        Math.max(Number.isFinite(nilaiPpn) ? nilaiPpn : 0, 0),
      );

      const jenisRaw: unknown = item.jenis_ppn;

      const jenisPpn: "keluaran" | "masukan" =
        jenisRaw === "keluaran" || jenisRaw === "masukan"
          ? jenisRaw
          : "masukan";

      const tanggalTransaksi: string = String(
        item.tanggal_transaksi ?? item.tanggal ?? "",
      );

      return {
        id: Number(item.id),
        id_transaksi: Number(item.id_transaksi ?? 0),
        jenis_ppn: jenisPpn,
        nilai_dasar: Number(item.nilai_dasar ?? 0),
        tarif_ppn: Number(item.tarif_ppn ?? 0),
        nilai_ppn: Number.isFinite(nilaiPpn) ? Math.max(nilaiPpn, 0) : 0,
        tanggal_transaksi: tanggalTransaksi,
        nomor_seri:
          item.nomor_seri === null || item.nomor_seri === undefined
            ? null
            : String(item.nomor_seri),
        vendor_id:
          item.vendor_id === null || item.vendor_id === undefined
            ? null
            : Number(item.vendor_id),
        keterangan:
          item.keterangan === null || item.keterangan === undefined
            ? null
            : String(item.keterangan),
        nilai_transaksi: Number(item.nilai_transaksi ?? 0),
        terbayar: Number.isFinite(terbayar) ? Math.max(terbayar, 0) : 0,
        sisa,
        status: normalizeStatus(item.status, sisa),
      };
    })
    .filter(
      (item: Ppn): boolean =>
        Number.isInteger(item.id) &&
        item.id > 0 &&
        item.tanggal_transaksi.length > 0 &&
        item.nilai_ppn > 0,
    );
}

/* ============================================================
 * NORMALIZE COA
 * ============================================================ */

function normalizeCoaKasList(value: unknown[]): CoaKas[] {
  return value
    .filter(
      (item: unknown): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map(
      (item: Record<string, unknown>): CoaKas => ({
        id_coa: Number(item.id_coa),
        kode: String(item.kode ?? ""),
        nama: String(item.nama ?? ""),
        is_cash: item.is_cash === true,
        is_header: item.is_header === true,
        aktif: item.aktif === true,
      }),
    )
    .filter(
      (item: CoaKas): boolean =>
        Number.isInteger(item.id_coa) &&
        item.id_coa > 0 &&
        item.kode.length > 0 &&
        item.nama.length > 0 &&
        item.aktif === true &&
        item.is_cash === true &&
        item.is_header === false &&
        item.id_coa !== 3,
    )
    .sort((a: CoaKas, b: CoaKas): number =>
      a.kode.localeCompare(b.kode, "id", {
        numeric: true,
      }),
    );
}

/* ============================================================
 * STATUS
 * ============================================================ */

function normalizeStatus(value: unknown, sisa: number): PpnStatus {
  if (value === "PAID" || sisa <= 0) {
    return "PAID";
  }

  if (value === "PARTIAL") {
    return "PARTIAL";
  }

  return "UNPAID";
}

function getStatusLabel(status: PpnStatus): string {
  if (status === "PAID") {
    return "Lunas";
  }

  if (status === "PARTIAL") {
    return "Sebagian";
  }

  return "Belum Dibayar";
}

/* ============================================================
 * INFO ITEM
 * ============================================================ */

interface InfoItemProps {
  label: string;
  value: string;
}

function InfoItem({ label, value }: InfoItemProps): React.JSX.Element {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>

      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

/* ============================================================
 * FORMAT TANGGAL
 * ============================================================ */

function formatTanggal(value: string): string {
  if (!value) {
    return "-";
  }

  const date: Date = new Date(`${value.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/* ============================================================
 * FORMAT RUPIAH
 * ============================================================ */

function formatRupiah(value: number): string {
  const amount: number = Number.isFinite(value) ? value : 0;

  return `Rp ${amount.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/* ============================================================
 * SAFE JSON
 * ============================================================ */

async function readJsonSafely(response: Response): Promise<unknown> {
  const contentType: string = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text: string = await response.text();

    throw new Error(
      `Server mengembalikan response bukan JSON (${response.status}). ` +
        `${text.slice(0, 200)}`,
    );
  }

  return response.json();
}

/* ============================================================
 * ERROR
 * ============================================================ */

function getErrorMessage(value: unknown, fallback: string): string {
  if (typeof value === "object" && value !== null && "error" in value) {
    const error: unknown = value.error;

    if (typeof error === "string" && error.trim()) {
      return error;
    }
  }

  return fallback;
}

/* ============================================================
 * SUCCESS
 * ============================================================ */

function getSuccessMessage(value: unknown, fallback: string): string {
  if (typeof value === "object" && value !== null && "message" in value) {
    const message: unknown = value.message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

/* ============================================================
 * UNKNOWN ERROR
 * ============================================================ */

function getUnknownErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
