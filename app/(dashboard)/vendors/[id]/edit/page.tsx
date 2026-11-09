"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

import { useToast } from "@/components/ui/toast-context";

interface FormState {
  kode_vendor: string;
  nama_vendor: string;
  kategori_vendor: string;
  telepon: string;
  email: string;
  alamat: string;
  npwp: string;
  nama_npwp: string;
  alamat_npwp: string;
  pkp: boolean;
  jenis_pajak: string;
  status: boolean;
}

interface Vendor {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
  kategori_vendor: string | null;
  npwp: string | null;
  nama_npwp: string | null;
  alamat_npwp: string | null;
  telepon: string | null;
  email: string | null;
  alamat: string | null;
  status: boolean | null;
  created_at: string;
  updated_at: string | null;
  pkp: boolean | null;
  jenis_pajak: string | null;
  id_coa: number | null;
  kode_coa: string | null;
  nama_coa: string | null;
}

interface VendorDetailResponse {
  vendor: Vendor;
  rekening: VendorRekening[];
  pajak: VendorPajak[];
}

interface VendorRekening {
  id: number;
  vendor_id: number;
  nama_bank: string;
  nomor_rekening: string;
  nama_rekening: string;
}

interface VendorPajak {
  id: number;
  vendor_id: number;
  npwp: string | null;
  nama_npwp: string | null;
  alamat_npwp: string | null;
  pkp: boolean | null;
}

interface ApiErrorResponse {
  error?: string;
}

