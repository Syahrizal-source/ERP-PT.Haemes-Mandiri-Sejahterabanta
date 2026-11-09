"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, RefreshCw, Search, X } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

/**
 * ============================================================
 * TYPE
 * ============================================================
 */

type BiayaUmumKategori = "ATK" | "LISTRIK" | "PAM" | "TELPON" | "BUNGA_BANK";

type CoaTipe = "ASET" | "LIABILITAS" | "EKUITAS" | "PENDAPATAN" | "BEBAN";

type StatusMapping = "BELUM_MAPPING" | "SUDAH_MAPPING" | "DIBATALKAN";

interface CoaItem {
  id_coa: number;
  kode: string;
  nama: string;
  tipe: CoaTipe;
  parent_id: number | null;
  aktif: boolean;
  is_cash: boolean;
  parent_kode: string | null;
  parent_nama: string | null;
}

interface BiayaUmumItem {
  id: number;
  tanggal: string;
  kategori: string;
  keterangan: string;
  nilai: number;
  id_coa: number | null;
  status_mapping: StatusMapping;
  sumber: string;
  created_at: string;
}

interface BiayaUmumFormState {
  tanggal: string;
  no_bukti: string;
  kategori: BiayaUmumKategori;
  keterangan: string;
  nilai: string;
  id_coa_beban: number | null;
  id_coa_kas: number | null;
}

interface ApiErrorResponse {
  error?: string;
  message?: string;
  detail?: unknown;
}

interface BiayaUmumResponse {
  message?: string;
  data?: {
    id?: number;
    tanggal?: string;
    no_bukti?: string;
    kategori?: string;
    keterangan?: string;
    nilai?: number;
    id_coa_beban?: number;
    kode_coa_beban?: string;
    nama_coa_beban?: string;
    id_coa_kas?: number;
    kode_coa_kas?: string;
    nama_coa_kas?: string;
    status_mapping?: StatusMapping;
    id_jurnal?: number;
    catatan?: string;
  };
}

/**
 * ============================================================
 * FILTER
 * ============================================================
 */

type FilterKategori = "ALL" | BiayaUmumKategori;

type FilterStatus = "ALL" | StatusMapping;

/**
 * ============================================================
 * EMPTY FORM
 * ============================================================
 */

const EMPTY_FORM: BiayaUmumFormState = {
  tanggal: new Date().toISOString().slice(0, 10),
  no_bukti: "",
  kategori: "ATK",
  keterangan: "",
  nilai: "",
  id_coa_beban: null,
  id_coa_kas: null,
};

/**
 * ============================================================
 * KATEGORI
 * ============================================================
 */

const KATEGORI_OPTIONS: Array<{
  value: BiayaUmumKategori;
  label: string;
}> = [
  {
    value: "ATK",
    label: "Biaya ATK",
  },
  {
    value: "LISTRIK",
    label: "Biaya Listrik",
  },
  {
    value: "PAM",
    label: "Biaya PAM",
  },
  {
    value: "TELPON",
    label: "Biaya Telpon",
  },
  {
    value: "BUNGA_BANK",
    label: "Biaya Bunga Bank",
  },
];

/**
 * ============================================================
 * TYPE GUARDS
 * ============================================================
 */

function isRecord(value: unknown): value is Record<string, unknown> {
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

function isStatusMapping(value: unknown): value is StatusMapping {
  return (
    value === "BELUM_MAPPING" ||
    value === "SUDAH_MAPPING" ||
    value === "DIBATALKAN"
  );
}

function isBiayaUmumKategori(value: unknown): value is BiayaUmumKategori {
  return (
    value === "ATK" ||
    value === "LISTRIK" ||
    value === "PAM" ||
    value === "TELPON" ||
    value === "BUNGA_BANK"
  );
}

function isCoaItem(value: unknown): value is CoaItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id_coa === "number" &&
    typeof value.kode === "string" &&
    typeof value.nama === "string" &&
    isCoaTipe(value.tipe) &&
    (value.parent_id === null || typeof value.parent_id === "number") &&
    typeof value.aktif === "boolean" &&
    typeof value.is_cash === "boolean" &&
    (value.parent_kode === null || typeof value.parent_kode === "string") &&
    (value.parent_nama === null || typeof value.parent_nama === "string")
  );
}

