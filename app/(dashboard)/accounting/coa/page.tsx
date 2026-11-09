"use client";

import type { FormEvent, JSX } from "react";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Loader2, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";

import Swal from "sweetalert2";

import Card from "@/components/ui/Card";

import Button from "@/components/ui/Button";

/* =========================================================

   TYPE COA

   HARUS MENGIKUTI RESPONSE API /api/coa LAMA

========================================================= */

type CoaTipe = "ASET" | "LIABILITAS" | "EKUITAS" | "PENDAPATAN" | "BEBAN";

interface CoaItem {
  id_coa: number;

  kode: string;

  nama: string;

  tipe: CoaTipe;

  parent_id: number | null;

  urutan: number;

  aktif: boolean;

  is_cash: boolean;

  parent_kode: string | null;

  parent_nama: string | null;

  saldo_awal_2026: number;
}

interface ApiErrorResponse {
  message?: string;
}

/* =========================================================

   PAYLOAD POST API LAMA

   API lama Anda hanya menerima 6 field ini.

========================================================= */

interface CreateCoaPayload {
  kode: string;

  nama: string;

  tipe: CoaTipe;

  parent_id: number | null;

  aktif: boolean;

  is_cash: boolean;
}

/* =========================================================

   PAYLOAD PATCH API LAMA

========================================================= */

interface UpdateCoaPayload {
  id_coa: number;

  nama: string;

  aktif: boolean;

  is_cash: boolean;
}

/* =========================================================

   FORM STATE

========================================================= */

interface CoaFormState {
  kode: string;

  nama: string;

  tipe: CoaTipe;

  parent_id: number | null;

  aktif: boolean;

  is_cash: boolean;
}

/* =========================================================

   FILTER

========================================================= */

type FilterTipe = CoaTipe | "ALL";

type FilterStatus = "ALL" | "AKTIF" | "NONAKTIF";

type FilterCash = "ALL" | "YA" | "TIDAK";

/* =========================================================

   EMPTY FORM

========================================================= */

const EMPTY_FORM: CoaFormState = {
  kode: "",

  nama: "",

  tipe: "ASET",

  parent_id: null,

  aktif: true,

  is_cash: false,
};

/* =========================================================

   TIPE COA

========================================================= */

const TIPE_OPTIONS: CoaTipe[] = [
  "ASET",

  "LIABILITAS",

  "EKUITAS",

  "PENDAPATAN",

  "BEBAN",
];

/* =========================================================

   COA DUPLIKAT LAMA — KHUSUS TAMPILAN DAFTAR UTAMA

   Kode lama 40.101 sampai 40.128 memiliki nama yang sama

   dengan kode baru 40.100.00.01 sampai 40.100.00.28.

   Data database tidak dihapus/diubah dan API tetap sama.

========================================================= */

const LEGACY_DUPLICATE_COA_CODES: ReadonlySet<string> = new Set(
  Array.from({ length: 28 }, (_, index) => `40.${101 + index}`),
);

function isLegacyDuplicateCoa(item: CoaItem): boolean {
  return LEGACY_DUPLICATE_COA_CODES.has(item.kode.trim());
}

/* =========================================================

   TYPE GUARDS

========================================================= */

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
    (value.parent_nama === null || typeof value.parent_nama === "string") &&
    typeof value.saldo_awal_2026 === "number" &&
    Number.isFinite(value.saldo_awal_2026)
  );
}

/* =========================================================

   TIPE STYLE

========================================================= */

