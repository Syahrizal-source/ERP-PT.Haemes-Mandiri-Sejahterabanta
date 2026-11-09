"use client";

import type { FormEvent } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

/* =========================================================
   TYPE
========================================================= */

type BiayaUmumKategori =
  | "ATK"
  | "LISTRIK"
  | "PAM"
  | "TELPON"
  | "BUNGA_BANK";

type StatusMapping =
  | "BELUM_MAPPING"
  | "SUDAH_MAPPING"
  | "DIBATALKAN";

type CoaTipe =
  | "ASET"
  | "LIABILITAS"
  | "EKUITAS"
  | "PENDAPATAN"
  | "BEBAN";

interface ApiErrorResponse {
  message?: string;
}

interface CoaApiRow {
  id_coa: number;
  kode: string;
  nama: string;
  tipe: CoaTipe;
  parent_id: number | null;
  aktif: boolean;
  is_cash: boolean;
}

interface BiayaUmumItem {
  id: number;
  tanggal: string;
  kategori: BiayaUmumKategori;
  keterangan: string;
  nilai: number;
  id_coa: number | null;
  status_mapping: StatusMapping;
  sumber: string;
  created_at: string;
}

interface BiayaUmumFormState {
  tanggal: string;
  kategori: BiayaUmumKategori;
  keterangan: string;
  nilai: string;
  id_coa_kas: number | null;
}

interface CreateBiayaUmumPayload {
  tanggal: string;
  kategori: BiayaUmumKategori;
  keterangan: string;
  nilai: number;
  id_coa_kas: number;
}

interface BiayaUmumApiResponse {
  data?: unknown;
  message?: unknown;
}

/* =========================================================
   CONSTANT
========================================================= */

const KATEGORI_OPTIONS: Array<{
  value: BiayaUmumKategori;
  label: string;
}> = [
  {
    value: "ATK",
    label: "Biaya ATK PT. HMS",
  },
  {
    value: "LISTRIK",
    label: "Biaya Listrik PT. HMS",
  },
  {
    value: "PAM",
    label: "Biaya PAM PT. HMS",
  },
  {
    value: "TELPON",
    label: "Biaya Telpon PT. HMS",
  },
  {
    value: "BUNGA_BANK",
    label: "Biaya Bunga Bank PT. HMS",
  },
];

/* =========================================================
   HELPER
========================================================= */

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCoaTipe(value: unknown): value is CoaTipe {
  return (
    value === "ASET" ||
    value === "LIABILITAS" ||
    value === "EKUITAS" ||
    value === "PENDAPATAN" ||
    value === "BEBAN"
  );
}

function isBiayaUmumKategori(
  value: unknown,
): value is BiayaUmumKategori {
  return (
    value === "ATK" ||
    value === "LISTRIK" ||
    value === "PAM" ||
    value === "TELPON" ||
    value === "BUNGA_BANK"
  );
}

function isStatusMapping(
  value: unknown,
): value is StatusMapping {
  return (
    value === "BELUM_MAPPING" ||
    value === "SUDAH_MAPPING" ||
    value === "DIBATALKAN"
  );
}

function isCoaApiRow(
  value: unknown,
): value is CoaApiRow {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id_coa === "number" &&
    typeof value.kode === "string" &&
    typeof value.nama === "string" &&
    isCoaTipe(value.tipe) &&
    (value.parent_id === null ||
      typeof value.parent_id === "number") &&
    typeof value.aktif === "boolean" &&
    typeof value.is_cash === "boolean"
  );
}

function isBiayaUmumItem(
  value: unknown,
): value is BiayaUmumItem {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "number" &&
    typeof value.tanggal === "string" &&
    isBiayaUmumKategori(value.kategori) &&
    typeof value.keterangan === "string" &&
    typeof value.nilai === "number" &&
    (value.id_coa === null ||
      typeof value.id_coa === "number") &&
    isStatusMapping(value.status_mapping) &&
    typeof value.sumber === "string" &&
    typeof value.created_at === "string"
  );
}

