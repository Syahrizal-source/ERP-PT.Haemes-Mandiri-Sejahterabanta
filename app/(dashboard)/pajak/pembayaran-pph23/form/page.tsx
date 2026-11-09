"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Swal from "sweetalert2";
import { ArrowLeft, Save } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

/* ============================================================
 * TYPE
 * ============================================================ */

type Pph23Status = "UNPAID" | "PARTIAL" | "PAID";

interface VendorInfo {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
  npwp: string | null;
}

interface Pph23 {
  id: number;
  id_vendor: number;
  jenis_jasa: string;
  nilai_transaksi: number;
  tarif_pph23: number;
  pph23_terutang: number;
  tanggal_transaksi: string;
  created_at: string;
  id_periode: number | null;
  vendor: VendorInfo | null;
}

interface PembayaranPph23 {
  id: number;
  id_pph23: number;
  nominal: number;
}

interface Pph23Option extends Pph23 {
  terbayar: number;
  sisa: number;
  status: Pph23Status;
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
  id_pph23: number;
  id_coa_kas: number;
  nominal: number;
  keterangan: string;
}

/* ============================================================
 * CONSTANT
 * ============================================================ */

/**
 * COA HUTANG PPh23 ditentukan oleh backend/helper:
 *
 * PAJAK_PPH23 / HUTANG
 *        ↓
 * 55 - 21303 Hutang Pajak PPh 23
 *
 * Frontend TIDAK mengirim id_coa_hutang.
 */
const PPH23_HUTANG_COA_ID = 55;

const PPH23_HUTANG_COA_LABEL =
  "55 - 21303 Hutang Pajak PPh 23";

/**
 * 3 = 11100 Kas = HEADER.
 *
 * Tidak boleh menjadi COA kredit jurnal pembayaran.
 */
const COA_KAS_HEADER_ID = 3;

const PPH23_ENDPOINT = "/api/pph23";
const PAYMENT_ENDPOINT = "/api/pembayaran-pph23";
const COA_ENDPOINT = "/api/coa";

/* ============================================================
 * PAGE
 * ============================================================ */

