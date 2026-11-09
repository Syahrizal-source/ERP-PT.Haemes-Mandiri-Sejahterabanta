"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

/* ============================================================
 * TYPE
 * ============================================================ */

type Jenis =
  | "MASUK"
  | "KELUAR"
  | "BIAYA_BANK"
  | "PAJAK_BANK";

type RekeningBank = {
  id: number;
  nama_bank: string;
  no_rekening: string;
  nama_pemilik: string;
};

type CoaLawan = {
  id_coa: number;
  kode: string;
  nama: string;
};

type FormState = {
  id_rekening: number;
  tanggal: string;
  deskripsi: string;
  debit: number;
  kredit: number;
  jenis: Jenis;
  id_coa_lawan: number | null;
};

/* ============================================================
 * ENDPOINT
 *
 * Jika project Anda menggunakan route COA yang berbeda,
 * cukup ubah satu konstanta ini.
 * ============================================================ */

const COA_ENDPOINT = "/api/coa";

/* ============================================================
 * PAGE
 * ============================================================ */

export default function CreateRekeningKoranPage(): React.JSX.Element {
  const router = useRouter();

  /* ==========================================================
   * FORM
   * ========================================================== */

  const [form, setForm] = useState<FormState>({
    id_rekening: 0,
    tanggal: "",
    deskripsi: "",
    debit: 0,
    kredit: 0,
    jenis: "MASUK",
    id_coa_lawan: null,
  });

  /* ==========================================================
   * DATA
   * ========================================================== */

  const [rekeningList, setRekeningList] =
    useState<RekeningBank[]>([]);

  const [coaLawanList, setCoaLawanList] =
    useState<CoaLawan[]>([]);

  /* ==========================================================
   * LOADING
   * ========================================================== */

  const [loadingRekening, setLoadingRekening] =
    useState<boolean>(true);

  const [loadingCoa, setLoadingCoa] =
    useState<boolean>(false);

  const [saving, setSaving] =
    useState<boolean>(false);

  /* ==========================================================
   * LOAD REKENING BANK
   * ========================================================== */

  useEffect(() => {
    let active = true;

    async function loadRekening(): Promise<void> {
      try {
        setLoadingRekening(true);

        const response = await fetch(
          "/api/rekening-bank",
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
              "Gagal mengambil rekening bank.",
            ),
          );
        }

        if (!Array.isArray(result)) {
          throw new Error(
            "Format data rekening bank tidak valid.",
          );
        }

        const rekeningData =
          result as RekeningBank[];

        if (!active) {
          return;
        }

        setRekeningList(
          rekeningData,
        );

        if (rekeningData.length > 0) {
          setForm((prev) => ({
            ...prev,
            id_rekening:
              prev.id_rekening > 0
                ? prev.id_rekening
                : rekeningData[0].id,
          }));
        }
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        await Swal.fire(
          "Error",
          getUnknownErrorMessage(
            error,
            "Gagal mengambil rekening bank.",
          ),
          "error",
        );
      } finally {
        if (active) {
          setLoadingRekening(false);
        }
      }
    }

    void loadRekening();

    return () => {
      active = false;
    };
  }, []);

  /* ==========================================================
   * LOAD COA LAWAN
   *
   * Hanya untuk:
   * - MASUK
   * - KELUAR
   * ========================================================== */

  useEffect(() => {
    const membutuhkanCoaLawan =
      form.jenis === "MASUK" ||
      form.jenis === "KELUAR";

    if (!membutuhkanCoaLawan) {
      setCoaLawanList([]);

      setForm((prev) => ({
        ...prev,
        id_coa_lawan: null,
      }));

      return;
    }

    let active = true;

    async function loadCoaLawan(): Promise<void> {
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
              "Gagal mengambil daftar COA.",
            ),
          );
        }

        if (!Array.isArray(result)) {
          throw new Error(
            "Format daftar COA tidak valid.",
          );
        }

        if (!active) {
          return;
        }

        setCoaLawanList(
          normalizeCoaList(result),
        );
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        setCoaLawanList([]);

        await Swal.fire(
          "COA Tidak Tersedia",
          getUnknownErrorMessage(
            error,
            "Daftar COA lawan tidak dapat dimuat.",
          ),
          "error",
        );
      } finally {
        if (active) {
          setLoadingCoa(false);
        }
      }
    }

    void loadCoaLawan();

    return () => {
      active = false;
    };
  }, [form.jenis]);

  /* ==========================================================
   * CHANGE FORM
   * ========================================================== */

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  /* ==========================================================
   * CHANGE JENIS
   * ========================================================== */

  function handleJenis(
    jenis: Jenis,
  ): void {
    setForm((prev) => ({
      ...prev,

      jenis,

      debit:
        jenis === "MASUK"
          ? prev.debit
          : 0,

      kredit:
        jenis === "MASUK"
          ? 0
          : prev.kredit,

      id_coa_lawan:
        jenis === "MASUK" ||
        jenis === "KELUAR"
          ? prev.id_coa_lawan
          : null,
    }));
  }

  /* ==========================================================
   * NILAI
   * ========================================================== */

  const debit: number =
    Number.isFinite(form.debit)
      ? Math.max(0, form.debit)
      : 0;

  const kredit: number =
    Number.isFinite(form.kredit)
      ? Math.max(0, form.kredit)
      : 0;

  /* ==========================================================
   * VALIDASI
   * ========================================================== */

  function validateForm(): string | null {
    if (
      form.id_rekening <= 0
    ) {
      return "Pilih rekening bank terlebih dahulu.";
    }

    if (!form.tanggal) {
      return "Tanggal wajib diisi.";
    }

    if (
      !form.deskripsi.trim()
    ) {
      return "Deskripsi wajib diisi.";
    }

    if (
      debit > 0 &&
      kredit > 0
    ) {
      return "Debit dan kredit tidak boleh diisi bersamaan.";
    }

    if (
      debit === 0 &&
      kredit === 0
    ) {
      return "Isi debit atau kredit.";
    }

    if (
      form.jenis === "MASUK"
    ) {
      if (debit <= 0) {
        return "Transaksi MASUK harus memiliki debit.";
      }

      if (kredit !== 0) {
        return "Transaksi MASUK tidak boleh memiliki kredit.";
      }
    }

    if (
      form.jenis !== "MASUK"
    ) {
      if (kredit <= 0) {
        return `Transaksi ${form.jenis} harus memiliki kredit.`;
      }

      if (debit !== 0) {
        return `Transaksi ${form.jenis} tidak boleh memiliki debit.`;
      }
    }

    if (
      (form.jenis === "MASUK" ||
        form.jenis === "KELUAR") &&
      (!form.id_coa_lawan ||
        form.id_coa_lawan <= 0)
    ) {
      return "COA lawan wajib dipilih.";
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

    const validationError =
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

      const payload = {
        id_rekening:
          form.id_rekening,

        tanggal:
          form.tanggal,

        deskripsi:
          form.deskripsi.trim(),

        debit,

        kredit,

        saldo: 0,

        jenis:
          form.jenis,

        id_coa_lawan:
          form.jenis === "MASUK" ||
          form.jenis === "KELUAR"
            ? form.id_coa_lawan
            : undefined,
      };

      const response = await fetch(
        "/api/rekening-koran",
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
        await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            result,
            "Gagal menyimpan rekening koran.",
          ),
        );
      }

      await Swal.fire(
        "Sukses",
        getSuccessMessage(
          result,
          "Rekening koran dan jurnal berhasil ditambahkan.",
        ),
        "success",
      );

      router.push(
        "/accounting/rekening-koran",
      );

      router.refresh();
    } catch (error: unknown) {
      await Swal.fire(
        "Error",
        getUnknownErrorMessage(
          error,
          "Gagal menyimpan rekening koran.",
        ),
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  /* ==========================================================
   * RENDER
   * ========================================================== */

  return (
    <Card title="Tambah Rekening Koran">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

        {/* ====================================================
         * TANGGAL
         * ==================================================== */}

        <Input
          label="Tanggal"
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

        {/* ====================================================
         * REKENING BANK
         * ==================================================== */}

        <div>
          <label className="text-sm">
            Rekening Bank
          </label>

          <select
            className="w-full rounded border p-2"
            value={form.id_rekening}
            disabled={
              loadingRekening ||
              saving
            }
            onChange={(event) =>
              handleChange(
                "id_rekening",
                Number(
                  event.target.value,
                ),
              )
            }
          >
            <option value={0}>
              {loadingRekening
                ? "Memuat rekening..."
                : "Pilih rekening"}
            </option>

            {rekeningList.map(
              (rekening) => (
                <option
                  key={rekening.id}
                  value={rekening.id}
                >
                  {rekening.nama_bank}{" "}
                  -{" "}
                  {rekening.no_rekening}
                </option>
              ),
            )}
          </select>
        </div>

        {/* ====================================================
         * DESKRIPSI
         * ==================================================== */}

        <div className="md:col-span-2">
          <Input
            label="Deskripsi"
            value={form.deskripsi}
            disabled={saving}
            onChange={(event) =>
              handleChange(
                "deskripsi",
                event.target.value,
              )
            }
          />
        </div>

        {/* ====================================================
         * JENIS
         * ==================================================== */}

        <div>
          <label className="text-sm">
            Jenis
          </label>

          <select
            className="w-full rounded border p-2"
            value={form.jenis}
            disabled={saving}
            onChange={(event) =>
              handleJenis(
                event.target.value as Jenis,
              )
            }
          >
            <option value="MASUK">
              MASUK
            </option>

            <option value="KELUAR">
              KELUAR
            </option>

            <option value="BIAYA_BANK">
              BIAYA BANK
            </option>

            <option value="PAJAK_BANK">
              PAJAK BANK
            </option>
          </select>
        </div>

        {/* ====================================================
         * COA LAWAN
         *
         * Hanya MASUK / KELUAR.
         * ==================================================== */}

        {(form.jenis === "MASUK" ||
          form.jenis === "KELUAR") && (
          <div>
            <label className="text-sm">
              COA Lawan
            </label>

            <select
              className="w-full rounded border p-2"
              value={
                form.id_coa_lawan ?? 0
              }
              disabled={
                loadingCoa ||
                saving
              }
              onChange={(event) =>
                handleChange(
                  "id_coa_lawan",
                  Number(
                    event.target.value,
                  ) || null,
                )
              }
            >
              <option value={0}>
                {loadingCoa
                  ? "Memuat COA..."
                  : "Pilih COA lawan"}
              </option>

              {coaLawanList.map(
                (coa) => (
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
          </div>
        )}

        {/* ====================================================
         * DEBIT
         * ==================================================== */}

        <Input
          label="Debit"
          type="number"
          value={form.debit}
          disabled={
            saving ||
            form.jenis !== "MASUK"
          }
          onChange={(event) =>
            handleChange(
              "debit",
              Number(
                event.target.value,
              ),
            )
          }
        />

        {/* ====================================================
         * KREDIT
         * ==================================================== */}

        <Input
          label="Kredit"
          type="number"
          value={form.kredit}
          disabled={
            saving ||
            form.jenis === "MASUK"
          }
          onChange={(event) =>
            handleChange(
              "kredit",
              Number(
                event.target.value,
              ),
            )
          }
        />
      </div>

      {/* ======================================================
       * INFORMASI JURNAL
       * ====================================================== */}

      <div className="mt-4 rounded border p-3 text-sm">
        <p>
          <strong>Debit:</strong>{" "}
          {debit.toLocaleString("id-ID")}
        </p>

        <p>
          <strong>Kredit:</strong>{" "}
          {kredit.toLocaleString("id-ID")}
        </p>

        {form.jenis === "MASUK" && (
          <p className="mt-2">
            Jurnal: Dr Bank, Cr COA
            Lawan.
          </p>
        )}

        {form.jenis === "KELUAR" && (
          <p className="mt-2">
            Jurnal: Dr COA Lawan, Cr
            Bank.
          </p>
        )}

        {form.jenis ===
          "BIAYA_BANK" && (
          <p className="mt-2">
            COA biaya menggunakan
            mapping
            REKENING_KORAN / BIAYA.
          </p>
        )}

        {form.jenis ===
          "PAJAK_BANK" && (
          <p className="mt-2">
            COA pajak menggunakan
            mapping
            REKENING_KORAN / PAJAK.
          </p>
        )}
      </div>

      {/* ======================================================
       * BUTTON
       * ====================================================== */}

      <div className="mt-4 flex gap-2">
        <Button
          onClick={handleSubmit}
          disabled={
            saving ||
            loadingRekening
          }
        >
          {saving
            ? "Menyimpan..."
            : "Simpan"}
        </Button>

        <Button
          type="button"
          disabled={saving}
          onClick={() =>
            router.push(
              "/accounting/rekening-koran",
            )
          }
        >
          Batal
        </Button>
      </div>
    </Card>
  );
}

/* ============================================================
 * SAFE JSON
 *
 * Mencegah error:
 *
 *   Unexpected token '<'
 *
 * ketika server mengembalikan HTML/404.
 * ============================================================ */

async function readJsonSafely(
  response: Response,
): Promise<unknown> {
  const contentType =
    response.headers.get(
      "content-type",
    ) ?? "";

  if (
    !contentType.includes(
      "application/json",
    )
  ) {
    const text =
      await response.text();

    throw new Error(
      `Server mengembalikan response bukan JSON (${response.status}). ` +
        `${text.slice(0, 200)}`,
    );
  }

  return response.json();
}

/* ============================================================
 * NORMALIZE COA
 * ============================================================ */

function normalizeCoaList(
  value: unknown[],
): CoaLawan[] {
  return value
    .filter(
      (
        item,
      ): item is Record<
        string,
        unknown
      > =>
        typeof item === "object" &&
        item !== null,
    )
    .map((item) => ({
      id_coa: Number(
        item.id_coa,
      ),
      kode: String(
        item.kode ?? "",
      ),
      nama: String(
        item.nama ?? "",
      ),
    }))
    .filter(
      (item) =>
        Number.isInteger(
          item.id_coa,
        ) &&
        item.id_coa > 0 &&
        item.kode.length > 0 &&
        item.nama.length > 0,
    );
}

/* ============================================================
 * ERROR MESSAGE
 * ============================================================ */

function getErrorMessage(
  value: unknown,
  fallback: string,
): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value
  ) {
    const error =
      value.error;

    if (
      typeof error === "string" &&
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
    typeof value === "object" &&
    value !== null &&
    "message" in value
  ) {
    const message =
      value.message;

    if (
      typeof message === "string" &&
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