export default function EditVendorPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const idParam = params.id;

  const id =
    typeof idParam === "string"
      ? idParam
      : Array.isArray(idParam)
        ? idParam[0]
        : "";

  const [form, setForm] = useState<FormState>({
    kode_vendor: "",
    nama_vendor: "",
    kategori_vendor: "",
    telepon: "",
    email: "",
    alamat: "",
    npwp: "",
    nama_npwp: "",
    alamat_npwp: "",
    pkp: false,
    jenis_pajak: "",
    status: true,
  });

  const [coa, setCoa] = useState<{
    id_coa: number | null;
    kode_coa: string | null;
    nama_coa: string | null;
  }>({
    id_coa: null,
    kode_coa: null,
    nama_coa: null,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (id === "") {
      setLoadError("ID vendor tidak valid");
      setLoading(false);
      return;
    }

    async function load(): Promise<void> {
      try {
        setLoading(true);
        setLoadError(null);

        /*
         * Detail endpoint digunakan agar data vendor terbaru,
         * COA, pajak dan rekening tetap konsisten.
         */
        const res = await fetch(`/api/vendors/${id}/detail`, {
          method: "GET",
          cache: "no-store",
        });

        const result: VendorDetailResponse | ApiErrorResponse =
          await res.json();

        if (!res.ok) {
          const errorResult = result as ApiErrorResponse;

          setLoadError(errorResult.error ?? "Gagal mengambil data vendor");

          return;
        }

        const detail = result as VendorDetailResponse;

        const vendor = detail.vendor;

        setForm({
          kode_vendor: vendor.kode_vendor ?? "",
          nama_vendor: vendor.nama_vendor,
          kategori_vendor: vendor.kategori_vendor ?? "",
          telepon: vendor.telepon ?? "",
          email: vendor.email ?? "",
          alamat: vendor.alamat ?? "",
          npwp: vendor.npwp ?? "",
          nama_npwp: vendor.nama_npwp ?? "",
          alamat_npwp: vendor.alamat_npwp ?? "",
          pkp: vendor.pkp === true,
          jenis_pajak: vendor.jenis_pajak ?? "",
          status: vendor.status === true,
        });

        setCoa({
          id_coa: vendor.id_coa,
          kode_coa: vendor.kode_coa,
          nama_coa: vendor.nama_coa,
        });
      } catch (error: unknown) {
        console.error("LOAD EDIT VENDOR ERROR:", error);

        setLoadError(
          error instanceof Error
            ? error.message
            : "Gagal mengambil data vendor",
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    /*
     * Jangan kirim request sebelum validasi.
     */

    if (form.kode_vendor.trim() === "") {
      showToast("Kode vendor wajib diisi", "error");
      return;
    }

    if (form.nama_vendor.trim() === "") {
      showToast("Nama vendor wajib diisi", "error");
      return;
    }

    if (form.email.trim() !== "") {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(form.email.trim())) {
        showToast("Format email tidak valid", "error");
        return;
      }
    }

    if (saving) {
      return;
    }

    try {
      setSaving(true);

      /*
       * ==========================================================
       * UPDATE MASTER VENDOR
       * ==========================================================
       *
       * id_coa TIDAK dikirim.
       *
       * COA merupakan relasi master yang dikontrol database/backend.
       */

      const res = await fetch(`/api/vendors/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kode_vendor: form.kode_vendor.trim(),
          nama_vendor: form.nama_vendor.trim(),
          kategori_vendor:
            form.kategori_vendor.trim() !== ""
              ? form.kategori_vendor.trim()
              : null,
          telepon: form.telepon.trim() !== "" ? form.telepon.trim() : null,
          email: form.email.trim() !== "" ? form.email.trim() : null,
          alamat: form.alamat.trim() !== "" ? form.alamat.trim() : null,
          npwp: form.npwp.trim() !== "" ? form.npwp.trim() : null,
          nama_npwp:
            form.nama_npwp.trim() !== "" ? form.nama_npwp.trim() : null,
          alamat_npwp:
            form.alamat_npwp.trim() !== "" ? form.alamat_npwp.trim() : null,
          pkp: form.pkp,
          jenis_pajak:
            form.jenis_pajak.trim() !== "" ? form.jenis_pajak.trim() : null,
          status: form.status,
        }),
      });

      const result: Vendor | ApiErrorResponse = await res.json();

      if (!res.ok) {
        const errorResult = result as ApiErrorResponse;

        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: errorResult.error ?? "Gagal menyimpan perubahan vendor",
        });

        return;
      }

      const updatedVendor = result as Vendor;

      await Swal.fire({
        position: "center",
        icon: "success",
        title: "Update Vendor Berhasil",
        html: `
          <div>
            <p>Data vendor berhasil diperbarui.</p>
            ${
              updatedVendor.kode_coa !== null
                ? `
                  <p class="mt-2">
                    COA:
                    <strong>${updatedVendor.kode_coa}</strong>
                    ${
                      updatedVendor.nama_coa !== null
                        ? ` - ${updatedVendor.nama_coa}`
                        : ""
                    }
                  </p>
                `
                : ""
            }
          </div>
        `,
        showConfirmButton: false,
        timer: 1800,
      });

      router.push(`/vendors/${id}`);
      router.refresh();
    } catch (error: unknown) {
      console.error("UPDATE VENDOR ERROR:", error);

      Swal.fire({
        icon: "error",
        title: "Gagal",
        text:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat update vendor",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <Card title="Edit Vendor">
          <div className="flex items-center gap-2 py-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            Memuat data vendor...
          </div>
        </Card>
      </div>
    );
  }

  if (loadError !== null) {
    return (
      <div className="max-w-5xl mx-auto">
        <Card title="Edit Vendor">
          <div className="py-6">
            <div className="text-sm text-red-600 mb-4">{loadError}</div>

            <Button variant="secondary" onClick={() => router.push("/vendors")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Edit Vendor">
        <div className="space-y-8">
          {/* ======================================================
              DATA UTAMA VENDOR
          ====================================================== */}

          <section>
            <h3 className="font-semibold text-lg mb-4">Data Vendor</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Kode Vendor"
                value={form.kode_vendor}
                onChange={(e) => handleChange("kode_vendor", e.target.value)}
              />

              <Input
                label="Nama Vendor"
                value={form.nama_vendor}
                onChange={(e) => handleChange("nama_vendor", e.target.value)}
              />

              <div>
                <label className="block text-sm font-medium mb-1">
                  Kategori
                </label>

                <select
                  className="w-full border rounded px-3 py-2"
                  value={form.kategori_vendor}
                  onChange={(e) =>
                    handleChange("kategori_vendor", e.target.value)
                  }
                >
                  <option value="">-- Pilih Kategori --</option>

                  <option value="PEMASOK">Pemasok</option>

                  <option value="PENERIMA_JASA">Penerima Jasa</option>

                  <option value="SUBKONTRAKTOR">Subkontraktor</option>
                </select>
              </div>

              <Input
                label="Telepon"
                value={form.telepon}
                onChange={(e) => handleChange("telepon", e.target.value)}
              />

              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />

              <Input
                label="Alamat"
                value={form.alamat}
                onChange={(e) => handleChange("alamat", e.target.value)}
              />
            </div>
          </section>

          {/* ======================================================
              DATA PAJAK
          ====================================================== */}

          <section>
            <h3 className="font-semibold text-lg mb-4">Data Pajak</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="NPWP"
                value={form.npwp}
                onChange={(e) => handleChange("npwp", e.target.value)}
              />

              <Input
                label="Nama NPWP"
                value={form.nama_npwp}
                onChange={(e) => handleChange("nama_npwp", e.target.value)}
              />

              <Input
                label="Alamat NPWP"
                value={form.alamat_npwp}
                onChange={(e) => handleChange("alamat_npwp", e.target.value)}
              />

              <Input
                label="Jenis Pajak"
                value={form.jenis_pajak}
                onChange={(e) => handleChange("jenis_pajak", e.target.value)}
              />

              <div className="flex items-center gap-3 min-h-[42px]">
                <input
                  id="pkp"
                  type="checkbox"
                  checked={form.pkp}
                  onChange={(e) => handleChange("pkp", e.target.checked)}
                  className="h-4 w-4"
                />

                <label htmlFor="pkp" className="text-sm font-medium">
                  PKP
                </label>
              </div>
            </div>
          </section>

          {/* ======================================================
              COA
          ====================================================== */}

          <section>
            <h3 className="font-semibold text-lg mb-4">Akun COA</h3>

            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-500">ID COA</div>

                  <div className="font-medium">{coa.id_coa ?? "-"}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-500">Kode COA</div>

                  <div className="font-medium">{coa.kode_coa ?? "-"}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-500">Nama COA</div>

                  <div className="font-medium">{coa.nama_coa ?? "-"}</div>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-3">
                Akun COA dikelola oleh sistem dan tidak dapat diubah melalui
                form vendor.
              </p>
            </div>
          </section>

          {/* ======================================================
              STATUS
          ====================================================== */}

          <section>
            <h3 className="font-semibold text-lg mb-4">Status Vendor</h3>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>

              <select
                className="w-full md:w-1/2 border rounded px-3 py-2"
                value={form.status ? "true" : "false"}
                onChange={(e) =>
                  handleChange("status", e.target.value === "true")
                }
              >
                <option value="true">Aktif</option>

                <option value="false">Nonaktif</option>
              </select>
            </div>
          </section>
        </div>

        {/* ========================================================
            BUTTON
        ======================================================== */}

        <div className="flex gap-3 mt-8">
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => router.push(`/vendors/${id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button disabled={saving} onClick={handleSubmit}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Update
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