export default function Page(): React.JSX.Element {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    tanggal: new Date().toISOString().slice(0, 10),
    id_pph23: 0,
    id_coa_kas: 0,
    nominal: 0,
    keterangan: "",
  });

  const [pph23List, setPph23List] =
    useState<Pph23Option[]>([]);

  const [coaKasList, setCoaKasList] =
    useState<CoaKas[]>([]);

  const [loadingPph23, setLoadingPph23] =
    useState<boolean>(true);

  const [loadingCoa, setLoadingCoa] =
    useState<boolean>(true);

  const [saving, setSaving] =
    useState<boolean>(false);

  /* ==========================================================
   * SELECTED DATA
   * ========================================================== */

  const selectedPph23: Pph23Option | undefined =
    useMemo(
      (): Pph23Option | undefined =>
        pph23List.find(
          (item: Pph23Option): boolean =>
            item.id === form.id_pph23,
        ),
      [form.id_pph23, pph23List],
    );

  const selectedCoaKas: CoaKas | undefined =
    useMemo(
      (): CoaKas | undefined =>
        coaKasList.find(
          (item: CoaKas): boolean =>
            item.id_coa === form.id_coa_kas,
        ),
      [coaKasList, form.id_coa_kas],
    );

  const nominal: number =
    Number.isFinite(form.nominal)
      ? Math.max(form.nominal, 0)
      : 0;

  const sisaPph23: number = selectedPph23
    ? Math.max(selectedPph23.sisa, 0)
    : 0;

  /* ==========================================================
   * CHANGE FORM
   * ========================================================== */

  function handleChange<K extends keyof FormState>(
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
   * LOAD PPH23 + PEMBAYARAN
   *
   * PENTING:
   *
   * public.pph23 TIDAK menggunakan field "tanggal"
   * sebagai tanggal transaksi.
   *
   * Field yang benar:
   *
   * - tanggal_transaksi
   * - nilai_transaksi
   * - tarif_pph23
   * - pph23_terutang
   *
   * pembayaran_pph23 digunakan untuk menghitung:
   *
   * - terbayar
   * - sisa
   * - status
   * ========================================================== */

  useEffect(() => {
    let active = true;

    async function loadPph23(): Promise<void> {
      try {
        setLoadingPph23(true);

        const [
          pph23Response,
          paymentResponse,
        ] = await Promise.all([
          fetch(PPH23_ENDPOINT, {
            method: "GET",
            cache: "no-store",
          }),

          fetch(PAYMENT_ENDPOINT, {
            method: "GET",
            cache: "no-store",
          }),
        ]);

        const pph23Result: unknown =
          await readJsonSafely(pph23Response);

        if (!pph23Response.ok) {
          throw new Error(
            getErrorMessage(
              pph23Result,
              "Gagal mengambil daftar PPh23.",
            ),
          );
        }

        const paymentResult: unknown =
          await readJsonSafely(paymentResponse);

        if (!paymentResponse.ok) {
          throw new Error(
            getErrorMessage(
              paymentResult,
              "Gagal mengambil riwayat pembayaran PPh23.",
            ),
          );
        }

        if (!Array.isArray(pph23Result)) {
          throw new Error(
            "Format daftar PPh23 tidak valid.",
          );
        }

        const pembayaranRows: PembayaranPph23[] =
          normalizePembayaranList(
            paymentResult,
          );

        /*
         * Total pembayaran per id_pph23.
         *
         * Sisa dihitung dari sumber:
         *
         * pph23.pph23_terutang
         * -
         * SUM(pembayaran_pph23.nominal)
         */

        const pembayaranMap =
          new Map<number, number>();

        for (
          const pembayaran of pembayaranRows
        ) {
          const current: number =
            pembayaranMap.get(
              pembayaran.id_pph23,
            ) ?? 0;

          pembayaranMap.set(
            pembayaran.id_pph23,
            current + pembayaran.nominal,
          );
        }

        const normalizedPph23: Pph23[] =
          normalizePph23List(pph23Result);

        const options: Pph23Option[] =
          normalizedPph23.map(
            (
              item: Pph23,
            ): Pph23Option => {
              const terbayar: number =
                pembayaranMap.get(
                  item.id,
                ) ?? 0;

              const sisa: number =
                Math.max(
                  item.pph23_terutang -
                    terbayar,
                  0,
                );

              return {
                ...item,
                terbayar,
                sisa,
                status: getPph23Status(
                  sisa,
                  terbayar,
                ),
              };
            },
          );

        if (!active) {
          return;
        }

        setPph23List(options);
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        console.error(
          "LOAD PPH23 PAYMENT SOURCE ERROR:",
          error,
        );

        setPph23List([]);

        await Swal.fire(
          "Data PPh23 Tidak Dapat Dimuat",
          getUnknownErrorMessage(
            error,
            "Daftar PPh23 tidak dapat digunakan untuk pembayaran.",
          ),
          "error",
        );
      } finally {
        if (active) {
          setLoadingPph23(false);
        }
      }
    }

    void loadPph23();

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
   *
   * COA 3 - 11100 Kas sengaja dikeluarkan.
   * ========================================================== */

  useEffect(() => {
    let active = true;

    async function loadCoaKas(): Promise<void> {
      try {
        setLoadingCoa(true);

        const response = await fetch(
          COA_ENDPOINT,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const result: unknown =
          await readJsonSafely(response);

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

        const normalized: CoaKas[] =
          normalizeCoaKasList(result);

        if (!active) {
          return;
        }

        setCoaKasList(normalized);
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
      return "Tanggal pembayaran PPh23 wajib diisi.";
    }

    if (form.id_pph23 <= 0) {
      return "Pilih PPh23 yang akan dibayar.";
    }

    if (!selectedPph23) {
      return "Data PPh23 yang dipilih tidak tersedia.";
    }

    if (
      selectedPph23.pph23_terutang <= 0
    ) {
      return "Nilai PPh23 terutang tidak valid.";
    }

    if (
      selectedPph23.sisa <= 0 ||
      selectedPph23.status === "PAID"
    ) {
      return "PPh23 yang dipilih sudah lunas.";
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
        "COA 3 - 11100 Kas adalah COA HEADER. " +
        "Gunakan COA kas/bank DETAIL."
      );
    }

    if (
      !Number.isFinite(form.nominal) ||
      form.nominal <= 0
    ) {
      return (
        "Nominal pembayaran PPh23 harus lebih besar dari 0."
      );
    }

    if (
      form.nominal >
      selectedPph23.sisa + 0.01
    ) {
      return (
        `Nominal pembayaran melebihi sisa PPh23. ` +
        `Maksimal pembayaran: ${formatRupiah(
          selectedPph23.sisa,
        )}.`
      );
    }

    if (!form.keterangan.trim()) {
      return "Keterangan pembayaran PPh23 wajib diisi.";
    }

    return null;
  }

  /* ==========================================================
   * SUBMIT
   *
   * Database pembayaran_pph23:
   *
   * - tanggal
   * - id_pph23
   * - nominal
   * - keterangan
   * - id_coa_kas
   *
   * Tidak mengirim:
   *
   * - id_coa_hutang
   * - pph4
   * - ppn
   * - total
   *
   * COA hutang ditentukan backend:
   *
   * PAJAK_PPH23 / HUTANG
   *        ↓
   * 55 - 21303 Hutang Pajak PPh 23
   * ========================================================== */

  async function handleSubmit(): Promise<void> {
    if (saving) {
      return;
    }

    const validationError: string | null =
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
       * COA HUTANG TIDAK DIKIRIM DARI FRONTEND.
       *
       * Backend/helper harus menghasilkan:
       *
       * PAJAK_PPH23 / HUTANG
       *        ↓
       * 55 - 21303 Hutang Pajak PPh 23
       *
       * Kredit:
       * id_coa_kas pilihan user.
       */

      const payload = {
        tanggal: form.tanggal,
        id_pph23: form.id_pph23,
        id_coa_kas: form.id_coa_kas,
        nominal: form.nominal,
        keterangan:
          form.keterangan.trim(),
      };

      const response = await fetch(
        PAYMENT_ENDPOINT,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result: unknown =
        await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            result,
            "Gagal menyimpan pembayaran PPh23.",
          ),
        );
      }

      await Swal.fire(
        "Sukses",
        getSuccessMessage(
          result,
          "Pembayaran PPh23 dan jurnal berhasil dibuat.",
        ),
        "success",
      );

      router.push(
        "/pajak/pembayaran-pph23",
      );

      router.refresh();
    } catch (error: unknown) {
      console.error(
        "SUBMIT PEMBAYARAN PPH23 ERROR:",
        error,
      );

      await Swal.fire(
        "Error",
        getUnknownErrorMessage(
          error,
          "Gagal menyimpan pembayaran PPh23.",
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
    loadingPph23 ||
    loadingCoa
  ) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card title="Tambah Pembayaran PPh23">
          <div className="flex items-center justify-center py-12">
            <Loader2Icon />

            <span>
              Memuat data pembayaran PPh23...
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
      <Card title="Tambah Pembayaran PPh23">
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
              PPH23 YANG DIBAYAR
              ================================================== */}

          <div>
            <label className="text-sm">
              PPh23 yang Dibayar
            </label>

            <select
              className="w-full rounded border p-2"
              value={form.id_pph23}
              disabled={saving}
              onChange={(event) => {
                const idPph23: number =
                  Number(
                    event.target.value,
                  );

                const selected:
                  | Pph23Option
                  | undefined =
                  pph23List.find(
                    (
                      item: Pph23Option,
                    ): boolean =>
                      item.id ===
                      idPph23,
                  );

                handleChange(
                  "id_pph23",
                  idPph23,
                );

                /*
                 * Saat memilih PPh23 baru,
                 * nominal dikembalikan ke 0
                 * agar user mengisi jumlah
                 * pembayaran secara sadar.
                 */

                handleChange(
                  "nominal",
                  0,
                );

                /*
                 * Keterangan tidak diubah
                 * otomatis.
                 */

                void selected;
              }}
            >
              <option value={0}>
                {pph23List.length === 0
                  ? "Tidak ada PPh23 yang dapat dibayar"
                  : "Pilih PPh23"}
              </option>

              {pph23List.map(
                (
                  item: Pph23Option,
                ) => {
                  const disabled: boolean =
                    item.sisa <= 0 ||
                    item.status === "PAID";

                  const vendorName: string =
                    item.vendor
                      ?.nama_vendor ??
                    `Vendor #${item.id_vendor}`;

                  return (
                    <option
                      key={item.id}
                      value={item.id}
                      disabled={disabled}
                    >
                      #{item.id} |{" "}
                      {vendorName} |{" "}
                      {formatTanggal(
                        item.tanggal_transaksi,
                      )} |{" "}
                      {item.jenis_jasa} |{" "}
                      PPh23:{" "}
                      {formatRupiah(
                        item.pph23_terutang,
                      )} | Sisa:{" "}
                      {formatRupiah(
                        item.sisa,
                      )} |{" "}
                      {getStatusLabel(
                        item.status,
                      )}
                    </option>
                  );
                },
              )}
            </select>

            <p className="mt-1 text-xs text-gray-500">
              Data diambil dari public.pph23
              menggunakan tanggal_transaksi.
              Sisa dihitung dari PPh23 terutang
              dikurangi pembayaran sebelumnya.
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
              Hanya COA kas/bank DETAIL yang
              aktif. COA 3 - 11100 Kas adalah
              HEADER dan tidak dapat digunakan.
            </p>
          </div>

          {/* ==================================================
              NOMINAL
              ================================================== */}

          <Input
            label="Nominal Pembayaran PPh23"
            type="number"
            min={0}
            value={form.nominal}
            disabled={
              saving ||
              !selectedPph23
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
            INFORMASI PPH23
            ==================================================== */}

        {selectedPph23 ? (
          <div className="mt-4 rounded border p-4 text-sm">
            <p className="font-semibold">
              Informasi PPh23
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <InfoItem
                label="Vendor"
                value={
                  selectedPph23.vendor
                    ?.nama_vendor ??
                  `Vendor #${selectedPph23.id_vendor}`
                }
              />

              <InfoItem
                label="Tanggal Transaksi"
                value={formatTanggal(
                  selectedPph23.tanggal_transaksi,
                )}
              />

              <InfoItem
                label="Jenis Jasa"
                value={
                  selectedPph23.jenis_jasa ||
                  "-"
                }
              />

              <InfoItem
                label="Nilai Transaksi"
                value={formatRupiah(
                  selectedPph23.nilai_transaksi,
                )}
              />

              <InfoItem
                label="Tarif PPh23"
                value={`${formatNumber(
                  selectedPph23.tarif_pph23,
                )}%`}
              />

              <InfoItem
                label="PPh23 Terutang"
                value={formatRupiah(
                  selectedPph23.pph23_terutang,
                )}
              />

              <InfoItem
                label="Sudah Dibayar"
                value={formatRupiah(
                  selectedPph23.terbayar,
                )}
              />

              <InfoItem
                label="Sisa PPh23"
                value={formatRupiah(
                  selectedPph23.sisa,
                )}
              />

              <InfoItem
                label="Status"
                value={getStatusLabel(
                  selectedPph23.status,
                )}
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
                sisaPph23,
              )}
            />
          </div>
        </div>

        {/* ====================================================
            INFORMASI JURNAL
            ==================================================== */}

        <div className="mt-4 rounded border p-4 text-sm">
          <p className="font-semibold">
            Jurnal Pembayaran PPh23
          </p>

          <p className="mt-2">
            <strong>Debit:</strong>{" "}
            {PPH23_HUTANG_COA_LABEL}
          </p>

          <p className="mt-1">
            <strong>Kredit:</strong>{" "}
            {selectedCoaKas
              ? `${selectedCoaKas.kode} - ${selectedCoaKas.nama}`
              : "COA Kas / Bank DETAIL yang dipilih"}
          </p>

          <p className="mt-3 text-xs text-gray-500">
            COA hutang PPh23 tidak dipilih dari
            frontend. Backend/helper menetapkan
            COA 55 melalui mapping
            PAJAK_PPH23 / HUTANG.
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Pembayaran PPh23 tidak menggunakan
            COA 2264 - 62002 Beban Pajak PPh23,
            tidak menggunakan COA 1213 - 21308
            Hutang PPh23 Proyek, dan tidak
            menggunakan COA 3 - 11100 Kas HEADER.
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
              pph23List.length === 0 ||
              coaKasList.length === 0
            }
            onClick={() => {
              void handleSubmit();
            }}
          >
            <Save className="mr-2 h-4 w-4" />

            {saving
              ? "Menyimpan..."
              : "Simpan Pembayaran PPh23"}
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
 * NORMALIZE PPH23
 *
 * Mengikuti struktur database public.pph23:
 *
 * id
 * id_vendor
 * jenis_jasa
 * nilai_transaksi
 * tarif_pph23
 * pph23_terutang
 * tanggal_transaksi
 * created_at
 * id_periode
 * ============================================================ */

function normalizePph23List(
  value: unknown[],
): Pph23[] {
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
      ): Pph23 => ({
        id: Number(
          item.id,
        ),

        id_vendor: Number(
          item.id_vendor,
        ),

        jenis_jasa: String(
          item.jenis_jasa ?? "",
        ),

        nilai_transaksi: Number(
          item.nilai_transaksi ?? 0,
        ),

        tarif_pph23: Number(
          item.tarif_pph23 ?? 0,
        ),

        pph23_terutang: Number(
          item.pph23_terutang ?? 0,
        ),

        tanggal_transaksi: String(
          item.tanggal_transaksi ?? "",
        ),

        created_at: String(
          item.created_at ?? "",
        ),

        id_periode:
          item.id_periode ===
            null ||
          item.id_periode ===
            undefined
            ? null
            : Number(
                item.id_periode,
              ),

        vendor:
          normalizeVendor(
            item.vendors ??
              item.vendor,
          ),
      }),
    )
    .filter(
      (
        item: Pph23,
      ): boolean =>
        Number.isInteger(
          item.id,
        ) &&
        item.id > 0 &&
        Number.isInteger(
          item.id_vendor,
        ) &&
        item.id_vendor > 0 &&
        item.jenis_jasa.length > 0 &&
        item.tanggal_transaksi.length >
          0 &&
        Number.isFinite(
          item.pph23_terutang,
        ) &&
        item.pph23_terutang > 0,
    );
}

/* ============================================================
 * NORMALIZE VENDOR
 * ============================================================ */

function normalizeVendor(
  value: unknown,
): VendorInfo | null {
  if (
    typeof value !==
      "object" ||
    value === null
  ) {
    return null;
  }

  const item =
    value as Record<
      string,
      unknown
    >;

  const id: number =
    Number(item.id);

  const namaVendor: string =
    String(
      item.nama_vendor ?? "",
    );

  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    !namaVendor
  ) {
    return null;
  }

  return {
    id,

    kode_vendor:
      item.kode_vendor ===
        null ||
      item.kode_vendor ===
        undefined
        ? null
        : String(
            item.kode_vendor,
          ),

    nama_vendor:
      namaVendor,

    npwp:
      item.npwp === null ||
      item.npwp === undefined
        ? null
        : String(
            item.npwp,
          ),
  };
}

