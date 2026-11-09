"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

import type { ProyekMaster } from "@/types/proyek";

type ProyekForm = Omit<
  ProyekMaster,
  "id" | "created_at" | "updated_at" | "kode_accounting_proyek"
> & {
  id_vendor: number | null;
};

interface VendorOption {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
  status: boolean;
}

interface CreateProyekResponse {
  id?: string;
  message?: string;
  error?: string;
}

export default function CreateProyekPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState<boolean>(false);
  const [loadingVendor, setLoadingVendor] = useState<boolean>(true);

  const [vendors, setVendors] = useState<VendorOption[]>([]);

  const [form, setForm] = useState<ProyekForm>({
    kode_proyek: "",
    nama_proyek: "",
    lokasi: "",
    customer: "",
    id_vendor: null,
    jenis_proyek: "PENGURUGAN",
    nilai_kontrak: 0,
    tanggal_mulai: "",
    tanggal_selesai: "",
    project_manager: "",
    status: "DRAFT",
    margin_target: 0,
    metode_kontrak: "UNIT_PRICE",
  });

  /* =========================================================
     LOAD VENDOR MASTER
     ========================================================= */

  useEffect(() => {
    let cancelled = false;

    async function fetchVendors(): Promise<void> {
      try {
        setLoadingVendor(true);

        const res = await fetch("/api/vendors", {
          method: "GET",
          cache: "no-store",
        });

        const result: unknown = await res.json();

        if (!res.ok) {
          if (
            typeof result === "object" &&
            result !== null &&
            "error" in result &&
            typeof result.error === "string"
          ) {
            throw new Error(result.error);
          }

          throw new Error("Gagal mengambil data Vendor Master");
        }

        /*
         * API /api/vendors Anda mengembalikan ARRAY LANGSUNG:
         *
         * [
         *   {
         *     id,
         *     kode_vendor,
         *     nama_vendor,
         *     status,
         *     ...
         *   }
         * ]
         */
        if (!Array.isArray(result)) {
          throw new Error("Format response Vendor Master tidak sesuai.");
        }

        const activeVendors: VendorOption[] = result
          .filter((item: unknown): item is VendorOption => {
            if (typeof item !== "object" || item === null) {
              return false;
            }

            if (
              !("id" in item) ||
              !("nama_vendor" in item) ||
              !("status" in item)
            ) {
              return false;
            }

            const vendor = item as {
              id: unknown;
              kode_vendor?: unknown;
              nama_vendor: unknown;
              status: unknown;
            };

            return (
              typeof vendor.id === "number" &&
              typeof vendor.nama_vendor === "string" &&
              typeof vendor.status === "boolean"
            );
          })
          .filter((vendor) => vendor.status === true)
          .map((vendor) => ({
            id: vendor.id,
            kode_vendor:
              typeof vendor.kode_vendor === "string"
                ? vendor.kode_vendor
                : null,
            nama_vendor: vendor.nama_vendor,
            status: vendor.status,
          }));

        if (!cancelled) {
          setVendors(activeVendors);
        }
      } catch (error: unknown) {
        console.error("LOAD VENDOR ERROR:", error);

        if (!cancelled) {
          setVendors([]);

          showToast(
            error instanceof Error
              ? error.message
              : "Gagal mengambil data Vendor Master",
            "error",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingVendor(false);
        }
      }
    }

    void fetchVendors();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  /* =========================================================
     HANDLE CHANGE
     ========================================================= */

  function handleChange<K extends keyof ProyekForm>(
    field: K,
    value: ProyekForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  /* =========================================================
     HANDLE VENDOR CHANGE
     ========================================================= */

  function handleVendorChange(value: string): void {
    if (!value) {
      setForm((prev) => ({
        ...prev,
        id_vendor: null,
        customer: "",
      }));

      return;
    }

    const idVendor = Number(value);

    if (!Number.isInteger(idVendor) || idVendor <= 0) {
      setForm((prev) => ({
        ...prev,
        id_vendor: null,
        customer: "",
      }));

      return;
    }

    const selectedVendor = vendors.find((vendor) => vendor.id === idVendor);

    if (!selectedVendor) {
      setForm((prev) => ({
        ...prev,
        id_vendor: null,
        customer: "",
      }));

      return;
    }

    setForm((prev) => ({
      ...prev,
      id_vendor: selectedVendor.id,
      customer: selectedVendor.nama_vendor,
    }));
  }

  /* =========================================================
     SUBMIT
     ========================================================= */

  async function handleSubmit(): Promise<void> {
    if (!form.kode_proyek.trim()) {
      showToast("Kode proyek wajib diisi", "error");
      return;
    }

    if (!form.nama_proyek.trim()) {
      showToast("Nama proyek wajib diisi", "error");
      return;
    }

    /*
     * Customer wajib berasal dari Vendor Master.
     */
    if (form.id_vendor === null) {
      showToast("Customer / Vendor wajib dipilih", "error");
      return;
    }

    const selectedVendor = vendors.find(
      (vendor) => vendor.id === form.id_vendor,
    );

    if (!selectedVendor) {
      showToast("Vendor yang dipilih tidak ditemukan", "error");
      return;
    }

    if (!selectedVendor.status) {
      showToast("Vendor yang dipilih tidak aktif", "error");
      return;
    }

    if (form.nilai_kontrak < 0) {
      showToast("Nilai kontrak tidak boleh negatif", "error");
      return;
    }

    if (
      form.margin_target !== null &&
      form.margin_target !== undefined &&
      form.margin_target < 0
    ) {
      showToast("Margin target tidak boleh negatif", "error");
      return;
    }

    if (!form.tanggal_mulai) {
      showToast("Tanggal mulai wajib diisi", "error");
      return;
    }

    if (form.tanggal_selesai && form.tanggal_selesai < form.tanggal_mulai) {
      showToast(
        "Tanggal selesai tidak boleh lebih kecil dari tanggal mulai",
        "error",
      );
      return;
    }

    if (!form.project_manager.trim()) {
      showToast("Project Manager wajib diisi", "error");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/proyek/master", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kode_proyek: form.kode_proyek.trim(),
          nama_proyek: form.nama_proyek.trim(),
          lokasi: form.lokasi?.trim() || null,

          /*
           * Customer sekarang berasal dari Vendor Master.
           * API proyek akan mengambil nama_vendor berdasarkan
           * id_vendor.
           */
          id_vendor: form.id_vendor,

          jenis_proyek: form.jenis_proyek,
          nilai_kontrak: form.nilai_kontrak,
          tanggal_mulai: form.tanggal_mulai,
          tanggal_selesai: form.tanggal_selesai || null,
          project_manager: form.project_manager.trim(),
          status: form.status,
          margin_target: form.margin_target,
          metode_kontrak: form.metode_kontrak,
        }),
      });

      const result: CreateProyekResponse = await res.json();

      if (!res.ok) {
        await Swal.fire({
          icon: "error",
          title: "Oops...",
          text: result.error ?? "Proyek gagal disimpan",
        });

        return;
      }

      if (!result.id) {
        await Swal.fire({
          icon: "error",
          title: "Oops...",
          text: "ID proyek tidak ditemukan dari server.",
        });

        return;
      }

      await Swal.fire({
        position: "center",
        icon: "success",
        title: "Proyek Berhasil Masuk",
        text: result.message ?? "Data proyek berhasil disimpan",
        showConfirmButton: false,
        timer: 1500,
      });

      router.push(`/proyek/${result.id}/rab`);

      router.refresh();
    } catch (error: unknown) {
      console.error("CREATE PROYEK ERROR:", error);

      await Swal.fire({
        icon: "error",
        title: "Oops...",
        text:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menyimpan proyek.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Card title="Tambah Proyek">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* KODE PROYEK */}
          <Input
            label="Kode Proyek"
            value={form.kode_proyek}
            placeholder="Kode Proyek"
            onChange={(e) => handleChange("kode_proyek", e.target.value)}
          />

          {/* NAMA PROYEK */}
          <Input
            label="Nama Proyek"
            value={form.nama_proyek}
            placeholder="Nama Proyek"
            onChange={(e) => handleChange("nama_proyek", e.target.value)}
          />

          {/* =================================================
              CUSTOMER / VENDOR
          ================================================== */}
          <div className="space-y-1.5">
            <label
              htmlFor="vendor-proyek"
              className="block text-sm font-medium text-slate-700"
            >
              Customer / Vendor
            </label>

            <select
              id="vendor-proyek"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100"
              value={form.id_vendor ?? ""}
              onChange={(e) => handleVendorChange(e.target.value)}
              disabled={loading || loadingVendor}
            >
              <option value="">
                {loadingVendor
                  ? "Memuat Vendor..."
                  : vendors.length === 0
                    ? "Vendor tidak tersedia"
                    : "-- Pilih Customer / Vendor --"}
              </option>

              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.kode_vendor
                    ? `${vendor.kode_vendor} - ${vendor.nama_vendor}`
                    : vendor.nama_vendor}
                </option>
              ))}
            </select>

            {!loadingVendor && vendors.length === 0 && (
              <p className="text-xs text-red-500">
                Tidak ada Vendor Master aktif yang tersedia.
              </p>
            )}

            {form.id_vendor !== null && form.customer && (
              <p className="text-xs text-slate-500">
                Customer:{" "}
                <span className="font-medium text-slate-700">
                  {form.customer}
                </span>
              </p>
            )}
          </div>

          {/* LOKASI */}
          <Input
            label="Lokasi"
            value={form.lokasi ?? ""}
            placeholder="Lokasi"
            onChange={(e) => handleChange("lokasi", e.target.value)}
          />

          {/* MARGIN TARGET */}
          <Input
            label="Margin Target (%)"
            type="number"
            min={0}
            step="0.01"
            value={form.margin_target ?? 0}
            onChange={(e) =>
              handleChange("margin_target", Number(e.target.value))
            }
          />

          {/* JENIS PROYEK */}
          <div className="space-y-1.5">
            <label
              htmlFor="jenis-proyek"
              className="block text-sm font-medium text-slate-700"
            >
              Jenis Proyek
            </label>

            <select
              id="jenis-proyek"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              value={form.jenis_proyek ?? ""}
              onChange={(e) =>
                handleChange(
                  "jenis_proyek",
                  e.target.value as ProyekForm["jenis_proyek"],
                )
              }
            >
              <option value="PENGURUGAN">Pengurugan</option>
              <option value="CUT_FILL">Cut &amp; Fill</option>
              <option value="LAND_CLEARING">Land Clearing</option>
              <option value="JALAN">Pembangunan Jalan</option>
              <option value="DRAINASE">Drainase</option>
              <option value="GEDUNG">Gedung</option>
              <option value="APARTEMEN">Apartemen</option>
              <option value="PERUMAHAN">Perumahan</option>
            </select>
          </div>

          {/* METODE KONTRAK */}
          <div className="space-y-1.5">
            <label
              htmlFor="metode-kontrak"
              className="block text-sm font-medium text-slate-700"
            >
              Metode Kontrak
            </label>

            <select
              id="metode-kontrak"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              value={form.metode_kontrak ?? ""}
              onChange={(e) =>
                handleChange(
                  "metode_kontrak",
                  e.target.value as ProyekForm["metode_kontrak"],
                )
              }
            >
              <option value="LUMPSUM">Lump Sum</option>
              <option value="UNIT_PRICE">Unit Price</option>
            </select>
          </div>

          {/* STATUS */}
          <div className="space-y-1.5">
            <label
              htmlFor="status-proyek"
              className="block text-sm font-medium text-slate-700"
            >
              Status Proyek
            </label>

            <select
              id="status-proyek"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              value={form.status ?? ""}
              onChange={(e) =>
                handleChange("status", e.target.value as ProyekForm["status"])
              }
            >
              <option value="DRAFT">Draft</option>
              <option value="OPEN">Open</option>
              <option value="BERJALAN">Berjalan</option>
              <option value="SELESAI">Selesai</option>
              <option value="DITUTUP">Ditutup</option>
              <option value="BATAL">Batal</option>
            </select>
          </div>

          {/* NILAI KONTRAK */}
          <Input
            label="Nilai Kontrak"
            type="number"
            min={0}
            step="0.01"
            value={form.nilai_kontrak}
            onChange={(e) =>
              handleChange("nilai_kontrak", Number(e.target.value))
            }
          />

          {/* TANGGAL MULAI */}
          <Input
            label="Tanggal Mulai"
            type="date"
            value={form.tanggal_mulai}
            onChange={(e) => handleChange("tanggal_mulai", e.target.value)}
          />

          {/* TANGGAL SELESAI */}
          <Input
            label="Tanggal Selesai"
            type="date"
            value={form.tanggal_selesai ?? ""}
            onChange={(e) => handleChange("tanggal_selesai", e.target.value)}
          />

          {/* PROJECT MANAGER */}
          <Input
            label="Project Manager"
            value={form.project_manager}
            placeholder="Project Manager"
            onChange={(e) => handleChange("project_manager", e.target.value)}
          />
        </div>

        {/* ACTION */}
        <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
          <Button
            variant="secondary"
            onClick={() => router.push("/proyek")}
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>

          <Button
            onClick={() => void handleSubmit()}
            disabled={loading || loadingVendor}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Simpan
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
