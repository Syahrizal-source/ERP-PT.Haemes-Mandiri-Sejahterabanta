"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Swal from "sweetalert2";
import {
  ArrowLeft,
  Save,
} from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

/* ============================================================
 * TYPE
 * ============================================================ */

type Pph25Status =
  | "UNPAID"
  | "PARTIAL"
  | "PAID";

interface Pph25 {
  id: number;
  tahun: number;
  bulan: number;
  nilai_angsuran: number;
  tanggal_setor: string | null;
  tanggal_transaksi: string;
  keterangan: string | null;
  id_jurnal: number | null;
  created_at: string;
}

interface PembayaranPph25 {
  id: number;
  id_pph25: number;
  nominal: number;
}

interface Pph25Option extends Pph25 {
  terbayar: number;
  sisa: number;
  status: Pph25Status;
}

interface CoaKas {
  id_coa: number;
  kode: string;
  nama: string;
  is_cash: boolean;
  is_header: boolean;
  aktif: boolean;
}

interface FormState {
  tanggal: string;
  id_pph25: number;
  id_coa_kas: number;
  nominal: number;
  keterangan: string;
}

/* ============================================================
 * CONSTANT
 * ============================================================ */

/**
 * COA HUTANG PPh25 ditentukan oleh backend/helper:
 *
 * PAJAK_PPH25 / HUTANG
 *        ↓
 * 2508 - 21305 Hutang Pajak PPh25
 *
 * Frontend TIDAK mengirim id_coa_hutang.
 */
const PPH25_HUTANG_COA_ID = 2508;

const PPH25_HUTANG_COA_LABEL =
  "2508 - 21305 Hutang Pajak PPh25";

/**
 * 2507 = 62005 Beban Pajak PPh25.
 *
 * COA ini bukan COA pembayaran.
 * Hanya digunakan untuk pengakuan beban
 * sesuai alur accounting PPh25.
 */
const PPH25_BEBAN_COA_ID = 2507;

const PPH25_BEBAN_COA_LABEL =
  "2507 - 62005 Beban Pajak PPh25";

/**
 * 3 = 11100 Kas = HEADER.
 *
 * Tidak boleh menjadi COA kredit jurnal pembayaran.
 */
const COA_KAS_HEADER_ID = 3;

const COA_KAS_HEADER_LABEL =
  "3 - 11100 Kas";

/* ============================================================
 * ENDPOINT
 * ============================================================ */

const PPH25_ENDPOINT = "/api/pph25";

const PAYMENT_ENDPOINT =
  "/api/pembayaran-pph25";

const COA_ENDPOINT = "/api/coa";

/* ============================================================
 * PAGE
 * ============================================================ */