/* ============================================================
 * NORMALIZE PEMBAYARAN
 *
 * Hanya mengambil kolom:
 *
 * id
 * id_pph23
 * nominal
 * ============================================================ */

function normalizePembayaranList(
  value: unknown,
): PembayaranPph23[] {
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
      ): PembayaranPph23 => ({
        id: Number(
          item.id,
        ),

        id_pph23: Number(
          item.id_pph23,
        ),

        nominal: Number(
          item.nominal ?? 0,
        ),
      }),
    )
    .filter(
      (
        item: PembayaranPph23,
      ): boolean =>
        Number.isInteger(
          item.id,
        ) &&
        item.id > 0 &&
        Number.isInteger(
          item.id_pph23,
        ) &&
        item.id_pph23 > 0 &&
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
          item.is_cash ===
          true,

        is_header:
          item.is_header ===
          true,

        aktif:
          item.aktif ===
          true,
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

function getPph23Status(
  sisa: number,
  terbayar: number,
): Pph23Status {
  if (sisa <= 0) {
    return "PAID";
  }

  if (terbayar > 0) {
    return "PARTIAL";
  }

  return "UNPAID";
}

function getStatusLabel(
  status: Pph23Status,
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
 * FORMAT NUMBER
 * ============================================================ */

function formatNumber(
  value: number,
): string {
  const numberValue: number =
    Number.isFinite(value)
      ? value
      : 0;

  return numberValue.toLocaleString(
    "id-ID",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
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