function isBiayaUmumItem(value: unknown): value is BiayaUmumItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "number" &&
    typeof value.tanggal === "string" &&
    typeof value.kategori === "string" &&
    typeof value.keterangan === "string" &&
    typeof value.nilai === "number" &&
    (value.id_coa === null || typeof value.id_coa === "number") &&
    isStatusMapping(value.status_mapping) &&
    typeof value.sumber === "string" &&
    typeof value.created_at === "string"
  );
}

/**
 * ============================================================
 * FORMAT RUPIAH
 * ============================================================
 */

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * ============================================================
 * FORMAT TANGGAL
 * ============================================================
 */

function formatTanggal(value: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * ============================================================
 * LABEL KATEGORI
 * ============================================================
 */

function getKategoriLabel(kategori: string): string {
  const item = KATEGORI_OPTIONS.find((option) => option.value === kategori);

  return item?.label ?? kategori;
}

/**
 * ============================================================
 * STATUS STYLE
 * ============================================================
 */

function getStatusClass(status: StatusMapping): string {
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

/**
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function BiayaUmumPage(): React.JSX.Element {
  const [data, setData] = useState<BiayaUmumItem[]>([]);

  const [coaData, setCoaData] = useState<CoaItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  const [loadingCoa, setLoadingCoa] = useState<boolean>(true);

  const [saving, setSaving] = useState<boolean>(false);

  const [search, setSearch] = useState<string>("");

  const [filterKategori, setFilterKategori] = useState<FilterKategori>("ALL");

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");

  const [showForm, setShowForm] = useState<boolean>(false);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState<BiayaUmumFormState>(EMPTY_FORM);

  /**
   * ==========================================================
   * FETCH BIAYA UMUM
   * ==========================================================
   */

  const fetchBiayaUmum = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);

      const response = await fetch("/api/biayaUmum", {
        method: "GET",
        cache: "no-store",
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        const errorResult: ApiErrorResponse = isRecord(result)
          ? {
              error:
                typeof result.error === "string" ? result.error : undefined,
              message:
                typeof result.message === "string" ? result.message : undefined,
            }
          : {};

        throw new Error(
          errorResult.error ??
            errorResult.message ??
            "Gagal mengambil data biaya umum.",
        );
      }

      if (!Array.isArray(result)) {
        throw new Error("Format response API biaya umum tidak valid.");
      }

      const rows: BiayaUmumItem[] = result.filter(
        (item): item is BiayaUmumItem => isBiayaUmumItem(item),
      );

      setData(rows);
    } catch (error: unknown) {
      console.error("FETCH BIAYA UMUM ERROR:", error);

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
  }, []);

  /**
   * ==========================================================
   * FETCH COA
   * ==========================================================
   *
   * Tidak langsung ke Supabase.
   *
   * Menggunakan /api/coa yang sudah ada.
   *
   * Tidak membuat mapping COA sendiri.
   */

  const fetchCoa = useCallback(async (): Promise<void> => {
    try {
      setLoadingCoa(true);

      const response = await fetch("/api/coa", {
        method: "GET",
        cache: "no-store",
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        const errorResult: ApiErrorResponse = isRecord(result)
          ? {
              error:
                typeof result.error === "string" ? result.error : undefined,
              message:
                typeof result.message === "string" ? result.message : undefined,
            }
          : {};

        throw new Error(
          errorResult.error ??
            errorResult.message ??
            "Gagal mengambil data COA.",
        );
      }

      if (!Array.isArray(result)) {
        throw new Error("Format response API COA tidak valid.");
      }

      const rows: CoaItem[] = result.filter((item): item is CoaItem =>
        isCoaItem(item),
      );

      setCoaData(rows);
    } catch (error: unknown) {
      console.error("FETCH COA ERROR:", error);

      const message =
        error instanceof Error ? error.message : "Gagal mengambil data COA.";

      await Swal.fire({
        icon: "error",
        title: "Gagal Memuat COA",
        text: message,
      });
    } finally {
      setLoadingCoa(false);
    }
  }, []);

  /**
   * ==========================================================
   * INITIAL LOAD
   * ==========================================================
   */

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchBiayaUmum();
    void fetchCoa();
  }, [fetchBiayaUmum, fetchCoa]);

  /**
   * ==========================================================
   * COA BEBAN
   * ==========================================================
   *
   * Hanya COA:
   * - aktif
   * - tipe BEBAN
   *
   * Tidak hardcode ID.
   */

  const coaBebanOptions = useMemo<CoaItem[]>(
    () =>
      coaData
        .filter((item) => item.aktif && item.tipe === "BEBAN")
        .sort((a, b) => a.kode.localeCompare(b.kode)),
    [coaData],
  );

  /**
   * ==========================================================
   * COA KAS / BANK
   * ==========================================================
   *
   * Hanya COA:
   * - aktif
   * - is_cash = true
   *
   * API backend tetap melakukan validasi final:
   * - bukan header
   * - tipe ASET
   */

  const coaKasOptions = useMemo<CoaItem[]>(
    () =>
      coaData
        .filter((item) => item.aktif && item.is_cash)
        .sort((a, b) => a.kode.localeCompare(b.kode)),
    [coaData],
  );

  /**
   * ==========================================================
   * FILTER DATA
   * ==========================================================
   */

  const filteredData = useMemo<BiayaUmumItem[]>(() => {
    const keyword = search.trim().toLowerCase();

    return data.filter((item) => {
      const matchesSearch =
        keyword.length === 0 ||
        String(item.id).includes(keyword) ||
        item.tanggal.toLowerCase().includes(keyword) ||
        item.kategori.toLowerCase().includes(keyword) ||
        item.keterangan.toLowerCase().includes(keyword) ||
        String(item.id_coa ?? "").includes(keyword);

      const matchesKategori =
        filterKategori === "ALL" || item.kategori === filterKategori;

      const matchesStatus =
        filterStatus === "ALL" || item.status_mapping === filterStatus;

      return matchesSearch && matchesKategori && matchesStatus;
    });
  }, [data, search, filterKategori, filterStatus]);

  /**
   * ==========================================================
   * SUMMARY
   * ==========================================================
   */

  const totalNilai = useMemo<number>(
    () => data.reduce((total, item) => total + item.nilai, 0),
    [data],
  );

  const mappedCount = useMemo<number>(
    () => data.filter((item) => item.status_mapping === "SUDAH_MAPPING").length,
    [data],
  );

  const belumMappingCount = useMemo<number>(
    () => data.filter((item) => item.status_mapping === "BELUM_MAPPING").length,
    [data],
  );

  const dibatalkanCount = useMemo<number>(
    () => data.filter((item) => item.status_mapping === "DIBATALKAN").length,
    [data],
  );

  /**
   * ==========================================================
   * UPDATE FORM
   * ==========================================================
   */

  function updateForm<K extends keyof BiayaUmumFormState>(
    field: K,
    value: BiayaUmumFormState[K],
  ): void {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /**
   * ==========================================================
   * OPEN CREATE
   * ==========================================================
   */

  function openCreateForm(): void {
    setEditingId(null);

    setForm({
      ...EMPTY_FORM,
      tanggal: new Date().toISOString().slice(0, 10),
    });

    setShowForm(true);
  }

  /**
   * ==========================================================
   * OPEN EDIT
   * ==========================================================
   */

  function openEditForm(item: BiayaUmumItem): void {
    setEditingId(item.id);

    setForm({
      tanggal: item.tanggal,
      no_bukti: "",
      kategori: isBiayaUmumKategori(item.kategori) ? item.kategori : "ATK",
      keterangan: item.keterangan,
      nilai: String(item.nilai),
      id_coa_beban: item.id_coa,
      id_coa_kas: null,
    });

    setShowForm(true);
  }

  /**
   * ==========================================================
   * CLOSE FORM
   * ==========================================================
   */

  function closeForm(): void {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
    });
  }

  /**
   * ==========================================================
   * VALIDATE FORM
   * ==========================================================
   */

  function validateForm(): string | null {
    if (form.tanggal.trim().length === 0) {
      return "Tanggal wajib diisi.";
    }

    if (form.no_bukti.trim().length === 0) {
      return "Nomor bukti wajib diisi.";
    }

    if (form.keterangan.trim().length === 0) {
      return "Keterangan wajib diisi.";
    }

    const nominal = Number(form.nilai);

    if (!Number.isFinite(nominal) || nominal <= 0) {
      return "Nilai biaya harus lebih besar dari 0.";
    }

    if (form.id_coa_beban === null) {
      return "COA beban wajib dipilih.";
    }

    if (form.id_coa_kas === null) {
      return "COA kas/bank wajib dipilih.";
    }

    if (form.id_coa_beban === form.id_coa_kas) {
      return "COA beban dan COA kas/bank tidak boleh sama.";
    }

    const coaBeban = coaBebanOptions.find(
      (item) => item.id_coa === form.id_coa_beban,
    );

    if (!coaBeban) {
      return "COA beban yang dipilih tidak tersedia atau tidak aktif.";
    }

    const coaKas = coaKasOptions.find(
      (item) => item.id_coa === form.id_coa_kas,
    );

    if (!coaKas) {
      return "COA kas/bank yang dipilih tidak tersedia atau tidak aktif.";
    }

    return null;
  }

  /**
   * ==========================================================
   * SUBMIT
   * ==========================================================
   */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const validationMessage = validateForm();

    if (validationMessage) {
      await Swal.fire({
        icon: "warning",
        title: "Data Belum Valid",
        text: validationMessage,
      });

      return;
    }

    if (form.id_coa_beban === null || form.id_coa_kas === null) {
      return;
    }

    const nominal = Number(form.nilai);

    try {
      setSaving(true);

      const payload =
        editingId === null
          ? {
              tanggal: form.tanggal,
              no_bukti: form.no_bukti.trim(),
              kategori: form.kategori,
              keterangan: form.keterangan.trim(),
              nilai: nominal,
              id_coa_beban: form.id_coa_beban,
              id_coa_kas: form.id_coa_kas,
            }
          : {
              id: editingId,
              tanggal: form.tanggal,
              no_bukti: form.no_bukti.trim(),
              kategori: form.kategori,
              keterangan: form.keterangan.trim(),
              nilai: nominal,
              id_coa_beban: form.id_coa_beban,
              id_coa_kas: form.id_coa_kas,
            };

      const response = await fetch("/api/biayaUmum", {
        method: editingId === null ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        const errorResult: ApiErrorResponse = isRecord(result)
          ? {
              error:
                typeof result.error === "string" ? result.error : undefined,
              message:
                typeof result.message === "string" ? result.message : undefined,
              detail: result.detail,
            }
          : {};

        throw new Error(
          errorResult.error ??
            errorResult.message ??
            "Gagal menyimpan biaya umum.",
        );
      }

      const responseData: BiayaUmumResponse = isRecord(result)
        ? {
            message:
              typeof result.message === "string" ? result.message : undefined,
            data: isRecord(result.data)
              ? {
                  id:
                    typeof result.data.id === "number"
                      ? result.data.id
                      : undefined,
                  id_jurnal:
                    typeof result.data.id_jurnal === "number"
                      ? result.data.id_jurnal
                      : undefined,
                  status_mapping: isStatusMapping(result.data.status_mapping)
                    ? result.data.status_mapping
                    : undefined,
                  catatan:
                    typeof result.data.catatan === "string"
                      ? result.data.catatan
                      : undefined,
                }
              : undefined,
          }
        : {};

      if (editingId === null) {
        await Swal.fire({
          icon: "success",
          title: "Biaya Umum Berhasil Disimpan",
          html: `
            <div style="text-align:left">
              <div>
                <strong>Nomor Bukti:</strong>
                ${form.no_bukti.trim()}
              </div>
              <div>
                <strong>Kategori:</strong>
                ${getKategoriLabel(form.kategori)}
              </div>
              <div>
                <strong>Nilai:</strong>
                ${formatRupiah(nominal)}
              </div>
              ${
                responseData.data?.id_jurnal !== undefined
                  ? `
                    <div>
                      <strong>ID Jurnal:</strong>
                      ${responseData.data.id_jurnal}
                    </div>
                  `
                  : ""
              }
            </div>
          `,
          confirmButtonText: "OK",
        });
      } else {
        await Swal.fire({
          icon: "success",
          title: "Biaya Umum Berhasil Diperbarui",
          text:
            responseData.data?.catatan ?? "Data staging berhasil diperbarui.",
          timer: 1800,
          showConfirmButton: false,
        });
      }

      closeForm();

      await fetchBiayaUmum();
    } catch (error: unknown) {
      console.error("SAVE BIAYA UMUM ERROR:", error);

      const message =
        error instanceof Error ? error.message : "Gagal menyimpan biaya umum.";

      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: message,
      });
    } finally {
      setSaving(false);
    }
  }

  /**
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <Card title="Biaya Administrasi & Umum">
        <div className="space-y-4">
          {/* ==================================================
              HEADER
          ================================================== */}

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Biaya Umum
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Transaksi biaya umum menggunakan COA beban dan COA kas/bank yang
                berasal dari master COA.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => {
                  void fetchBiayaUmum();
                  void fetchCoa();
                }}
                disabled={loading || loadingCoa}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${
                    loading || loadingCoa ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </Button>

              <Button
                type="button"
                onClick={openCreateForm}
                disabled={loadingCoa}
              >
                <Plus className="mr-2 h-4 w-4" />
                Tambah Biaya Umum
              </Button>
            </div>
          </div>

          {/* ==================================================
              INFO MAPPING
          ================================================== */}

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            <div className="font-semibold">Sumber COA</div>

            <p className="mt-1">
              COA beban dan COA kas/bank diambil dari
              <strong> /api/coa</strong>.
            </p>

            <p className="mt-1">
              Sistem tidak melakukan hardcode ID COA dan tidak menggunakan
              mapping
              <strong> ACCOUNTING/ATK</strong>,
              <strong> ACCOUNTING/LISTRIK</strong>, atau mapping lain yang belum
              tersedia di database.
            </p>
          </div>

          {/* ==================================================
              SUMMARY
          ================================================== */}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-lg border bg-white p-4">
              <div className="text-xs text-gray-500">Total Transaksi</div>

              <div className="mt-1 text-2xl font-semibold">{data.length}</div>
            </div>

            <div className="rounded-lg border bg-white p-4">
              <div className="text-xs text-gray-500">Total Nilai</div>

              <div className="mt-1 text-xl font-semibold">
                {formatRupiah(totalNilai)}
              </div>
            </div>

            <div className="rounded-lg border bg-white p-4">
              <div className="text-xs text-gray-500">Sudah Mapping</div>

              <div className="mt-1 text-2xl font-semibold text-green-600">
                {mappedCount}
              </div>
            </div>

            <div className="rounded-lg border bg-white p-4">
              <div className="text-xs text-gray-500">Belum Mapping</div>

              <div className="mt-1 text-2xl font-semibold text-yellow-600">
                {belumMappingCount}
              </div>
            </div>

            <div className="rounded-lg border bg-white p-4">
              <div className="text-xs text-gray-500">Dibatalkan</div>

              <div className="mt-1 text-2xl font-semibold text-red-600">
                {dibatalkanCount}
              </div>
            </div>
          </div>

          {/* ==================================================
              FILTER
          ================================================== */}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
                placeholder="Cari tanggal, kategori, keterangan, ID COA..."
                className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filterKategori}
              onChange={(event) => {
                const value = event.target.value;

                if (value === "ALL") {
                  setFilterKategori("ALL");

                  return;
                }

                if (isBiayaUmumKategori(value)) {
                  setFilterKategori(value);
                }
              }}
              className="rounded-lg border bg-white px-3 py-2 text-sm"
            >
              <option value="ALL">Semua Kategori</option>

              {KATEGORI_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(event) => {
                const value = event.target.value;

                if (
                  value === "ALL" ||
                  value === "BELUM_MAPPING" ||
                  value === "SUDAH_MAPPING" ||
                  value === "DIBATALKAN"
                ) {
                  setFilterStatus(value);
                }
              }}
              className="rounded-lg border bg-white px-3 py-2 text-sm"
            >
              <option value="ALL">Semua Status</option>

              <option value="BELUM_MAPPING">BELUM MAPPING</option>

              <option value="SUDAH_MAPPING">SUDAH MAPPING</option>

              <option value="DIBATALKAN">DIBATALKAN</option>
            </select>
          </div>

          {/* ==================================================
              TABLE
          ================================================== */}

          <div className="overflow-auto rounded-lg border">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Memuat data biaya umum...
              </div>
            ) : (
              <table className="w-full min-w-[1250px] text-sm">
                <thead>
                  <tr className="border-b bg-gray-100">
                    <th className="border-r px-3 py-3 text-left">ID</th>

                    <th className="border-r px-3 py-3 text-left">Tanggal</th>

                    <th className="border-r px-3 py-3 text-left">Kategori</th>

                    <th className="border-r px-3 py-3 text-left">Keterangan</th>

                    <th className="border-r px-3 py-3 text-right">Nilai</th>

                    <th className="border-r px-3 py-3 text-left">COA Beban</th>

                    <th className="border-r px-3 py-3 text-center">Status</th>

                    <th className="px-3 py-3 text-center">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-10 text-center text-gray-500"
                      >
                        Tidak ada transaksi biaya umum yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item) => {
                      const coa = coaData.find(
                        (coaItem) => coaItem.id_coa === item.id_coa,
                      );

                      return (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="border-r px-3 py-2 font-mono font-semibold">
                            {item.id}
                          </td>

                          <td className="border-r px-3 py-2">
                            {formatTanggal(item.tanggal)}
                          </td>

                          <td className="border-r px-3 py-2">
                            <span className="font-medium">
                              {getKategoriLabel(item.kategori)}
                            </span>
                          </td>

                          <td className="border-r px-3 py-2">
                            {item.keterangan}
                          </td>

                          <td className="border-r px-3 py-2 text-right font-medium">
                            {formatRupiah(item.nilai)}
                          </td>

                          <td className="border-r px-3 py-2">
                            {item.id_coa !== null ? (
                              <div>
                                <div className="font-mono text-xs font-semibold">
                                  {coa?.kode ?? `ID ${item.id_coa}`}
                                </div>

                                <div className="text-xs text-gray-600">
                                  {coa?.nama ?? "COA tidak ditemukan"}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">
                                Belum Mapping
                              </span>
                            )}
                          </td>

                          <td className="border-r px-3 py-2 text-center">
                            <span
                              className={`inline-flex rounded border px-2 py-1 text-xs font-medium ${getStatusClass(
                                item.status_mapping,
                              )}`}
                            >
                              {item.status_mapping}
                            </span>
                          </td>

                          <td className="px-3 py-2">
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  openEditForm(item);
                                }}
                                disabled={saving}
                                className="rounded p-2 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                                title="Edit Biaya Umum"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="text-xs text-gray-500">
            Menampilkan {filteredData.length} dari {data.length} transaksi.
          </div>
        </div>
      </Card>

      {/* ======================================================
          MODAL FORM
      ====================================================== */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl">
            {/* ==================================================
                HEADER
            ================================================== */}

            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {editingId === null
                    ? "Tambah Biaya Umum"
                    : `Edit Biaya Umum #${editingId}`}
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  COA dipilih dari master COA aktif.
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

            {/* ==================================================
                FORM
            ================================================== */}

            <form
              onSubmit={(event) => {
                void handleSubmit(event);
              }}
              className="space-y-5 p-5"
            >
              {/* ==================================================
                  TANGGAL + NO BUKTI
              ================================================== */}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Tanggal
                  </label>

                  <input
                    type="date"
                    value={form.tanggal}
                    onChange={(event) => {
                      updateForm("tanggal", event.target.value);
                    }}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    No. Bukti
                  </label>

                  <input
                    type="text"
                    value={form.no_bukti}
                    onChange={(event) => {
                      updateForm("no_bukti", event.target.value);
                    }}
                    maxLength={100}
                    className="w-full rounded-lg border px-3 py-2 font-mono"
                    placeholder="Contoh: BU-0001"
                  />
                </div>
              </div>

              {/* ==================================================
                  KATEGORI
              ================================================== */}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Kategori Biaya
                </label>

                <select
                  value={form.kategori}
                  onChange={(event) => {
                    const value = event.target.value;

                    if (isBiayaUmumKategori(value)) {
                      updateForm("kategori", value);
                    }
                  }}
                  className="w-full rounded-lg border bg-white px-3 py-2"
                >
                  {KATEGORI_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* ==================================================
                  KETERANGAN
              ================================================== */}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Keterangan
                </label>

                <textarea
                  value={form.keterangan}
                  onChange={(event) => {
                    updateForm("keterangan", event.target.value);
                  }}
                  maxLength={500}
                  rows={3}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="Contoh: Pembayaran listrik kantor PT HMS"
                />
              </div>

              {/* ==================================================
                  NILAI
              ================================================== */}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Nilai Biaya
                </label>

                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={form.nilai}
                  onChange={(event) => {
                    updateForm("nilai", event.target.value);
                  }}
                  className="w-full rounded-lg border px-3 py-2 text-right"
                  placeholder="0"
                />

                <div className="mt-1 text-xs text-gray-500">
                  Preview:{" "}
                  {form.nilai ? formatRupiah(Number(form.nilai)) : "Rp0"}
                </div>
              </div>

              {/* ==================================================
                  COA BEBAN
              ================================================== */}

              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="mb-3">
                  <div className="font-semibold text-red-800">COA Beban</div>

                  <div className="text-xs text-red-700">
                    Hanya COA tipe BEBAN yang aktif.
                  </div>
                </div>

                <select
                  value={
                    form.id_coa_beban === null ? "" : String(form.id_coa_beban)
                  }
                  onChange={(event) => {
                    const value = event.target.value;

                    updateForm(
                      "id_coa_beban",
                      value === "" ? null : Number(value),
                    );
                  }}
                  disabled={loadingCoa || coaBebanOptions.length === 0}
                  className="w-full rounded-lg border bg-white px-3 py-2 font-mono text-sm disabled:bg-gray-100"
                >
                  <option value="">Pilih COA Beban</option>

                  {coaBebanOptions.map((coa) => (
                    <option key={coa.id_coa} value={coa.id_coa}>
                      {coa.id_coa} - {coa.kode} - {coa.nama}
                    </option>
                  ))}
                </select>

                {form.id_coa_beban !== null && (
                  <div className="mt-2 rounded border bg-white p-3 text-xs">
                    {(() => {
                      const coa = coaBebanOptions.find(
                        (item) => item.id_coa === form.id_coa_beban,
                      );

                      return coa ? (
                        <>
                          <div>
                            <strong>ID:</strong> {coa.id_coa}
                          </div>

                          <div>
                            <strong>Kode:</strong> {coa.kode}
                          </div>

                          <div>
                            <strong>Nama:</strong> {coa.nama}
                          </div>

                          <div>
                            <strong>Tipe:</strong> {coa.tipe}
                          </div>
                        </>
                      ) : (
                        <span className="text-red-600">
                          COA tidak ditemukan.
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* ==================================================
                  COA KAS / BANK
              ================================================== */}

              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="mb-3">
                  <div className="font-semibold text-green-800">
                    COA Kas / Bank
                  </div>

                  <div className="text-xs text-green-700">
                    Hanya COA aktif yang ditandai sebagai Cash Account.
                  </div>
                </div>

                <select
                  value={
                    form.id_coa_kas === null ? "" : String(form.id_coa_kas)
                  }
                  onChange={(event) => {
                    const value = event.target.value;

                    updateForm(
                      "id_coa_kas",
                      value === "" ? null : Number(value),
                    );
                  }}
                  disabled={loadingCoa || coaKasOptions.length === 0}
                  className="w-full rounded-lg border bg-white px-3 py-2 font-mono text-sm disabled:bg-gray-100"
                >
                  <option value="">Pilih COA Kas / Bank</option>

                  {coaKasOptions.map((coa) => (
                    <option key={coa.id_coa} value={coa.id_coa}>
                      {coa.id_coa} - {coa.kode} - {coa.nama}
                    </option>
                  ))}
                </select>

                {form.id_coa_kas !== null && (
                  <div className="mt-2 rounded border bg-white p-3 text-xs">
                    {(() => {
                      const coa = coaKasOptions.find(
                        (item) => item.id_coa === form.id_coa_kas,
                      );

                      return coa ? (
                        <>
                          <div>
                            <strong>ID:</strong> {coa.id_coa}
                          </div>

                          <div>
                            <strong>Kode:</strong> {coa.kode}
                          </div>

                          <div>
                            <strong>Nama:</strong> {coa.nama}
                          </div>

                          <div>
                            <strong>Cash Account:</strong> YA
                          </div>
                        </>
                      ) : (
                        <span className="text-red-600">
                          COA kas/bank tidak ditemukan.
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* ==================================================
                  PREVIEW JURNAL
              ================================================== */}

              <div className="rounded-lg border bg-gray-50 p-4">
                <div className="mb-3 text-sm font-semibold">Preview Jurnal</div>

                <div className="overflow-auto rounded border bg-white">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-100">
                        <th className="px-3 py-2 text-left">Posisi</th>

                        <th className="px-3 py-2 text-left">COA</th>

                        <th className="px-3 py-2 text-right">Nilai</th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr className="border-b">
                        <td className="px-3 py-2 font-medium text-red-700">
                          DEBIT
                        </td>

                        <td className="px-3 py-2">
                          {(() => {
                            const coa = coaBebanOptions.find(
                              (item) => item.id_coa === form.id_coa_beban,
                            );

                            return coa
                              ? `${coa.kode} - ${coa.nama}`
                              : "Belum dipilih";
                          })()}
                        </td>

                        <td className="px-3 py-2 text-right font-medium">
                          {formatRupiah(Number(form.nilai || 0))}
                        </td>
                      </tr>

                      <tr>
                        <td className="px-3 py-2 font-medium text-green-700">
                          KREDIT
                        </td>

                        <td className="px-3 py-2">
                          {(() => {
                            const coa = coaKasOptions.find(
                              (item) => item.id_coa === form.id_coa_kas,
                            );

                            return coa
                              ? `${coa.kode} - ${coa.nama}`
                              : "Belum dipilih";
                          })()}
                        </td>

                        <td className="px-3 py-2 text-right font-medium">
                          {formatRupiah(Number(form.nilai || 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  Jurnal harus selalu:
                  <strong> Debit Beban = Kredit Kas/Bank</strong>.
                </div>
              </div>

              {/* ==================================================
                  INFO PUT
              ================================================== */}

              {editingId !== null && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                  <div className="font-semibold">Mode Edit</div>

                  <p className="mt-1">
                    PUT memperbarui data transaksi staging. Jurnal lama tidak
                    diubah dan tidak dibuat ulang otomatis.
                  </p>

                  <p className="mt-1">
                    Jika transaksi yang sudah diposting perlu dikoreksi, gunakan
                    mekanisme reversal/koreksi accounting.
                  </p>
                </div>
              )}

              {/* ==================================================
                  API INFO
              ================================================== */}

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                <div className="font-semibold">Alur Penyimpanan</div>

                <p className="mt-1">
                  UI → <strong>/api/biayaUmum</strong> → validasi COA →
                  transaksi biaya → posting jurnal.
                </p>

                <p className="mt-1">
                  Tidak ada koneksi langsung dari browser ke Supabase.
                </p>
              </div>

              {/* ==================================================
                  BUTTON
              ================================================== */}

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" onClick={closeForm} disabled={saving}>
                  Batal
                </Button>

                <Button type="submit" disabled={saving || loadingCoa}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      {editingId === null ? (
                        <Plus className="mr-2 h-4 w-4" />
                      ) : (
                        <Pencil className="mr-2 h-4 w-4" />
                      )}

                      {editingId === null
                        ? "Simpan & Posting"
                        : "Simpan Perubahan"}
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