function getTodayJakarta(): string {
  const formatter = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  );

  return formatter.format(new Date());
}

function formatRupiah(
  value: number,
): string {
  return new Intl.NumberFormat(
    "id-ID",
    {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    },
  ).format(value);
}

function formatNumberInput(
  value: string,
): string {
  const numeric = value.replace(/\D/g, "");

  if (!numeric) {
    return "";
  }

  return new Intl.NumberFormat(
    "id-ID",
  ).format(Number(numeric));
}

function parseNumberInput(
  value: string,
): number {
  const normalized = value
    .replace(/\./g, "")
    .replace(/,/g, "")
    .replace(/\D/g, "");

  if (!normalized) {
    return 0;
  }

  return Number(normalized);
}

function getKategoriLabel(
  kategori: BiayaUmumKategori,
): string {
  const item = KATEGORI_OPTIONS.find(
    (option) => option.value === kategori,
  );

  return item?.label ?? kategori;
}

function getStatusClass(
  status: StatusMapping,
): string {
  switch (status) {
    case "SUDAH_MAPPING":
      return "border-green-200 bg-green-50 text-green-700";

    case "BELUM_MAPPING":
      return "border-yellow-200 bg-yellow-50 text-yellow-700";

    case "DIBATALKAN":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

/* =========================================================
   DEFAULT FORM
========================================================= */

function createEmptyForm(): BiayaUmumFormState {
  return {
    tanggal: getTodayJakarta(),
    kategori: "ATK",
    keterangan: "",
    nilai: "",
    id_coa_kas: null,
  };
}

/* =========================================================
   PAGE
========================================================= */

export default function BiayaUmumPage(): React.JSX.Element {
  const [data, setData] = useState<BiayaUmumItem[]>([]);

  const [coa, setCoa] = useState<CoaApiRow[]>([]);

  const [loading, setLoading] =
    useState<boolean>(true);

  const [loadingCoa, setLoadingCoa] =
    useState<boolean>(true);

  const [saving, setSaving] =
    useState<boolean>(false);

  const [search, setSearch] =
    useState<string>("");

  const [filterKategori, setFilterKategori] =
    useState<BiayaUmumKategori | "ALL">("ALL");

  const [filterStatus, setFilterStatus] =
    useState<StatusMapping | "ALL">("ALL");

  const [showForm, setShowForm] =
    useState<boolean>(false);

  const [form, setForm] =
    useState<BiayaUmumFormState>(
      createEmptyForm(),
    );

  /* =========================================================
     FETCH BIAYA UMUM
  ========================================================= */

  const fetchBiayaUmum =
    useCallback(
      async (): Promise<void> => {
        try {
          setLoading(true);

          const response = await fetch(
            "/api/biayaUmum",
            {
              method: "GET",
              cache: "no-store",
            },
          );

          const result: unknown =
            await response.json();

          if (!response.ok) {
            const errorResult: ApiErrorResponse =
              isObject(result)
                ? {
                    message:
                      typeof result.message ===
                      "string"
                        ? result.message
                        : undefined,
                  }
                : {};

            throw new Error(
              errorResult.message ??
                "Gagal mengambil data biaya umum.",
            );
          }

          const rawData: unknown =
            isObject(result) &&
            Array.isArray(result.data)
              ? result.data
              : result;

          if (!Array.isArray(rawData)) {
            throw new Error(
              "Response API biaya umum tidak valid.",
            );
          }

          const rows: BiayaUmumItem[] =
            rawData.filter(
              (
                item,
              ): item is BiayaUmumItem =>
                isBiayaUmumItem(item),
            );

          setData(rows);
        } catch (error: unknown) {
          console.error(
            "FETCH BIAYA UMUM ERROR:",
            error,
          );

          const message =
            error instanceof Error
              ? error.message
              : "Gagal mengambil data biaya umum.";

          await Swal.fire({
            icon: "error",
            title: "Gagal Memuat Biaya Umum",
            text: message,
          });
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  /* =========================================================
     FETCH COA
  ========================================================= */

  const fetchCoa =
    useCallback(
      async (): Promise<void> => {
        try {
          setLoadingCoa(true);

          const response = await fetch(
            "/api/coa",
            {
              method: "GET",
              cache: "no-store",
            },
          );

          const result: unknown =
            await response.json();

          if (!response.ok) {
            const errorResult: ApiErrorResponse =
              isObject(result)
                ? {
                    message:
                      typeof result.message ===
                      "string"
                        ? result.message
                        : undefined,
                  }
                : {};

            throw new Error(
              errorResult.message ??
                "Gagal mengambil COA.",
            );
          }

          if (!Array.isArray(result)) {
            throw new Error(
              "Response API COA tidak valid.",
            );
          }

          const rows: CoaApiRow[] =
            result.filter(
              (
                item,
              ): item is CoaApiRow =>
                isCoaApiRow(item),
            );

          setCoa(rows);
        } catch (error: unknown) {
          console.error(
            "FETCH COA ERROR:",
            error,
          );

          const message =
            error instanceof Error
              ? error.message
              : "Gagal mengambil COA.";

          await Swal.fire({
            icon: "error",
            title: "Gagal Memuat COA",
            text: message,
          });
        } finally {
          setLoadingCoa(false);
        }
      },
      [],
    );

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    void fetchBiayaUmum();
    void fetchCoa();
  }, [
    fetchBiayaUmum,
    fetchCoa,
  ]);

  /* =========================================================
     CASH ACCOUNT
     
     HANYA COA:
     - aktif
     - ASET
     - is_cash = true
     
     Tidak ada hardcode ID COA.
  ========================================================= */

  const cashAccounts =
    useMemo<CoaApiRow[]>(() => {
      return coa
        .filter(
          (item) =>
            item.aktif === true &&
            item.tipe === "ASET" &&
            item.is_cash === true,
        )
        .sort((a, b) =>
          a.kode.localeCompare(
            b.kode,
          ),
        );
    }, [coa]);

  /* =========================================================
     FILTER
  ========================================================= */

  const filteredData =
    useMemo<BiayaUmumItem[]>(() => {
      const keyword =
        search.trim().toLowerCase();

      return data.filter((item) => {
        const matchesSearch =
          keyword.length === 0 ||
          String(item.id).includes(
            keyword,
          ) ||
          item.tanggal
            .toLowerCase()
            .includes(keyword) ||
          item.kategori
            .toLowerCase()
            .includes(keyword) ||
          item.keterangan
            .toLowerCase()
            .includes(keyword) ||
          String(item.id_coa ?? "")
            .includes(keyword);

        const matchesKategori =
          filterKategori === "ALL" ||
          item.kategori ===
            filterKategori;

        const matchesStatus =
          filterStatus === "ALL" ||
          item.status_mapping ===
            filterStatus;

        return (
          matchesSearch &&
          matchesKategori &&
          matchesStatus
        );
      });
    }, [
      data,
      search,
      filterKategori,
      filterStatus,
    ]);

  /* =========================================================
     SUMMARY
  ========================================================= */

  const summary =
    useMemo(() => {
      const total = data.reduce(
        (sum, item) =>
          sum + item.nilai,
        0,
      );

      const mapped =
        data.filter(
          (item) =>
            item.status_mapping ===
            "SUDAH_MAPPING",
        ).length;

      const belumMapping =
        data.filter(
          (item) =>
            item.status_mapping ===
            "BELUM_MAPPING",
        ).length;

      return {
        jumlah: data.length,
        total,
        mapped,
        belumMapping,
      };
    }, [data]);

  /* =========================================================
     UPDATE FORM
  ========================================================= */

  function updateForm<
    K extends keyof BiayaUmumFormState,
  >(
    field: K,
    value: BiayaUmumFormState[K],
  ): void {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /* =========================================================
     OPEN FORM
  ========================================================= */

  function openCreateForm(): void {
    setForm(createEmptyForm());
    setShowForm(true);
  }

  function closeForm(): void {
    if (saving) {
      return;
    }

    setShowForm(false);
    setForm(createEmptyForm());
  }

  /* =========================================================
     VALIDATION
  ========================================================= */

  function validateForm(): string | null {
    if (!form.tanggal) {
      return "Tanggal wajib diisi.";
    }

    if (!isBiayaUmumKategori(
      form.kategori,
    )) {
      return "Kategori biaya tidak valid.";
    }

    if (!form.keterangan.trim()) {
      return "Keterangan wajib diisi.";
    }

    if (form.keterangan.trim().length > 500) {
      return "Keterangan maksimal 500 karakter.";
    }

    const nilai =
      parseNumberInput(form.nilai);

    if (nilai <= 0) {
      return "Nilai biaya harus lebih besar dari 0.";
    }

    if (form.id_coa_kas === null) {
      return "Akun Kas/Bank wajib dipilih.";
    }

    const selectedCash =
      cashAccounts.find(
        (item) =>
          item.id_coa ===
          form.id_coa_kas,
      );

    if (!selectedCash) {
      return "Akun Kas/Bank yang dipilih tidak valid atau sudah tidak aktif.";
    }

    return null;
  }

  /* =========================================================
     SUBMIT
     
     PENTING:
     Tidak mengirim id_coa_beban dari UI.
     
     Server harus:
     kategori
        ↓
     coa_mapping
        ↓
     COA BEBAN
     
     UI hanya menentukan:
     - tanggal
     - kategori
     - keterangan
     - nilai
     - akun kas/bank
  ========================================================= */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const validationMessage =
      validateForm();

    if (validationMessage) {
      await Swal.fire({
        icon: "warning",
        title: "Data Belum Valid",
        text: validationMessage,
      });

      return;
    }

    const nilai =
      parseNumberInput(form.nilai);

    if (
      form.id_coa_kas === null
    ) {
      return;
    }

    const payload:
      CreateBiayaUmumPayload = {
      tanggal: form.tanggal,
      kategori: form.kategori,
      keterangan:
        form.keterangan.trim(),
      nilai,
      id_coa_kas:
        form.id_coa_kas,
    };

    try {
      setSaving(true);

      const response = await fetch(
        "/api/biayaUmum",
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
        await response.json();

      if (!response.ok) {
        const errorResult:
          ApiErrorResponse =
          isObject(result)
            ? {
                message:
                  typeof result.message ===
                  "string"
                    ? result.message
                    : undefined,
              }
            : {};

        throw new Error(
          errorResult.message ??
            "Gagal menyimpan biaya umum.",
        );
      }

      await Swal.fire({
        icon: "success",
        title: "Biaya Umum Berhasil Disimpan",
        html: `
          <div style="text-align:left">
            <div>
              <strong>Tanggal:</strong>
              ${form.tanggal}
            </div>
            <div>
              <strong>Kategori:</strong>
              ${getKategoriLabel(
                form.kategori,
              )}
            </div>
            <div>
              <strong>Nilai:</strong>
              ${formatRupiah(nilai)}
            </div>
            <div class="mt-2">
              <strong>COA Beban:</strong>
              ditentukan otomatis melalui
              <strong>coa_mapping</strong>
            </div>
          </div>
        `,
        confirmButtonText: "OK",
      });

      closeForm();

      await fetchBiayaUmum();
    } catch (error: unknown) {
      console.error(
        "SAVE BIAYA UMUM ERROR:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Gagal menyimpan biaya umum.";

      await Swal.fire({
        icon: "error",
        title: "Gagal Menyimpan",
        text: message,
      });
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     SELECTED CASH
  ========================================================= */

  const selectedCash =
    useMemo<CoaApiRow | null>(() => {
      if (
        form.id_coa_kas === null
      ) {
        return null;
      }

      return (
        cashAccounts.find(
          (item) =>
            item.id_coa ===
            form.id_coa_kas,
        ) ?? null
      );
    }, [
      cashAccounts,
      form.id_coa_kas,
    ]);

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="mx-auto max-w-[1600px]">
      <Card title="Biaya Adm & Umum">
        <div className="space-y-5">

          {/* =================================================
              HEADER
          ================================================= */}

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-semibold">
                Biaya Adm & Umum
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Input biaya umum menggunakan
                kategori sebagai sumber mapping
                COA Beban. COA Beban tidak
                di-hardcode di sisi UI.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => {
                  void fetchBiayaUmum();
                  void fetchCoa();
                }}
                disabled={
                  loading ||
                  loadingCoa
                }
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${
                    loading || loadingCoa
                      ? "animate-spin"
                      : ""
                  }`}
                />

                Refresh
              </Button>

              <Button
                type="button"
                onClick={openCreateForm}
              >
                <Plus className="mr-2 h-4 w-4" />

                Tambah Biaya
              </Button>
            </div>
          </div>

          {/* =================================================
              SUMMARY
          ================================================= */}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">

            <div className="rounded-lg border bg-white p-4">
              <div className="text-xs text-gray-500">
                Jumlah Transaksi
              </div>

              <div className="mt-1 text-xl font-semibold">
                {summary.jumlah}
              </div>
            </div>

            <div className="rounded-lg border bg-white p-4">
              <div className="text-xs text-gray-500">
                Total Biaya
              </div>

              <div className="mt-1 text-xl font-semibold">
                {formatRupiah(
                  summary.total,
                )}
              </div>
            </div>

            <div className="rounded-lg border bg-green-50 p-4">
              <div className="text-xs text-green-700">
                Sudah Mapping
              </div>

              <div className="mt-1 text-xl font-semibold text-green-700">
                {summary.mapped}
              </div>
            </div>

            <div className="rounded-lg border bg-yellow-50 p-4">
              <div className="text-xs text-yellow-700">
                Belum Mapping
              </div>

              <div className="mt-1 text-xl font-semibold text-yellow-700">
                {summary.belumMapping}
              </div>
            </div>

          </div>

          {/* =================================================
              FILTER
          ================================================= */}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(
                    event.target.value,
                  );
                }}
                placeholder="Cari tanggal, kategori, keterangan..."
                className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm"
              />
            </div>

            <select
              value={filterKategori}
              onChange={(event) => {
                const value =
                  event.target.value;

                if (
                  value === "ALL"
                ) {
                  setFilterKategori(
                    "ALL",
                  );

                  return;
                }

                if (
                  isBiayaUmumKategori(
                    value,
                  )
                ) {
                  setFilterKategori(
                    value,
                  );
                }
              }}
              className="rounded-lg border bg-white px-3 py-2 text-sm"
            >
              <option value="ALL">
                Semua Kategori
              </option>

              {KATEGORI_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>

            <select
              value={filterStatus}
              onChange={(event) => {
                const value =
                  event.target.value;

                if (
                  value === "ALL" ||
                  value ===
                    "BELUM_MAPPING" ||
                  value ===
                    "SUDAH_MAPPING" ||
                  value ===
                    "DIBATALKAN"
                ) {
                  setFilterStatus(
                    value,
                  );
                }
              }}
              className="rounded-lg border bg-white px-3 py-2 text-sm"
            >
              <option value="ALL">
                Semua Status
              </option>

              <option value="SUDAH_MAPPING">
                SUDAH MAPPING
              </option>

              <option value="BELUM_MAPPING">
                BELUM MAPPING
              </option>

              <option value="DIBATALKAN">
                DIBATALKAN
              </option>
            </select>

          </div>

          {/* =================================================
              TABLE
          ================================================= */}

          <div className="overflow-x-auto rounded-lg border">

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />

                Memuat data biaya umum...
              </div>
            ) : (
              <table className="w-full min-w-[1200px] text-sm">

                <thead>
                  <tr className="border-b bg-gray-100">

                    <th className="border-r px-3 py-3 text-left">
                      ID
                    </th>

                    <th className="border-r px-3 py-3 text-left">
                      Tanggal
                    </th>

                    <th className="border-r px-3 py-3 text-left">
                      Kategori
                    </th>

                    <th className="border-r px-3 py-3 text-left">
                      Keterangan
                    </th>

                    <th className="border-r px-3 py-3 text-right">
                      Nilai
                    </th>

                    <th className="border-r px-3 py-3 text-left">
                      COA Beban
                    </th>

                    <th className="px-3 py-3 text-center">
                      Status
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {filteredData.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-10 text-center text-gray-500"
                      >
                        Tidak ada data
                        biaya umum.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map(
                      (item) => {
                        const expenseCoa =
                          item.id_coa !==
                          null
                            ? coa.find(
                                (
                                  coaItem,
                                ) =>
                                  coaItem.id_coa ===
                                  item.id_coa,
                              )
                            : undefined;

                        return (
                          <tr
                            key={item.id}
                            className="border-b hover:bg-gray-50"
                          >
                            <td className="border-r px-3 py-2 font-mono">
                              {item.id}
                            </td>

                            <td className="border-r px-3 py-2">
                              {item.tanggal}
                            </td>

                            <td className="border-r px-3 py-2">
                              <div className="font-medium">
                                {getKategoriLabel(
                                  item.kategori,
                                )}
                              </div>

                              <div className="font-mono text-xs text-gray-500">
                                {
                                  item.kategori
                                }
                              </div>
                            </td>

                            <td className="border-r px-3 py-2">
                              {item.keterangan}
                            </td>

                            <td className="border-r px-3 py-2 text-right font-medium">
                              {formatRupiah(
                                item.nilai,
                              )}
                            </td>

                            <td className="border-r px-3 py-2">
                              {expenseCoa ? (
                                <div>
                                  <div className="font-mono text-xs">
                                    {
                                      expenseCoa.kode
                                    }
                                  </div>

                                  <div className="text-xs text-gray-600">
                                    {
                                      expenseCoa.nama
                                    }
                                  </div>
                                </div>
                              ) : item.id_coa !==
                                null ? (
                                <div className="font-mono text-xs">
                                  ID COA{" "}
                                  {
                                    item.id_coa
                                  }
                                </div>
                              ) : (
                                <span className="text-gray-400">
                                  Belum
                                  ditentukan
                                </span>
                              )}
                            </td>

                            <td className="px-3 py-2 text-center">
                              <span
                                className={`inline-flex rounded border px-2 py-1 text-xs font-medium ${getStatusClass(
                                  item.status_mapping,
                                )}`}
                              >
                                {
                                  item.status_mapping
                                }
                              </span>
                            </td>
                          </tr>
                        );
                      },
                    )
                  )}

                </tbody>
              </table>
            )}

          </div>

          <div className="text-xs text-gray-500">
            Menampilkan{" "}
            {filteredData.length} dari{" "}
            {data.length} transaksi.
          </div>

        </div>
      </Card>

      {/* =====================================================
          FORM MODAL
      ===================================================== */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b px-5 py-4">

              <div>
                <h2 className="text-lg font-semibold">
                  Input Biaya Adm & Umum
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  COA Beban ditentukan
                  berdasarkan
                  <strong>
                    {" "}
                    coa_mapping
                  </strong>
                  , bukan berdasarkan
                  pilihan manual.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                title="Tutup"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            {/* FORM */}

            <form
              onSubmit={(event) => {
                void handleSubmit(
                  event,
                );
              }}
              className="space-y-5 p-5"
            >

              {/* =================================================
                  TANGGAL
              ================================================= */}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Tanggal
                </label>

                <input
                  type="date"
                  value={form.tanggal}
                  onChange={(event) => {
                    updateForm(
                      "tanggal",
                      event.target.value,
                    );
                  }}
                  disabled={saving}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>

              {/* =================================================
                  KATEGORI
              ================================================= */}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Kategori Biaya
                </label>

                <select
                  value={form.kategori}
                  onChange={(event) => {
                    const value =
                      event.target.value;

                    if (
                      isBiayaUmumKategori(
                        value,
                      )
                    ) {
                      updateForm(
                        "kategori",
                        value,
                      );
                    }
                  }}
                  disabled={saving}
                  className="w-full rounded-lg border bg-white px-3 py-2"
                >
                  {KATEGORI_OPTIONS.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ),
                  )}
                </select>

                <p className="mt-1 text-xs text-gray-500">
                  Kategori ini menjadi
                  parameter pencarian
                  COA Beban melalui
                  <strong>
                    {" "}
                    coa_mapping
                  </strong>
                  .
                </p>
              </div>

              {/* =================================================
                  KETERANGAN
              ================================================= */}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Keterangan
                </label>

                <textarea
                  value={form.keterangan}
                  onChange={(event) => {
                    updateForm(
                      "keterangan",
                      event.target.value,
                    );
                  }}
                  disabled={saving}
                  rows={3}
                  maxLength={500}
                  placeholder="Contoh: Pembayaran listrik kantor PT. HMS periode September 2026"
                  className="w-full rounded-lg border px-3 py-2"
                />

                <div className="mt-1 text-right text-xs text-gray-500">
                  {
                    form.keterangan
                      .length
                  }{" "}
                  / 500
                </div>
              </div>

              {/* =================================================
                  NILAI
              ================================================= */}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Nilai Biaya
                </label>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    Rp
                  </span>

                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatNumberInput(
                      form.nilai,
                    )}
                    onChange={(event) => {
                      const numeric =
                        event.target.value.replace(
                          /\D/g,
                          "",
                        );

                      updateForm(
                        "nilai",
                        numeric,
                      );
                    }}
                    disabled={saving}
                    placeholder="0"
                    className="w-full rounded-lg border py-2 pl-10 pr-3 text-right font-mono"
                  />
                </div>

                <p className="mt-1 text-xs text-gray-500">
                  Nilai harus lebih besar
                  dari Rp0.
                </p>
              </div>

              {/* =================================================
                  AKUN KAS / BANK
              ================================================= */}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Akun Kas / Bank
                </label>

                {loadingCoa ? (
                  <div className="flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />

                    Memuat akun kas/bank...
                  </div>
                ) : (
                  <select
                    value={
                      form.id_coa_kas ===
                      null
                        ? ""
                        : String(
                            form.id_coa_kas,
                          )
                    }
                    onChange={(event) => {
                      const value =
                        event.target.value;

                      updateForm(
                        "id_coa_kas",
                        value === ""
                          ? null
                          : Number(value),
                      );
                    }}
                    disabled={
                      saving ||
                      cashAccounts.length ===
                        0
                    }
                    className="w-full rounded-lg border bg-white px-3 py-2"
                  >
                    <option value="">
                      Pilih Kas / Bank
                    </option>

                    {cashAccounts.map(
                      (item) => (
                        <option
                          key={
                            item.id_coa
                          }
                          value={
                            item.id_coa
                          }
                        >
                          {item.kode} -{" "}
                          {item.nama}
                        </option>
                      ),
                    )}
                  </select>
                )}

                {cashAccounts.length ===
                  0 &&
                  !loadingCoa && (
                    <p className="mt-1 text-xs text-red-600">
                      Tidak ada COA Kas/Bank
                      aktif dengan
                      is_cash = true.
                    </p>
                  )}

                {selectedCash && (
                  <div className="mt-2 rounded-lg border bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">
                      Akun yang dipilih
                    </div>

                    <div className="font-mono text-sm font-semibold">
                      {
                        selectedCash.kode
                      }
                    </div>

                    <div className="text-sm text-gray-700">
                      {
                        selectedCash.nama
                      }
                    </div>

                    <div className="mt-1 text-xs text-green-600">
                      COA aktif · ASET ·
                      Cash Account
                    </div>
                  </div>
                )}
              </div>

              {/* =================================================
                  MAPPING INFO
              ================================================= */}

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">

                <div className="font-semibold text-blue-800">
                  Mekanisme COA Mapping
                </div>

                <div className="mt-2 space-y-1 text-sm text-blue-800">

                  <div>
                    Kategori:
                    <strong>
                      {" "}
                      {getKategoriLabel(
                        form.kategori,
                      )}
                    </strong>
                  </div>

                  <div>
                    → Sistem mencari
                    mapping kategori
                    melalui
                    <strong>
                      {" "}
                      coa_mapping
                    </strong>
                  </div>

                  <div>
                    → Sistem mengambil
                    COA Beban yang
                    aktif
                  </div>

                  <div>
                    → Debit:
                    <strong>
                      {" "}
                      COA Beban hasil
                      mapping
                    </strong>
                  </div>

                  <div>
                    → Kredit:
                    <strong>
                      {" "}
                      {selectedCash
                        ? `${selectedCash.kode} - ${selectedCash.nama}`
                        : "Kas / Bank belum dipilih"}
                    </strong>
                  </div>

                </div>

              </div>

              {/* =================================================
                  JOURNAL PREVIEW
              ================================================= */}

              <div className="rounded-lg border bg-gray-50 p-4">

                <div className="mb-3 text-sm font-semibold">
                  Preview Jurnal
                </div>

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[600px] text-sm">

                    <thead>
                      <tr className="border-b">
                        <th className="px-3 py-2 text-left">
                          Posisi
                        </th>

                        <th className="px-3 py-2 text-left">
                          COA
                        </th>

                        <th className="px-3 py-2 text-right">
                          Nilai
                        </th>
                      </tr>
                    </thead>

                    <tbody>

                      <tr className="border-b">
                        <td className="px-3 py-2 font-medium">
                          DEBIT
                        </td>

                        <td className="px-3 py-2">
                          <div className="font-medium">
                            COA Beban
                          </div>

                          <div className="text-xs text-gray-500">
                            Ditentukan oleh
                            coa_mapping
                          </div>
                        </td>

                        <td className="px-3 py-2 text-right font-mono">
                          {formatRupiah(
                            parseNumberInput(
                              form.nilai,
                            ),
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="px-3 py-2 font-medium">
                          KREDIT
                        </td>

                        <td className="px-3 py-2">
                          {selectedCash ? (
                            <div>
                              <div className="font-mono">
                                {
                                  selectedCash.kode
                                }
                              </div>

                              <div className="text-xs text-gray-600">
                                {
                                  selectedCash.nama
                                }
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">
                              Kas / Bank
                              belum
                              dipilih
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-2 text-right font-mono">
                          {formatRupiah(
                            parseNumberInput(
                              form.nilai,
                            ),
                          )}
                        </td>
                      </tr>

                    </tbody>

                  </table>

                </div>

              </div>

              {/* =================================================
                  WARNING
              ================================================= */}

              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">

                <div className="font-semibold">
                  Validasi sebelum posting
                </div>

                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    COA Beban tidak
                    dipilih manual.
                  </li>

                  <li>
                    COA Beban harus
                    berasal dari
                    coa_mapping.
                  </li>

                  <li>
                    Akun Kas/Bank harus
                    aktif dan
                    is_cash = true.
                  </li>

                  <li>
                    Jurnal harus balance:
                    Debit = Kredit.
                  </li>

                  <li>
                    Jika mapping tidak
                    ditemukan, transaksi
                    harus ditolak dan
                    tidak boleh posting.
                  </li>
                </ul>

              </div>

              {/* =================================================
                  BUTTON
              ================================================= */}

              <div className="flex justify-end gap-2 border-t pt-4">

                <Button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Batal
                </Button>

                <Button
                  type="submit"
                  disabled={
                    saving ||
                    loadingCoa ||
                    cashAccounts.length ===
                      0
                  }
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />

                      Simpan & Posting
                    </>
                  )}
                </Button>

              </div>

            </form>

          </div>

        </div>
      )}
    </div>
  );
}