export default function Page(): React.JSX.Element {
  const router = useRouter();

  const [form, setForm] =
    useState<FormState>({
      tanggal:
        new Date()
          .toISOString()
          .slice(0, 10),
      id_pph25: 0,
      id_coa_kas: 0,
      nominal: 0,
      keterangan: "",
    });

  const [pph25List, setPph25List] =
    useState<Pph25Option[]>([]);

  const [coaKasList, setCoaKasList] =
    useState<CoaKas[]>([]);

  const [loadingPph25, setLoadingPph25] =
    useState<boolean>(true);

  const [loadingCoa, setLoadingCoa] =
    useState<boolean>(true);

  const [saving, setSaving] =
    useState<boolean>(false);

  /* ==========================================================
   * SELECTED DATA
   * ========================================================== */

  const selectedPph25:
    | Pph25Option
    | undefined =
    useMemo(
      (): Pph25Option | undefined =>
        pph25List.find(
          (
            item: Pph25Option,
          ): boolean =>
            item.id ===
            form.id_pph25,
        ),
      [
        form.id_pph25,
        pph25List,
      ],
    );

  const selectedCoaKas:
    | CoaKas
    | undefined =
    useMemo(
      (): CoaKas | undefined =>
        coaKasList.find(
          (
            item: CoaKas,
          ): boolean =>
            item.id_coa ===
            form.id_coa_kas,
        ),
      [
        coaKasList,
        form.id_coa_kas,
      ],
    );

  const nominal: number =
    Number.isFinite(form.nominal)
      ? Math.max(form.nominal, 0)
      : 0;

  const sisaPph25: number =
    selectedPph25
      ? Math.max(
          selectedPph25.sisa,
          0,
        )
      : 0;

  /* ==========================================================
   * CHANGE FORM
   * ========================================================== */

  function handleChange<
    K extends keyof FormState,
  >(
    field: K,
    value: FormState[K],
  ): void {
    setForm(
      (
        previous: FormState,
      ): FormState => ({
        ...previous,
        [field]: value,
      }),
    );
  }

  /* ==========================================================
   * LOAD PPH25 + PEMBAYARAN
   *
   * public.pph25:
   *
   * - id
   * - tahun
   * - bulan
   * - nilai_angsuran
   * - tanggal_setor
   * - tanggal_transaksi
   * - keterangan
   * - id_jurnal
   * - created_at
   *
   * pembayaran_pph25:
   *
   * - id
   * - id_pph25
   * - nominal
   *
   * Sisa:
   *
   * nilai_angsuran
   * -
   * SUM(pembayaran_pph25.nominal)
   * ========================================================== */

  useEffect(() => {
    let active = true;

    async function loadPph25(): Promise<void> {
      try {
        setLoadingPph25(true);

        const [
          pph25Response,
          paymentResponse,
        ] = await Promise.all([
          fetch(PPH25_ENDPOINT, {
            method: "GET",
            cache: "no-store",
          }),

          fetch(PAYMENT_ENDPOINT, {
            method: "GET",
            cache: "no-store",
          }),
        ]);

        const pph25Result: unknown =
          await readJsonSafely(
            pph25Response,
          );

        if (!pph25Response.ok) {
          throw new Error(
            getErrorMessage(
              pph25Result,
              "Gagal mengambil daftar PPh25.",
            ),
          );
        }

        const paymentResult: unknown =
          await readJsonSafely(
            paymentResponse,
          );

        if (!paymentResponse.ok) {
          throw new Error(
            getErrorMessage(
              paymentResult,
              "Gagal mengambil riwayat pembayaran PPh25.",
            ),
          );
        }

        if (!Array.isArray(pph25Result)) {
          throw new Error(
            "Format daftar PPh25 tidak valid.",
          );
        }

        const pembayaranRows:
          PembayaranPph25[] =
          normalizePembayaranList(
            paymentResult,
          );

        /*
         * Total pembayaran per id_pph25.
         */

        const pembayaranMap =
          new Map<number, number>();

        for (
          const pembayaran of
            pembayaranRows
        ) {
          const current: number =
            pembayaranMap.get(
              pembayaran.id_pph25,
            ) ?? 0;

          pembayaranMap.set(
            pembayaran.id_pph25,
            current +
              pembayaran.nominal,
          );
        }

        const normalizedPph25:
          Pph25[] =
          normalizePph25List(
            pph25Result,
          );

        const options:
          Pph25Option[] =
          normalizedPph25.map(
            (
              item: Pph25,
            ): Pph25Option => {
              const terbayar: number =
                pembayaranMap.get(
                  item.id,
                ) ?? 0;

              const sisa: number =
                Math.max(
                  item.nilai_angsuran -
                    terbayar,
                  0,
                );

              return {
                ...item,
                terbayar,
                sisa,
                status:
                  getPph25Status(
                    sisa,
                    terbayar,
                  ),
              };
            },
          );

        if (!active) {
          return;
        }

        setPph25List(options);
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        console.error(
          "LOAD PPH25 PAYMENT SOURCE ERROR:",
          error,
        );

        setPph25List([]);

        await Swal.fire(
          "Data PPh25 Tidak Dapat Dimuat",
          getUnknownErrorMessage(
            error,
            "Daftar PPh25 tidak dapat digunakan untuk pembayaran.",
          ),
          "error",
        );
      } finally {
        if (active) {
          setLoadingPph25(false);
        }
      }
    }

    void loadPph25();

    return () => {
      active = false;
    };
  }, []);

  /* ==========================================================
   * LOAD COA KAS / BANK
   *
   * Hanya:
   * - aktif
   * - is_cash = true
   * - bukan header
   * - bukan COA 3
   *
   * Backend tetap melakukan validasi ulang.
   * ========================================================== */

  useEffect(() => {
    let active = true;

    async function loadCoaKas(): Promise<void> {
      try {
        setLoadingCoa(true);

        const response =
          await fetch(
            COA_ENDPOINT,
            {
              method: "GET",
              cache: "no-store",
            },
          );

        const result: unknown =
          await readJsonSafely(
            response,
          );

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              result,
              "Gagal mengambil daftar COA kas/bank.",
            ),
          );
        }

        if (!Array.isArray(result)) {
          throw new Error(
            "Format daftar COA tidak valid.",
          );
        }

        const normalized:
          CoaKas[] =
          normalizeCoaKasList(
            result,
          );

        if (!active) {
          return;
        }

        setCoaKasList(
          normalized,
        );
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        console.error(
          "LOAD COA KAS ERROR:",
          error,
        );

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
   * VALIDASI FORM
   * ========================================================== */

  function validateForm(): string | null {
    if (!form.tanggal) {
      return "Tanggal pembayaran PPh25 wajib diisi.";
    }

    if (form.id_pph25 <= 0) {
      return "Pilih PPh25 yang akan dibayar.";
    }

    if (!selectedPph25) {
      return "Data PPh25 yang dipilih tidak tersedia.";
    }

    if (
      !Number.isFinite(
        selectedPph25.nilai_angsuran,
      ) ||
      selectedPph25.nilai_angsuran <= 0
    ) {
      return "Nilai angsuran PPh25 tidak valid.";
    }

    if (
      selectedPph25.sisa <= 0 ||
      selectedPph25.status === "PAID"
    ) {
      return "PPh25 yang dipilih sudah lunas.";
    }

    if (form.id_coa_kas <= 0) {
      return "Pilih kas/bank pembayaran.";
    }

    if (!selectedCoaKas) {
      return "COA kas/bank yang dipilih tidak tersedia.";
    }

    if (!selectedCoaKas.aktif) {
      return "COA kas/bank tidak aktif.";
    }

    if (!selectedCoaKas.is_cash) {
      return "COA yang dipilih bukan akun kas/bank.";
    }

    if (selectedCoaKas.is_header) {
      return (
        "COA kas/bank harus berupa COA DETAIL, bukan HEADER."
      );
    }

    if (
      selectedCoaKas.id_coa ===
      COA_KAS_HEADER_ID
    ) {
      return (
        `${COA_KAS_HEADER_LABEL} adalah COA HEADER. ` +
        "Gunakan COA kas/bank DETAIL."
      );
    }

    if (
      !Number.isFinite(
        form.nominal,
      ) ||
      form.nominal <= 0
    ) {
      return (
        "Nominal pembayaran PPh25 harus lebih besar dari 0."
      );
    }

    if (
      form.nominal >
      selectedPph25.sisa + 0.01
    ) {
      return (
        `Nominal pembayaran melebihi sisa PPh25. ` +
        `Maksimal pembayaran: ${formatRupiah(
          selectedPph25.sisa,
        )}.`
      );
    }

    if (
      !form.keterangan.trim()
    ) {
      return "Keterangan pembayaran PPh25 wajib diisi.";
    }

    return null;
  }

  /* ==========================================================
   * SUBMIT
   *
   * Database pembayaran_pph25:
   *
   * - tanggal
   * - id_pph25
   * - nominal
   * - keterangan
   * - id_coa_kas
   *
   * TIDAK mengirim:
   *
   * - id_coa_hutang
   * - id_coa_beban
   * - total
   * - sisa
   *
   * COA hutang ditentukan backend/helper:
   *
   * PAJAK_PPH25 / HUTANG
   *        ↓
   * 2508 - 21305 Hutang Pajak PPh25
   * ========================================================== */

  async function handleSubmit(): Promise<void> {
    if (saving) {
      return;
    }

    const validationError:
      | string
      | null =
      validateForm();

    if (validationError) {
      await Swal.fire(
        "Data Belum Lengkap",
        validationError,
        "warning",
      );

      return;
    }

    try {
      setSaving(true);

      /*
       * Frontend hanya mengirim field yang memang
       * terdapat pada pembayaran_pph25.
       *
       * COA hutang tidak dikirim.
       */

      const payload = {
        tanggal: form.tanggal,
        id_pph25: form.id_pph25,
        id_coa_kas:
          form.id_coa_kas,
        nominal: form.nominal,
        keterangan:
          form.keterangan.trim(),
      };

      const response =
        await fetch(
          PAYMENT_ENDPOINT,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              payload,
            ),
          },
        );

      const result: unknown =
        await readJsonSafely(
          response,
        );

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            result,
            "Gagal menyimpan pembayaran PPh25.",
          ),
        );
      }

      await Swal.fire(
        "Sukses",
        getSuccessMessage(
          result,
          "Pembayaran PPh25 dan jurnal berhasil dibuat.",
        ),
        "success",
      );

      router.push(
        "/pajak/pembayaran-pph25",
      );

      router.refresh();
    } catch (error: unknown) {
      console.error(
        "SUBMIT PEMBAYARAN PPH25 ERROR:",
        error,
      );

      await Swal.fire(
        "Error",
        getUnknownErrorMessage(
          error,
          "Gagal menyimpan pembayaran PPh25.",
        ),
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  /* ==========================================================
   * LOADING
   * ========================================================== */

  if (
    loadingPph25 ||
    loadingCoa
  ) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card title="Tambah Pembayaran PPh25">
          <div className="flex items-center justify-center py-12">
            <Loader2Icon />

            <span>
              Memuat data pembayaran PPh25...
            </span>
          </div>
        </Card>
      </div>
    );
  }

  /* ==========================================================
   * RENDER
   * ========================================================== */

  return (
    <div className="mx-auto max-w-5xl">
      <Card title="Tambah Pembayaran PPh25">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

          {/* ==================================================
              TANGGAL PEMBAYARAN
              ================================================== */}

          <Input
            label="Tanggal Pembayaran"
            type="date"
            value={form.tanggal}
            disabled={saving}
            onChange={(event) =>
              handleChange(
                "tanggal",
                event.target.value,
              )
            }
          />

          {/* ==================================================
              PPH25 YANG DIBAYAR
              ================================================== */}

          <div>
            <label className="text-sm">
              PPh25 yang Dibayar
            </label>

            <select
              className="w-full rounded border p-2"
              value={form.id_pph25}
              disabled={saving}
              onChange={(event) => {
                const idPph25: number =
                  Number(
                    event.target.value,
                  );

                handleChange(
                  "id_pph25",
                  idPph25,
                );

                /*
                 * Saat memilih PPh25 baru,
                 * nominal dikembalikan ke 0
                 * agar user mengisi jumlah
                 * pembayaran secara sadar.
                 */

                handleChange(
                  "nominal",
                  0,
                );
              }}
            >
              <option value={0}>
                {pph25List.length === 0
                  ? "Tidak ada PPh25 yang dapat dibayar"
                  : "Pilih PPh25"}
              </option>

              {pph25List.map(
                (
                  item: Pph25Option,
                ) => {
                  const disabled: boolean =
                    item.sisa <= 0 ||
                    item.status ===
                      "PAID";

                  return (
                    <option
                      key={item.id}
                      value={item.id}
                      disabled={
                        disabled
                      }
                    >
                      #{item.id} |{" "}
                      {formatBulanTahun(
                        item.bulan,
                        item.tahun,
                      )}{" "}
                      | Angsuran:{" "}
                      {formatRupiah(
                        item.nilai_angsuran,
                      )}{" "}
                      | Sisa:{" "}
                      {formatRupiah(
                        item.sisa,
                      )}{" "}
                      |{" "}
                      {getStatusLabel(
                        item.status,
                      )}
                    </option>
                  );
                },
              )}
            </select>

            <p className="mt-1 text-xs text-gray-500">
              Data kewajiban diambil dari
              public.pph25. Nilai kewajiban
              menggunakan nilai_angsuran.
            </p>
          </div>

          {/* ==================================================
              COA KAS / BANK
              ================================================== */}

          <div>
            <label className="text-sm">
              Kas / Bank Pembayaran
            </label>

            <select
              className="w-full rounded border p-2"
              value={form.id_coa_kas}
              disabled={saving}
              onChange={(event) =>
                handleChange(
                  "id_coa_kas",
                  Number(
                    event.target.value,
                  ),
                )
              }
            >
              <option value={0}>
                {coaKasList.length === 0
                  ? "Tidak ada COA kas/bank detail"
                  : "Pilih kas/bank"}
              </option>

              {coaKasList.map(
                (
                  coa: CoaKas,
                ) => (
                  <option
                    key={coa.id_coa}
                    value={coa.id_coa}
                  >
                    {coa.kode} -{" "}
                    {coa.nama}
                  </option>
                ),
              )}
            </select>

            <p className="mt-1 text-xs text-gray-500">
              Hanya COA kas/bank DETAIL
              yang aktif.{" "}
              {COA_KAS_HEADER_LABEL} adalah
              HEADER dan tidak dapat digunakan.
            </p>
          </div>

          {/* ==================================================
              NOMINAL
              ================================================== */}

          <Input
            label="Nominal Pembayaran PPh25"
            type="number"
            min={0}
            value={form.nominal}
            disabled={
              saving ||
              !selectedPph25
            }
            onChange={(event) =>
              handleChange(
                "nominal",
                Number(
                  event.target.value,
                ),
              )
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
                handleChange(
                  "keterangan",
                  event.target.value,
                )
              }
            />
          </div>
        </div>

        {/* ====================================================
            INFORMASI PPH25
            ==================================================== */}

        {selectedPph25 ? (
          <div className="mt-4 rounded border p-4 text-sm">
            <p className="font-semibold">
              Informasi PPh25
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <InfoItem
                label="ID PPh25"
                value={`#${selectedPph25.id}`}
              />

              <InfoItem
                label="Periode"
                value={formatBulanTahun(
                  selectedPph25.bulan,
                  selectedPph25.tahun,
                )}
              />

              <InfoItem
                label="Tanggal Transaksi"
                value={formatTanggal(
                  selectedPph25.tanggal_transaksi,
                )}
              />

              <InfoItem
                label="Nilai Angsuran"
                value={formatRupiah(
                  selectedPph25.nilai_angsuran,
                )}
              />

              <InfoItem
                label="Tanggal Setor"
                value={
                  selectedPph25.tanggal_setor
                    ? formatTanggal(
                        selectedPph25.tanggal_setor,
                      )
                    : "-"
                }
              />

              <InfoItem
                label="Sudah Dibayar"
                value={formatRupiah(
                  selectedPph25.terbayar,
                )}
              />

              <InfoItem
                label="Sisa PPh25"
                value={formatRupiah(
                  selectedPph25.sisa,
                )}
              />

              <InfoItem
                label="Status"
                value={getStatusLabel(
                  selectedPph25.status,
                )}
              />

              <InfoItem
                label="Keterangan PPh25"
                value={
                  selectedPph25.keterangan ??
                  "-"
                }
              />
            </div>
          </div>
        ) : null}

        {/* ====================================================
            INFORMASI PEMBAYARAN
            ==================================================== */}

        <div className="mt-4 rounded border p-4 text-sm">
          <p className="font-semibold">
            Informasi Pembayaran
          </p>

          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            <InfoItem
              label="Nominal Pembayaran"
              value={formatRupiah(
                nominal,
              )}
            />

            <InfoItem
              label="Maksimal Pembayaran"
              value={formatRupiah(
                sisaPph25,
              )}
            />
          </div>
        </div>

        {/* ====================================================
            INFORMASI JURNAL
            ==================================================== */}

        <div className="mt-4 rounded border p-4 text-sm">
          <p className="font-semibold">
            Jurnal Pembayaran PPh25
          </p>

          <p className="mt-2">
            <strong>Debit:</strong>{" "}
            {PPH25_HUTANG_COA_LABEL}
          </p>

          <p className="mt-1">
            <strong>Kredit:</strong>{" "}
            {selectedCoaKas
              ? `${selectedCoaKas.kode} - ${selectedCoaKas.nama}`
              : "COA Kas / Bank DETAIL yang dipilih"}
          </p>

          <p className="mt-3 text-xs text-gray-500">
            COA hutang PPh25 tidak dipilih
            dari frontend. Backend/helper
            menetapkan COA melalui mapping
            PAJAK_PPH25 / HUTANG.
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Pembayaran PPh25 menggunakan
            COA 2508 - 21305 Hutang Pajak
            PPh25 sebagai Debit.
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Pembayaran PPh25 tidak menggunakan{" "}
            {PPH25_BEBAN_COA_LABEL}, dan tidak
            menggunakan {COA_KAS_HEADER_LABEL}.
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
            onClick={() =>
              router.back()
            }
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>

          <Button
            type="button"
            disabled={
              saving ||
              pph25List.length === 0 ||
              coaKasList.length === 0
            }
            onClick={() => {
              void handleSubmit();
            }}
          >
            <Save className="mr-2 h-4 w-4" />

            {saving
              ? "Menyimpan..."
              : "Simpan Pembayaran PPh25"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
 * LOADING ICON
 * ============================================================ */

function Loader2Icon(): React.JSX.Element {
  return (
    <span
      className="mr-2 inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent"
      aria-label="Memuat"
    />
  );
}

/* ============================================================
 * INFO ITEM
 * ============================================================ */

interface InfoItemProps {
  label: string;
  value: string;
}

function InfoItem({
  label,
  value,
}: InfoItemProps): React.JSX.Element {
  return (
    <div>
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-1 font-medium">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
 * NORMALIZE PPH25
 *
 * Mengikuti struktur public.pph25:
 *
 * id
 * tahun
 * bulan
 * nilai_angsuran
 * tanggal_setor
 * tanggal_transaksi
 * keterangan
 * id_jurnal
 * created_at
 * ============================================================ */

function normalizePph25List(
  value: unknown[],
): Pph25[] {
  return value
    .filter(
      (
        item: unknown,
      ): item is Record<
        string,
        unknown
      > =>
        typeof item ===
          "object" &&
        item !== null,
    )
    .map(
      (
        item: Record<
          string,
          unknown
        >,
      ): Pph25 => ({
        id: Number(
          item.id,
        ),

        tahun: Number(
          item.tahun ?? 0,
        ),

        bulan: Number(
          item.bulan ?? 0,
        ),

        nilai_angsuran: Number(
          item.nilai_angsuran ?? 0,
        ),

        tanggal_setor:
          item.tanggal_setor ===
            null ||
          item.tanggal_setor ===
            undefined
            ? null
            : String(
                item.tanggal_setor,
              ),

        tanggal_transaksi:
          String(
            item.tanggal_transaksi ??
              "",
          ),

        keterangan:
          item.keterangan ===
            null ||
          item.keterangan ===
            undefined
            ? null
            : String(
                item.keterangan,
              ),

        id_jurnal:
          item.id_jurnal ===
              null ||
          item.id_jurnal ===
              undefined
            ? null
            : Number(
                item.id_jurnal,
              ),

        created_at:
          String(
            item.created_at ?? "",
          ),
      }),
    )
    .filter(
      (
        item: Pph25,
      ): boolean =>
        Number.isInteger(
          item.id,
        ) &&
        item.id > 0 &&
        Number.isInteger(
          item.tahun,
        ) &&
        item.tahun > 0 &&
        Number.isInteger(
          item.bulan,
        ) &&
        item.bulan >= 1 &&
        item.bulan <= 12 &&
        Number.isFinite(
          item.nilai_angsuran,
        ) &&
        item.nilai_angsuran > 0 &&
        item.tanggal_transaksi.length >
          0,
    );
}

/* ============================================================
 * NORMALIZE PEMBAYARAN
 *
 * Hanya mengambil:
 *
 * id
 * id_pph25
 * nominal
 * ============================================================ */

function normalizePembayaranList(
  value: unknown,
): PembayaranPph25[] {
  const rows: unknown[] =
    Array.isArray(value)
      ? value
      : getArrayFromResponse(
          value,
        );

  return rows
    .filter(
      (
        item: unknown,
      ): item is Record<
        string,
        unknown
      > =>
        typeof item ===
          "object" &&
        item !== null,
    )
    .map(
      (
        item: Record<
          string,
          unknown
        >,
      ): PembayaranPph25 => ({
        id: Number(
          item.id,
        ),

        id_pph25: Number(
          item.id_pph25,
        ),

        nominal: Number(
          item.nominal ?? 0,
        ),
      }),
    )
    .filter(
      (
        item: PembayaranPph25,
      ): boolean =>
        Number.isInteger(
          item.id,
        ) &&
        item.id > 0 &&
        Number.isInteger(
          item.id_pph25,
        ) &&
        item.id_pph25 > 0 &&
        Number.isFinite(
          item.nominal,
        ) &&
        item.nominal > 0,
    );
}

/* ============================================================
 * RESPONSE ARRAY
 * ============================================================ */

function getArrayFromResponse(
  value: unknown,
): unknown[] {
  if (
    typeof value !==
      "object" ||
    value === null
  ) {
    return [];
  }

  if (!("data" in value)) {
    return [];
  }

  const data: unknown =
    value.data;

  return Array.isArray(data)
    ? data
    : [];
}

/* ============================================================
 * NORMALIZE COA KAS
 *
 * Syarat:
 * - aktif
 * - is_cash
 * - bukan header
 * - bukan id_coa 3
 * ============================================================ */

function normalizeCoaKasList(
  value: unknown[],
): CoaKas[] {
  return value
    .filter(
      (
        item: unknown,
      ): item is Record<
        string,
        unknown
      > =>
        typeof item ===
          "object" &&
        item !== null,
    )
    .map(
      (
        item: Record<
          string,
          unknown
        >,
      ): CoaKas => ({
        id_coa: Number(
          item.id_coa,
        ),

        kode: String(
          item.kode ?? "",
        ),

        nama: String(
          item.nama ?? "",
        ),

        is_cash:
          item.is_cash === true,

        is_header:
          item.is_header === true,

        aktif:
          item.aktif === true,
      }),
    )
    .filter(
      (
        item: CoaKas,
      ): boolean =>
        Number.isInteger(
          item.id_coa,
        ) &&
        item.id_coa > 0 &&
        item.kode.length > 0 &&
        item.nama.length > 0 &&
        item.aktif === true &&
        item.is_cash === true &&
        item.is_header === false &&
        item.id_coa !==
          COA_KAS_HEADER_ID,
    )
    .sort(
      (
        a: CoaKas,
        b: CoaKas,
      ): number =>
        a.kode.localeCompare(
          b.kode,
          "id",
          {
            numeric: true,
          },
        ),
    );
}

/* ============================================================
 * STATUS
 * ============================================================ */

function getPph25Status(
  sisa: number,
  terbayar: number,
): Pph25Status {
  if (sisa <= 0) {
    return "PAID";
  }

  if (terbayar > 0) {
    return "PARTIAL";
  }

  return "UNPAID";
}

function getStatusLabel(
  status: Pph25Status,
): string {
  if (status === "PAID") {
    return "Lunas";
  }

  if (status === "PARTIAL") {
    return "Sebagian";
  }

  return "Belum Dibayar";
}

/* ============================================================
 * FORMAT BULAN / TAHUN
 * ============================================================ */

function formatBulanTahun(
  bulan: number,
  tahun: number,
): string {
  if (
    !Number.isInteger(bulan) ||
    bulan < 1 ||
    bulan > 12 ||
    !Number.isInteger(tahun) ||
    tahun <= 0
  ) {
    return "-";
  }

  const namaBulan: string[] = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  return `${namaBulan[bulan - 1]} ${tahun}`;
}

/* ============================================================
 * FORMAT TANGGAL
 * ============================================================ */

function formatTanggal(
  value: string,
): string {
  if (!value) {
    return "-";
  }

  const date: Date =
    new Date(
      `${value.slice(
        0,
        10,
      )}T00:00:00`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "id-ID",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );
}

/* ============================================================
 * FORMAT RUPIAH
 * ============================================================ */

function formatRupiah(
  value: number,
): string {
  const amount: number =
    Number.isFinite(value)
      ? value
      : 0;

  return `Rp ${amount.toLocaleString(
    "id-ID",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  )}`;
}

/* ============================================================
 * SAFE JSON
 * ============================================================ */

async function readJsonSafely(
  response: Response,
): Promise<unknown> {
  const contentType: string =
    response.headers.get(
      "content-type",
    ) ?? "";

  if (
    !contentType.includes(
      "application/json",
    )
  ) {
    const text: string =
      await response.text();

    throw new Error(
      `Server mengembalikan response bukan JSON (${response.status}). ` +
        `${text.slice(
          0,
          200,
        )}`,
    );
  }

  return response.json();
}

/* ============================================================
 * ERROR MESSAGE
 * ============================================================ */

function getErrorMessage(
  value: unknown,
  fallback: string,
): string {
  if (
    typeof value ===
      "object" &&
    value !== null &&
    "error" in value
  ) {
    const error: unknown =
      value.error;

    if (
      typeof error ===
        "string" &&
      error.trim()
    ) {
      return error;
    }
  }

  return fallback;
}

/* ============================================================
 * SUCCESS MESSAGE
 * ============================================================ */

function getSuccessMessage(
  value: unknown,
  fallback: string,
): string {
  if (
    typeof value ===
      "object" &&
    value !== null &&
    "message" in value
  ) {
    const message: unknown =
      value.message;

    if (
      typeof message ===
        "string" &&
      message.trim()
    ) {
      return message;
    }
  }

  return fallback;
}

/* ============================================================
 * UNKNOWN ERROR
 * ============================================================ */

function getUnknownErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return fallback;
}