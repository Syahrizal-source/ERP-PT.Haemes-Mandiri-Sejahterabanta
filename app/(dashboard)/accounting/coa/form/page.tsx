"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import type { Coa, CoaTipe } from "@/types/coa";

/* =========================================================
   TYPE API
========================================================= */

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

interface CoaWithParent extends CoaApiRow {
  parent_kode: string | null;
  parent_nama: string | null;
}

/* =========================================================
   TYPE FORM
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
   TYPE PAYLOAD API LAMA
========================================================= */

interface CreateCoaPayload {
  kode: string;
  nama: string;
  tipe: CoaTipe;
  parent_id: number | null;
  aktif: boolean;
  is_cash: boolean;
}

interface UpdateCoaPayload {
  id_coa: number;
  nama: string;
  aktif: boolean;
  is_cash: boolean;
}

/* =========================================================
   DEFAULT FORM
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
   STYLE TIPE
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
   NORMALIZE API RESPONSE
========================================================= */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCoaApiRow(value: unknown): value is CoaApiRow {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id_coa === "number" &&
    typeof value.kode === "string" &&
    typeof value.nama === "string" &&
    typeof value.tipe === "string" &&
    typeof value.aktif === "boolean" &&
    typeof value.is_cash === "boolean"
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function CoaPage(): React.JSX.Element {
  const [data, setData] = useState<CoaWithParent[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [search, setSearch] = useState<string>("");

  const [filterTipe, setFilterTipe] = useState<CoaTipe | "ALL">("ALL");

  const [filterStatus, setFilterStatus] = useState<
    "ALL" | "AKTIF" | "NONAKTIF"
  >("ALL");

  const [filterCash, setFilterCash] = useState<"ALL" | "YA" | "TIDAK">("ALL");

  const [showForm, setShowForm] = useState<boolean>(false);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState<CoaFormState>(EMPTY_FORM);

  /* ======================================================
     FETCH COA
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
        const errorResult: ApiErrorResponse = isObject(result)
          ? {
              message:
                typeof result.message === "string" ? result.message : undefined,
            }
          : {};

        throw new Error(errorResult.message ?? "Gagal mengambil data COA.");
      }

      if (!Array.isArray(result)) {
        throw new Error("Response API COA tidak valid.");
      }

      const rows: CoaApiRow[] = result.filter((item): item is CoaApiRow =>
        isCoaApiRow(item),
      );

      const coaMap = new Map<number, CoaApiRow>();

      rows.forEach((row) => {
        coaMap.set(row.id_coa, row);
      });

      const rowsWithParent: CoaWithParent[] = rows.map((row) => {
        const parent =
          row.parent_id !== null ? coaMap.get(row.parent_id) : undefined;

        return {
          id_coa: row.id_coa,
          kode: row.kode,
          nama: row.nama,
          tipe: row.tipe,
          parent_id: row.parent_id,
          aktif: row.aktif,
          is_cash: row.is_cash,
          parent_kode: parent?.kode ?? null,
          parent_nama: parent?.nama ?? null,
        };
      });

      setData(rowsWithParent);
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

  useEffect(() => {
    void fetchCoa();
  }, [fetchCoa]);

  /* ======================================================
     PARENT COA

     API lama tidak mengembalikan is_header.
     Karena API tidak boleh diubah, parent diambil dari
     COA aktif yang tersedia di database.
  ====================================================== */

  const parentOptions = useMemo<CoaWithParent[]>(() => {
    return data
      .filter((item) => item.aktif === true && item.id_coa !== editingId)
      .sort((a, b) => a.kode.localeCompare(b.kode));
  }, [data, editingId]);

  /* ======================================================
     FILTER
   */
  const filteredData = useMemo<CoaWithParent[]>(() => {
    const keyword = search.trim().toLowerCase();

    return data.filter((item) => {
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
    });
  }, [data, search, filterTipe, filterStatus, filterCash]);

  /* ======================================================
     FORM
  ====================================================== */

  function openCreateForm(): void {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
    });
    setShowForm(true);
  }

  function openEditForm(item: CoaWithParent): void {
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
     VALIDASI FORM
  ====================================================== */

  function validateCreateForm(): string | null {
    const kode = form.kode.trim();
    const nama = form.nama.trim();

    if (!kode) {
      return "Kode COA wajib diisi.";
    }

    if (!nama) {
      return "Nama COA wajib diisi.";
    }

    if (kode.length > 20) {
      return "Kode COA maksimal 20 karakter.";
    }

    if (nama.length > 150) {
      return "Nama COA maksimal 150 karakter.";
    }

    const duplicate = data.find(
      (item) =>
        item.kode.trim().toLowerCase() === kode.toLowerCase() &&
        item.id_coa !== editingId,
    );

    if (duplicate) {
      return `Kode COA ${kode} sudah digunakan oleh ${duplicate.nama}.`;
    }

    if (form.parent_id !== null && form.parent_id === editingId) {
      return "Parent COA tidak boleh sama dengan COA itu sendiri.";
    }

    return null;
  }

  /* ======================================================
     SUBMIT
  ====================================================== */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const validationMessage = validateCreateForm();

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

         SENGAJA hanya mengirim field yang diterima oleh
         API POST lama:
         - kode
         - nama
         - tipe
         - parent_id
         - aktif
         - is_cash
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
          const errorResult: ApiErrorResponse = isObject(result)
            ? {
                message:
                  typeof result.message === "string"
                    ? result.message
                    : undefined,
              }
            : {};

          throw new Error(errorResult.message ?? "Gagal menambahkan COA.");
        }

        const createdId =
          isObject(result) && typeof result.id_coa === "number"
            ? result.id_coa
            : null;

        await Swal.fire({
          icon: "success",
          title: "COA Berhasil Ditambahkan",
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
        /* ================================================
           UPDATE

           API PATCH lama hanya menerima:
           id_coa
           nama
           aktif
           is_cash

           Kode dan tipe tidak diubah karena API lama
           memang tidak menyediakan perubahan tersebut.
        ================================================ */

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
          const errorResult: ApiErrorResponse = isObject(result)
            ? {
                message:
                  typeof result.message === "string"
                    ? result.message
                    : undefined,
              }
            : {};

          throw new Error(errorResult.message ?? "Gagal memperbarui COA.");
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
        title: "Gagal Menyimpan COA",
        text: message,
      });
    } finally {
      setSaving(false);
    }
  }

  /* ======================================================
     DELETE
  ====================================================== */

  async function handleDelete(item: CoaWithParent): Promise<void> {
    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Hapus COA?",
      html: `
        <div style="text-align:left">
          <div><strong>ID:</strong> ${item.id_coa}</div>
          <div><strong>Kode:</strong> ${item.kode}</div>
          <div><strong>Nama:</strong> ${item.nama}</div>
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
        const errorResult: ApiErrorResponse = isObject(result)
          ? {
              message:
                typeof result.message === "string" ? result.message : undefined,
            }
          : {};

        throw new Error(errorResult.message ?? "COA tidak dapat dihapus.");
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
    <div className="mx-auto max-w-[1600px]">
      <Card title="Chart of Account">
        <div className="space-y-5">
          {/* HEADER */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-semibold">Chart of Account</h1>

              <p className="mt-1 text-sm text-gray-500">
                Semua data COA berasal langsung dari database melalui API
                /api/coa.
              </p>
            </div>

            <div className="flex gap-2">
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

          {/* FILTER */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
                placeholder="Cari ID, kode, nama, parent..."
                className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm"
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

                if (TIPE_OPTIONS.includes(value as CoaTipe)) {
                  setFilterTipe(value as CoaTipe);
                }
              }}
              className="rounded-lg border bg-white px-3 py-2 text-sm"
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
              className="rounded-lg border bg-white px-3 py-2 text-sm"
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
              className="rounded-lg border bg-white px-3 py-2 text-sm"
            >
              <option value="ALL">Semua Cash Account</option>

              <option value="YA">YA</option>

              <option value="TIDAK">TIDAK</option>
            </select>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto rounded-lg border">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Memuat COA...
              </div>
            ) : (
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-b bg-gray-100">
                    <th className="border-r px-3 py-3 text-left">ID COA</th>

                    <th className="border-r px-3 py-3 text-left">Kode</th>

                    <th className="border-r px-3 py-3 text-left">Nama Akun</th>

                    <th className="border-r px-3 py-3 text-left">Tipe</th>

                    <th className="border-r px-3 py-3 text-center">Status</th>

                    <th className="border-r px-3 py-3 text-center">
                      Cash Account
                    </th>

                    <th className="border-r px-3 py-3 text-left">Parent</th>

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
                        Tidak ada data COA.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item) => (
                      <tr
                        key={item.id_coa}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="border-r px-3 py-2 font-mono font-semibold">
                          {item.id_coa}
                        </td>

                        <td className="border-r px-3 py-2 font-mono">
                          {item.kode}
                        </td>

                        <td className="border-r px-3 py-2">{item.nama}</td>

                        <td className="border-r px-3 py-2">
                          <span
                            className={`inline-flex rounded border px-2 py-1 text-xs font-medium ${getTipeClass(
                              item.tipe,
                            )}`}
                          >
                            {item.tipe}
                          </span>
                        </td>

                        <td className="border-r px-3 py-2 text-center">
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

                        <td className="border-r px-3 py-2 text-center">
                          {item.is_cash ? (
                            <span className="font-medium text-green-600">
                              YA
                            </span>
                          ) : (
                            <span className="text-gray-500">TIDAK</span>
                          )}
                        </td>

                        <td className="border-r px-3 py-2">
                          {item.parent_id !== null ? (
                            <div>
                              <div className="font-mono text-xs">
                                {item.parent_kode}
                              </div>

                              <div className="text-xs text-gray-600">
                                {item.parent_nama}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">ROOT</span>
                          )}
                        </td>

                        <td className="px-3 py-2">
                          <div className="flex justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                openEditForm(item);
                              }}
                              className="rounded p-2 text-blue-600 hover:bg-blue-50"
                              title="Edit"
                              disabled={deletingId !== null}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                void handleDelete(item);
                              }}
                              className="rounded p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                              title="Hapus"
                              disabled={deletingId !== null}
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
            Menampilkan {filteredData.length} dari {data.length} COA.
          </div>
        </div>
      </Card>

      {/* ==================================================
          MODAL FORM
      ================================================== */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
            {/* HEADER MODAL */}
            <div className="border-b px-5 py-4">
              <h2 className="text-lg font-semibold">
                {editingId === null ? "Tambah COA" : `Edit COA #${editingId}`}
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                ID COA dibuat otomatis oleh PostgreSQL.
              </p>
            </div>

            <form
              onSubmit={(event) => {
                void handleSubmit(event);
              }}
              className="space-y-5 p-5"
            >
              {/* ID */}
              {editingId !== null && (
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    ID COA
                  </label>

                  <input
                    type="text"
                    value={editingId}
                    readOnly
                    className="w-full rounded-lg border bg-gray-100 px-3 py-2 font-mono"
                  />
                </div>
              )}

              {/* KODE + TIPE */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Kode COA
                  </label>

                  <input
                    type="text"
                    value={form.kode}
                    disabled={editingId !== null}
                    onChange={(event) => {
                      updateForm("kode", event.target.value);
                    }}
                    placeholder="Contoh: 1101.03.17"
                    maxLength={20}
                    className="w-full rounded-lg border px-3 py-2 font-mono disabled:bg-gray-100"
                  />

                  <p className="mt-1 text-xs text-gray-500">
                    Maksimal 20 karakter.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Tipe COA
                  </label>

                  <select
                    value={form.tipe}
                    onChange={(event) => {
                      const value = event.target.value;

                      if (TIPE_OPTIONS.includes(value as CoaTipe)) {
                        updateForm("tipe", value as CoaTipe);
                      }
                    }}
                    disabled={editingId !== null}
                    className="w-full rounded-lg border bg-white px-3 py-2 disabled:bg-gray-100"
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
                <label className="mb-1 block text-sm font-medium">
                  Nama Akun
                </label>

                <input
                  type="text"
                  value={form.nama}
                  onChange={(event) => {
                    updateForm("nama", event.target.value);
                  }}
                  placeholder="Contoh: Kas Kecil Pengawas - Esron"
                  maxLength={150}
                  className="w-full rounded-lg border px-3 py-2"
                />

                <p className="mt-1 text-xs text-gray-500">
                  Maksimal 150 karakter.
                </p>
              </div>

              {/* PARENT */}
              <div>
                <label className="mb-1 block text-sm font-medium">
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
                  <option value="">ROOT / Tidak Ada Parent</option>

                  {parentOptions.map((parent) => (
                    <option key={parent.id_coa} value={parent.id_coa}>
                      {parent.id_coa} - {parent.kode} - {parent.nama}
                    </option>
                  ))}
                </select>

                <p className="mt-1 text-xs text-gray-500">
                  Parent diambil langsung dari COA yang sudah tersedia di
                  database.
                </p>
              </div>

              {/* STATUS */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                    <div className="text-xs text-gray-500">Kode</div>

                    <div className="font-mono font-semibold">
                      {form.kode.trim() || "-"}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Tipe</div>

                    <div>
                      <span
                        className={`inline-flex rounded border px-2 py-1 text-xs font-medium ${getTipeClass(
                          form.tipe,
                        )}`}
                      >
                        {form.tipe}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Nama</div>

                    <div className="font-medium">{form.nama.trim() || "-"}</div>
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

              {/* INFO */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                <div className="font-semibold">Penyimpanan COA</div>

                <p className="mt-1">
                  Saat tombol Simpan ditekan, form mengirim data ke{" "}
                  <strong>/api/coa</strong>. API lama Anda yang melakukan INSERT
                  ke tabel <strong>public.coa</strong>.
                </p>

                <p className="mt-1">
                  ID COA tidak diinput manual karena dibuat otomatis oleh
                  PostgreSQL.
                </p>
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