function getTipeClass(tipe: CoaTipe): string {
  switch (tipe) {
    case "ASET":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "LIABILITAS":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "EKUITAS":
      return "border-purple-200 bg-purple-50 text-purple-700";

    case "PENDAPATAN":
      return "border-green-200 bg-green-50 text-green-700";

    case "BEBAN":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

/* =========================================================

   PAGE

========================================================= */

export default function CoaPage(): JSX.Element {
  const [data, setData] = useState<CoaItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  const [saving, setSaving] = useState<boolean>(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [search, setSearch] = useState<string>("");

  const [filterTipe, setFilterTipe] = useState<FilterTipe>("ALL");

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");

  const [filterCash, setFilterCash] = useState<FilterCash>("ALL");

  const [showForm, setShowForm] = useState<boolean>(false);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState<CoaFormState>(EMPTY_FORM);

  /* ======================================================

     GET /api/coa

     TIDAK LANGSUNG KE SUPABASE.

     TETAP MENGGUNAKAN API LAMA.

  ====================================================== */

  const fetchCoa = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);

      const response = await fetch("/api/coa", {
        method: "GET",

        cache: "no-store",
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        const errorResult: ApiErrorResponse = isRecord(result)
          ? {
              message:
                typeof result.message === "string" ? result.message : undefined,
            }
          : {};

        throw new Error(errorResult.message ?? "Gagal mengambil data COA.");
      }

      if (!Array.isArray(result)) {
        throw new Error("Format response API COA tidak valid.");
      }

      const rows: CoaItem[] = result.filter((item): item is CoaItem =>
        isCoaItem(item),
      );

      setData(rows);
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
      setLoading(false);
    }
  }, []);

  /* ======================================================

     INITIAL LOAD

  ====================================================== */

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect

    void fetchCoa();
  }, [fetchCoa]);

  /* ======================================================

     PARENT COA

     API LAMA SUDAH MENGEMBALIKAN parent_id,

     parent_kode, dan parent_nama.

     Kita tidak menggunakan is_header karena API lama

     tidak mengembalikan field tersebut.

  ====================================================== */

  const parentOptions = useMemo<CoaItem[]>(() => {
    return data

      .filter((item) => item.aktif === true && item.id_coa !== editingId)

      .sort((a, b) => a.kode.localeCompare(b.kode));
  }, [data, editingId]);

  /* ======================================================

     FILTER DATA

  ====================================================== */

  /* ======================================================

     URUTAN COA SESUAI DAFTAR ACUAN

     Tidak mengubah kode, parent, atau data database.

  ====================================================== */

  const TIPE_ORDER: Record<CoaTipe, number> = {
    ASET: 0,

    LIABILITAS: 1,

    EKUITAS: 2,

    PENDAPATAN: 3,

    BEBAN: 4,
  };

  function compareKodeCoa(a: string, b: string): number {
    const partsA = a.split(".").map((part) => {
      const value = Number(part);

      return Number.isFinite(value) && part.trim() !== ""
        ? value
        : part.toLowerCase();
    });

    const partsB = b.split(".").map((part) => {
      const value = Number(part);

      return Number.isFinite(value) && part.trim() !== ""
        ? value
        : part.toLowerCase();
    });

    const maxLength = Math.max(partsA.length, partsB.length);

    for (let index = 0; index < maxLength; index += 1) {
      const valueA = partsA[index];

      const valueB = partsB[index];

      if (valueA === undefined) return -1;

      if (valueB === undefined) return 1;

      if (typeof valueA === "number" && typeof valueB === "number") {
        if (valueA !== valueB) {
          return valueA - valueB;
        }
      } else {
        const textA = String(valueA);

        const textB = String(valueB);

        const result = textA.localeCompare(textB, "id", {
          numeric: true,

          sensitivity: "base",
        });

        if (result !== 0) return result;
      }
    }

    return a.localeCompare(b, "id", {
      numeric: true,

      sensitivity: "base",
    });
  }

  /* ======================================================

     DATA UNTUK DAFTAR UTAMA

     Sembunyikan hanya kode legacy 40.101–40.128.

     Data asli tetap dipertahankan untuk API dan parent dropdown.

  ====================================================== */

  const visibleData = useMemo<CoaItem[]>(
    () => data.filter((item) => !isLegacyDuplicateCoa(item)),

    [data],
  );

  const filteredData = useMemo<CoaItem[]>(() => {
    const keyword = search.trim().toLowerCase();

    return visibleData

      .filter((item) => {
        const matchesSearch =
          keyword.length === 0 ||
          String(item.id_coa).includes(keyword) ||
          item.kode.toLowerCase().includes(keyword) ||
          item.nama.toLowerCase().includes(keyword) ||
          item.tipe.toLowerCase().includes(keyword) ||
          (item.parent_kode ?? "").toLowerCase().includes(keyword) ||
          (item.parent_nama ?? "").toLowerCase().includes(keyword);

        const matchesTipe = filterTipe === "ALL" || item.tipe === filterTipe;

        const matchesStatus =
          filterStatus === "ALL" ||
          (filterStatus === "AKTIF" && item.aktif) ||
          (filterStatus === "NONAKTIF" && !item.aktif);

        const matchesCash =
          filterCash === "ALL" ||
          (filterCash === "YA" && item.is_cash) ||
          (filterCash === "TIDAK" && !item.is_cash);

        return matchesSearch && matchesTipe && matchesStatus && matchesCash;
      })

      .sort((a, b) => {
        const tipeA = TIPE_ORDER[a.tipe];

        const tipeB = TIPE_ORDER[b.tipe];

        if (tipeA !== tipeB) {
          return tipeA - tipeB;
        }

        const kodeComparison = compareKodeCoa(a.kode, b.kode);

        if (kodeComparison !== 0) {
          return kodeComparison;
        }

        return a.id_coa - b.id_coa;
      });
  }, [visibleData, search, filterTipe, filterStatus, filterCash]);

  /* ======================================================

     SUMMARY

  ====================================================== */

  const activeCount = useMemo<number>(
    () => visibleData.filter((item) => item.aktif).length,

    [visibleData],
  );

  const cashCount = useMemo<number>(
    () => visibleData.filter((item) => item.is_cash).length,

    [visibleData],
  );

  const parentCount = useMemo<number>(
    () =>
      visibleData.filter((item) =>
        visibleData.some((child) => child.parent_id === item.id_coa),
      ).length,

    [visibleData],
  );

  /* ======================================================

     CREATE FORM

  ====================================================== */

  function openCreateForm(): void {
    setEditingId(null);

    setForm({
      ...EMPTY_FORM,
    });

    setShowForm(true);
  }

  /* ======================================================

     EDIT FORM

  ====================================================== */

  function openEditForm(item: CoaItem): void {
    setEditingId(item.id_coa);

    setForm({
      kode: item.kode,

      nama: item.nama,

      tipe: item.tipe,

      parent_id: item.parent_id,

      aktif: item.aktif,

      is_cash: item.is_cash,
    });

    setShowForm(true);
  }

  /* ======================================================

     CLOSE FORM

  ====================================================== */

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

  /* ======================================================

     UPDATE FORM

  ====================================================== */

  function updateForm<K extends keyof CoaFormState>(
    field: K,

    value: CoaFormState[K],
  ): void {
    setForm((current) => ({
      ...current,

      [field]: value,
    }));
  }

  /* ======================================================

     VALIDASI

  ====================================================== */

  function validateForm(): string | null {
    const kode = form.kode.trim();

    const nama = form.nama.trim();

    /* CREATE wajib punya kode */

    if (editingId === null && kode.length === 0) {
      return "Kode COA wajib diisi.";
    }

    if (nama.length === 0) {
      return "Nama COA wajib diisi.";
    }

    if (kode.length > 20) {
      return "Kode COA maksimal 20 karakter.";
    }

    if (nama.length > 150) {
      return "Nama COA maksimal 150 karakter.";
    }

    /* CREATE: cek kode duplicate */

    if (editingId === null) {
      const duplicate = data.find(
        (item) => item.kode.trim().toLowerCase() === kode.toLowerCase(),
      );

      if (duplicate) {
        return `Kode COA ${kode} sudah digunakan oleh ${duplicate.nama}.`;
      }
    }

    /* Parent tidak boleh dirinya sendiri */

    if (editingId !== null && form.parent_id === editingId) {
      return "Parent COA tidak boleh sama dengan COA itu sendiri.";
    }

    /* Parent harus benar-benar ada */

    if (form.parent_id !== null) {
      const parentExists = data.some((item) => item.id_coa === form.parent_id);

      if (!parentExists) {
        return "Parent COA yang dipilih tidak ditemukan.";
      }
    }

    return null;
  }

  function formatRupiah(value: number): string {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",

      currency: "IDR",

      minimumFractionDigits: 2,

      maximumFractionDigits: 2,
    }).format(value);
  }

  /* ======================================================

     SUBMIT

     PENTING:

     POST HANYA MENGIRIM FIELD YANG DIDUKUNG API LAMA.

  ====================================================== */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const validationMessage = validateForm();

    if (validationMessage) {
      await Swal.fire({
        icon: "warning",

        title: "Data COA Belum Valid",

        text: validationMessage,
      });

      return;
    }

    try {
      setSaving(true);

      /* ==================================================

         CREATE

      ================================================== */

      if (editingId === null) {
        const payload: CreateCoaPayload = {
          kode: form.kode.trim(),

          nama: form.nama.trim(),

          tipe: form.tipe,

          parent_id: form.parent_id,

          aktif: form.aktif,

          is_cash: form.is_cash,
        };

        const response = await fetch("/api/coa", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        });

        const result: unknown = await response.json();

        if (!response.ok) {
          const errorResult: ApiErrorResponse = isRecord(result)
            ? {
                message:
                  typeof result.message === "string"
                    ? result.message
                    : undefined,
              }
            : {};

          await Swal.fire({
            icon: response.status >= 500 ? "error" : "warning",

            title: "COA Tidak Dapat Dibuat",

            text: errorResult.message ?? "Gagal membuat COA.",

            confirmButtonText: "Mengerti",
          });

          return;
        }

        const createdId =
          isRecord(result) && typeof result.id_coa === "number"
            ? result.id_coa
            : null;

        await Swal.fire({
          icon: "success",

          title: "COA Berhasil Dibuat",

          html: `

            <div style="text-align:left">

              ${
                createdId !== null
                  ? `<div><strong>ID COA:</strong> ${createdId}</div>`
                  : ""
              }

              <div><strong>Kode:</strong> ${form.kode.trim()}</div>

              <div><strong>Nama:</strong> ${form.nama.trim()}</div>

              <div><strong>Tipe:</strong> ${form.tipe}</div>

            </div>

          `,

          confirmButtonText: "OK",
        });
      } else {
        /* ==================================================

           UPDATE

           SESUAI API PATCH LAMA.

        ================================================== */

        const payload: UpdateCoaPayload = {
          id_coa: editingId,

          nama: form.nama.trim(),

          aktif: form.aktif,

          is_cash: form.is_cash,
        };

        const response = await fetch("/api/coa", {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        });

        const result: unknown = await response.json();

        if (!response.ok) {
          const errorResult: ApiErrorResponse = isRecord(result)
            ? {
                message:
                  typeof result.message === "string"
                    ? result.message
                    : undefined,
              }
            : {};

          const message = errorResult.message ?? "Gagal memperbarui COA.";

          const isCoaLocked =
            response.status === 403 ||
            /sudah dipakai jurnal|tidak boleh diubah|sudah digunakan pada jurnal/i.test(
              message,
            );

          await Swal.fire({
            icon: isCoaLocked ? "warning" : "error",

            title: isCoaLocked
              ? "COA Tidak Dapat Diubah"
              : "Gagal Memperbarui COA",

            text: isCoaLocked
              ? "COA ini sudah digunakan pada jurnal. Untuk menjaga riwayat akuntansi, perubahan melalui fitur ini tidak diizinkan."
              : message,

            confirmButtonText: "Mengerti",
          });

          return;
        }

        await Swal.fire({
          icon: "success",

          title: "COA Berhasil Diperbarui",

          timer: 1500,

          showConfirmButton: false,
        });
      }

      closeForm();

      await fetchCoa();
    } catch (error: unknown) {
      console.error("SAVE COA ERROR:", error);

      const message =
        error instanceof Error ? error.message : "Gagal menyimpan COA.";

      await Swal.fire({
        icon: "error",

        title: "Gagal",

        text: message,
      });
    } finally {
      setSaving(false);
    }
  }

  /* ======================================================

     DELETE

     TETAP MENGGUNAKAN API DELETE LAMA.

  ====================================================== */

  async function handleDelete(item: CoaItem): Promise<void> {
    const confirmation = await Swal.fire({
      icon: "warning",

      title: "Hapus COA?",

      html: `

          <div style="text-align:left">

            <div>

              <strong>ID COA:</strong>

              ${item.id_coa}

            </div>

            <div>

              <strong>Kode:</strong>

              ${item.kode}

            </div>

            <div>

              <strong>Nama:</strong>

              ${item.nama}

            </div>

          </div>

        `,

      showCancelButton: true,

      confirmButtonText: "Ya, Hapus",

      cancelButtonText: "Batal",

      confirmButtonColor: "#dc2626",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      setDeletingId(item.id_coa);

      const response = await fetch("/api/coa", {
        method: "DELETE",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id_coa: item.id_coa,
        }),
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        const errorResult: ApiErrorResponse = isRecord(result)
          ? {
              message:
                typeof result.message === "string" ? result.message : undefined,
            }
          : {};

        const message = errorResult.message ?? "COA tidak dapat dihapus.";

        const isDeletionBlocked =
          response.status === 409 ||
          response.status === 403 ||
          /tidak dapat dihapus|foreign key|direferensikan|akun anak|sudah digunakan pada jurnal/i.test(
            message,
          );

        await Swal.fire({
          icon: isDeletionBlocked ? "warning" : "error",

          title: isDeletionBlocked
            ? "COA Tidak Dapat Dihapus"
            : "Gagal Menghapus COA",

          text: message,

          confirmButtonText: "Mengerti",
        });

        return;
      }

      await Swal.fire({
        icon: "success",

        title: "COA Berhasil Dihapus",

        timer: 1500,

        showConfirmButton: false,
      });

      await fetchCoa();
    } catch (error: unknown) {
      console.error("DELETE COA ERROR:", error);

      const message =
        error instanceof Error ? error.message : "Gagal menghapus COA.";

      await Swal.fire({
        icon: "error",

        title: "Tidak Dapat Menghapus COA",

        text: message,
      });
    } finally {
      setDeletingId(null);
    }
  }

  /* ======================================================

     RENDER

  ====================================================== */

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <Card title="Chart of Account">
        <div className="space-y-4">
          {/* =================================================

              HEADER

          ================================================= */}

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Data COA diambil melalui API lama /api/coa.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => {
                  void fetchCoa();
                }}
                disabled={loading}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>

              <Button type="button" onClick={openCreateForm}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah COA
              </Button>
            </div>
          </div>

          {/* =================================================

              SUMMARY

          ================================================= */}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-xs text-gray-500">Total COA</div>

              <div className="mt-1 text-2xl font-semibold">
                {visibleData.length}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-xs text-gray-500">COA Aktif</div>

              <div className="mt-1 text-2xl font-semibold">{activeCount}</div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-xs text-gray-500">Cash Account</div>

              <div className="mt-1 text-2xl font-semibold">{cashCount}</div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-xs text-gray-500">COA Parent</div>

              <div className="mt-1 text-2xl font-semibold">{parentCount}</div>
            </div>
          </div>

          {/* =================================================

              FILTER

          ================================================= */}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
                placeholder="Cari ID, kode, nama, tipe, parent..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={filterTipe}
              onChange={(event) => {
                const value = event.target.value;

                if (value === "ALL") {
                  setFilterTipe("ALL");

                  return;
                }

                if (isCoaTipe(value)) {
                  setFilterTipe(value);
                }
              }}
              className="min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="ALL">Semua Tipe</option>

              {TIPE_OPTIONS.map((tipe) => (
                <option key={tipe} value={tipe}>
                  {tipe}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(event) => {
                const value = event.target.value;

                if (
                  value === "ALL" ||
                  value === "AKTIF" ||
                  value === "NONAKTIF"
                ) {
                  setFilterStatus(value);
                }
              }}
              className="min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="ALL">Semua Status</option>

              <option value="AKTIF">AKTIF</option>

              <option value="NONAKTIF">NONAKTIF</option>
            </select>

            <select
              value={filterCash}
              onChange={(event) => {
                const value = event.target.value;

                if (value === "ALL" || value === "YA" || value === "TIDAK") {
                  setFilterCash(value);
                }
              }}
              className="min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="ALL">Semua Cash Account</option>

              <option value="YA">Cash Account</option>

              <option value="TIDAK">Non Cash</option>
            </select>
          </div>

          {/* =================================================

              TABLE

          ================================================= */}

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Memuat data COA...
              </div>
            ) : (
              <table className="w-full min-w-[1260px] border-collapse text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="whitespace-nowrap border-r border-gray-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      ID COA
                    </th>

                    <th className="whitespace-nowrap border-r border-gray-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Kode
                    </th>

                    <th className="whitespace-nowrap border-r border-gray-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Nama Akun
                    </th>

                    <th className="whitespace-nowrap border-r border-gray-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Tipe
                    </th>

                    <th className="whitespace-nowrap border-r border-gray-200 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Status
                    </th>

                    <th className="whitespace-nowrap border-r border-gray-200 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Cash Account
                    </th>

                    <th className="whitespace-nowrap border-r border-gray-200 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Saldo Awal 2026
                    </th>

                    <th className="whitespace-nowrap border-r border-gray-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Parent
                    </th>

                    <th className="whitespace-nowrap px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-12 text-center text-sm text-gray-500"
                      >
                        Tidak ada COA yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item) => (
                      <tr
                        key={item.id_coa}
                        className="border-b border-gray-100 transition-colors hover:bg-blue-50/40"
                      >
                        <td className="border-r border-gray-100 px-3 py-3 font-mono text-xs font-semibold text-gray-600">
                          {item.id_coa}
                        </td>

                        <td className="border-r border-gray-100 px-3 py-3 font-mono text-xs">
                          {item.kode}
                        </td>

                        <td className="border-r border-gray-100 px-3 py-3">
                          <div className="font-medium">{item.nama}</div>
                        </td>

                        <td className="border-r border-gray-100 px-3 py-3">
                          <span
                            className={`inline-flex rounded border px-2 py-1 text-xs font-medium ${getTipeClass(
                              item.tipe,
                            )}`}
                          >
                            {item.tipe}
                          </span>
                        </td>

                        <td className="border-r border-gray-100 px-3 py-3 text-center">
                          {item.aktif ? (
                            <span className="font-medium text-green-600">
                              AKTIF
                            </span>
                          ) : (
                            <span className="font-medium text-gray-500">
                              NONAKTIF
                            </span>
                          )}
                        </td>

                        <td className="border-r border-gray-100 px-3 py-3 text-center">
                          {item.is_cash ? (
                            <span className="font-medium text-green-600">
                              YA
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                              TIDAK
                            </span>
                          )}
                        </td>

                        <td className="border-r border-gray-100 px-3 py-3 text-right font-mono text-xs font-semibold tabular-nums whitespace-nowrap">
                          {formatRupiah(item.saldo_awal_2026)}
                        </td>

                        <td className="border-r border-gray-100 px-3 py-3">
                          {item.parent_id !== null ? (
                            <div>
                              <div className="font-mono text-xs font-medium text-gray-700">
                                {item.parent_kode}
                              </div>

                              <div className="mt-0.5 max-w-[260px] truncate text-xs text-gray-500">
                                {item.parent_nama}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">ROOT</span>
                          )}
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                openEditForm(item);
                              }}
                              disabled={deletingId !== null}
                              className="rounded p-2 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                              title="Edit COA"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                void handleDelete(item);
                              }}
                              disabled={deletingId !== null}
                              className="rounded p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                              title="Hapus COA"
                            >
                              {deletingId === item.id_coa ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="text-xs text-gray-500">
            Menampilkan {filteredData.length} dari {visibleData.length} COA
            (kode duplikat lama disembunyikan dari daftar utama).
          </div>
        </div>
      </Card>

      {/* ==================================================

          MODAL FORM

      ================================================== */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl">
            {/* HEADER */}

            <div className="border-b px-5 py-4">
              <h3 className="text-lg font-semibold">
                {editingId === null ? "Tambah COA" : `Edit COA #${editingId}`}
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                ID COA dibuat otomatis oleh database.
              </p>
            </div>

            {/* FORM */}

            <form
              onSubmit={(event) => {
                void handleSubmit(event);
              }}
              className="space-y-4 p-5"
            >
              {/* ID */}

              {editingId !== null && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    ID COA
                  </label>

                  <input
                    type="text"
                    value={editingId}
                    readOnly
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2.5 font-mono text-sm text-gray-600"
                  />
                </div>
              )}

              {/* KODE + TIPE */}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Kode COA
                  </label>

                  <input
                    type="text"
                    value={form.kode}
                    disabled={editingId !== null}
                    maxLength={20}
                    onChange={(event) => {
                      updateForm("kode", event.target.value);
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-mono text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                    placeholder="Contoh: 1101.03.17"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Tipe COA
                  </label>

                  <select
                    value={form.tipe}
                    disabled={editingId !== null}
                    onChange={(event) => {
                      const value = event.target.value;

                      if (isCoaTipe(value)) {
                        updateForm("tipe", value);
                      }
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                  >
                    {TIPE_OPTIONS.map((tipe) => (
                      <option key={tipe} value={tipe}>
                        {tipe}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* NAMA */}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Nama Akun
                </label>

                <input
                  type="text"
                  value={form.nama}
                  maxLength={150}
                  onChange={(event) => {
                    updateForm("nama", event.target.value);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Contoh: Kas Kecil Pengawas - Esron"
                />
              </div>

              {/* PARENT */}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Parent COA
                </label>

                <select
                  value={form.parent_id === null ? "" : String(form.parent_id)}
                  onChange={(event) => {
                    const value = event.target.value;

                    updateForm(
                      "parent_id",

                      value === "" ? null : Number(value),
                    );
                  }}
                  className="w-full rounded-lg border bg-white px-3 py-2"
                >
                  <option value="">ROOT / Tanpa Parent</option>

                  {parentOptions.map((parent) => (
                    <option key={parent.id_coa} value={parent.id_coa}>
                      {parent.id_coa} - {parent.kode} - {parent.nama}
                    </option>
                  ))}
                </select>

                <p className="mt-1 text-xs text-gray-500">
                  Parent diambil dari COA yang dikembalikan oleh API lama.
                </p>
              </div>

              {/* STATUS */}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3">
                  <input
                    type="checkbox"
                    checked={form.aktif}
                    onChange={(event) => {
                      updateForm("aktif", event.target.checked);
                    }}
                  />

                  <div>
                    <div className="text-sm font-medium">COA Aktif</div>

                    <div className="text-xs text-gray-500">
                      COA dapat digunakan dalam transaksi.
                    </div>
                  </div>
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3">
                  <input
                    type="checkbox"
                    checked={form.is_cash}
                    onChange={(event) => {
                      updateForm("is_cash", event.target.checked);
                    }}
                  />

                  <div>
                    <div className="text-sm font-medium">Cash Account</div>

                    <div className="text-xs text-gray-500">
                      Tandai jika akun merupakan kas/bank.
                    </div>
                  </div>
                </label>
              </div>

              {/* PREVIEW */}

              <div className="rounded-lg border bg-gray-50 p-4">
                <div className="mb-3 text-sm font-semibold">Preview COA</div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-xs text-gray-500">ID COA</div>

                    <div className="font-mono font-semibold">
                      {editingId ?? "Otomatis Database"}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Kode</div>

                    <div className="font-mono font-semibold">
                      {form.kode.trim() || "-"}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Nama</div>

                    <div className="font-medium">{form.nama.trim() || "-"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Tipe</div>

                    <span
                      className={`inline-flex rounded border px-2 py-1 text-xs font-medium ${getTipeClass(
                        form.tipe,
                      )}`}
                    >
                      {form.tipe}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Parent</div>

                    <div>
                      {form.parent_id === null
                        ? "ROOT"
                        : (() => {
                            const parent = data.find(
                              (item) => item.id_coa === form.parent_id,
                            );

                            return parent
                              ? `${parent.kode} - ${parent.nama}`
                              : `ID ${form.parent_id}`;
                          })()}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Status</div>

                    <div className="font-medium">
                      {form.aktif ? "AKTIF" : "NONAKTIF"}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Cash Account</div>

                    <div className="font-medium">
                      {form.is_cash ? "YA" : "TIDAK"}
                    </div>
                  </div>
                </div>
              </div>

              {/* INFO API */}

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                <div className="font-semibold">Penyimpanan COA</div>

                <p className="mt-1">
                  Form ini menggunakan API lama:
                  <strong> /api/coa</strong>.
                </p>

                <p className="mt-1">
                  Tidak ada koneksi langsung dari browser ke Supabase.
                </p>

                <p className="mt-1">ID COA dibuat otomatis oleh PostgreSQL.</p>
              </div>

              {/* BUTTON */}

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" onClick={closeForm} disabled={saving}>
                  Batal
                </Button>

                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />

                      {editingId === null ? "Simpan COA" : "Simpan Perubahan"}
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
