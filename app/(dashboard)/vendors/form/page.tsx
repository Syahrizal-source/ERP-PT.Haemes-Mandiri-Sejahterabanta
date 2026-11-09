"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

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
  nama_bank: string;
  nomor_rekening: string;
  nama_rekening: string;
}

interface VendorResponse {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
  id_coa: number | null;
  kode_coa: string | null;
  nama_coa: string | null;
}

interface ApiErrorResponse {
  error?: string;
}

export default function CreateVendorPage() {
  const router = useRouter();
  const { showToast } = useToast();

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
    nama_bank: "",
    nomor_rekening: "",
    nama_rekening: "",
  });

  const [saving, setSaving] = useState<boolean>(false);

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
    if (saving) {
      return;
    }

    /*
     * ============================================================
     * VALIDASI DASAR
     * ============================================================
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

    /*
     * ============================================================
     * SIMPAN VENDOR
     * ============================================================
     *
     * id_coa TIDAK dikirim.
     *
     * Database public.vendors sudah mempunyai:
     *
     * id_coa DEFAULT 7
     *
     * sehingga vendor baru otomatis mendapatkan:
     *
     * COA 12001 - Piutang Usaha
     */

    try {
      setSaving(true);

      const vendorRes = await fetch("/api/vendors", {
        method: "POST",
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
          telepon:
            form.telepon.trim() !== ""
              ? form.telepon.trim()
              : null,
          email:
            form.email.trim() !== ""
              ? form.email.trim()
              : null,
          alamat:
            form.alamat.trim() !== ""
              ? form.alamat.trim()
              : null,
          npwp:
            form.npwp.trim() !== ""
              ? form.npwp.trim()
              : null,
          nama_npwp:
            form.nama_npwp.trim() !== ""
              ? form.nama_npwp.trim()
              : null,
          alamat_npwp:
            form.alamat_npwp.trim() !== ""
              ? form.alamat_npwp.trim()
              : null,
          pkp: form.pkp,
          jenis_pajak:
            form.jenis_pajak.trim() !== ""
              ? form.jenis_pajak.trim()
              : null,
          status: true,
        }),
      });

      const vendorResult: VendorResponse | ApiErrorResponse =
        await vendorRes.json();

      if (!vendorRes.ok) {
        const errorResult = vendorResult as ApiErrorResponse;

        Swal.fire({
          icon: "error",
          title: "Gagal",
          text:
            errorResult.error ??
            "Gagal menyimpan vendor",
        });

        return;
      }

      const vendor = vendorResult as VendorResponse;
      const vendorId: number = vendor.id;

      /*
       * ============================================================
       * SIMPAN DATA PAJAK
       * ============================================================
       *
       * Hanya dibuat apabila NPWP diisi.
       */

      if (form.npwp.trim() !== "") {
        const pajakRes = await fetch("/api/vendor-pajak", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            vendor_id: vendorId,
            npwp: form.npwp.trim(),
            nama_npwp:
              form.nama_npwp.trim() !== ""
                ? form.nama_npwp.trim()
                : null,
            alamat_npwp:
              form.alamat_npwp.trim() !== ""
                ? form.alamat_npwp.trim()
                : null,
            pkp: form.pkp,
          }),
        });

        if (!pajakRes.ok) {
          const pajakError: ApiErrorResponse =
            await pajakRes.json();

          Swal.fire({
            icon: "warning",
            title: "Vendor Tersimpan",
            text:
              pajakError.error ??
              "Vendor berhasil disimpan, tetapi data pajak gagal disimpan.",
          });

          return;
        }
      }

      /*
       * ============================================================
       * SIMPAN REKENING
       * ============================================================
       *
       * Rekening hanya dibuat apabila nama bank dan nomor rekening
       * diisi.
       */

      if (
        form.nama_bank.trim() !== "" &&
        form.nomor_rekening.trim() !== ""
      ) {
        const rekeningRes = await fetch(
          "/api/vendor-rekening",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              vendor_id: vendorId,
              nama_bank: form.nama_bank.trim(),
              nomor_rekening:
                form.nomor_rekening.trim(),
              nama_rekening:
                form.nama_rekening.trim() !== ""
                  ? form.nama_rekening.trim()
                  : null,
            }),
          },
        );

        if (!rekeningRes.ok) {
          const rekeningError: ApiErrorResponse =
            await rekeningRes.json();

          Swal.fire({
            icon: "warning",
            title: "Vendor Tersimpan",
            text:
              rekeningError.error ??
              "Vendor berhasil disimpan, tetapi data rekening gagal disimpan.",
          });

          return;
        }
      }

      /*
       * ============================================================
       * BERHASIL
       * ============================================================
       */

      await Swal.fire({
        icon: "success",
        title: "Berhasil",
        html: `
          <div>
            <p>Vendor berhasil disimpan.</p>
            ${
              vendor.kode_coa !== null
                ? `<p class="mt-2">
                    COA:
                    <strong>${vendor.kode_coa}</strong>
                    ${
                      vendor.nama_coa !== null
                        ? ` - ${vendor.nama_coa}`
                        : ""
                    }
                  </p>`
                : ""
            }
          </div>
        `,
      });

      router.push("/vendors");
      router.refresh();
    } catch (error: unknown) {
      console.error("CREATE VENDOR ERROR:", error);

      Swal.fire({
        icon: "error",
        title: "Gagal",
        text:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menyimpan vendor",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Tambah Vendor">
        <div className="space-y-8">
          {/* ======================================================
              DATA UTAMA VENDOR
          ====================================================== */}

          <section>
            <h3 className="font-semibold text-lg mb-4">
              Data Vendor
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Kode Vendor"
                value={form.kode_vendor}
                onChange={(e) =>
                  handleChange(
                    "kode_vendor",
                    e.target.value,
                  )
                }
              />

              <Input
                label="Nama Vendor"
                value={form.nama_vendor}
                onChange={(e) =>
                  handleChange(
                    "nama_vendor",
                    e.target.value,
                  )
                }
              />

              <Input
                label="Kategori"
                value={form.kategori_vendor}
                onChange={(e) =>
                  handleChange(
                    "kategori_vendor",
                    e.target.value,
                  )
                }
              />

              <Input
                label="Telepon"
                value={form.telepon}
                onChange={(e) =>
                  handleChange(
                    "telepon",
                    e.target.value,
                  )
                }
              />

              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  handleChange(
                    "email",
                    e.target.value,
                  )
                }
              />

              <Input
                label="Alamat"
                value={form.alamat}
                onChange={(e) =>
                  handleChange(
                    "alamat",
                    e.target.value,
                  )
                }
              />
            </div>
          </section>

          {/* ======================================================
              DATA PAJAK
          ====================================================== */}

          <section>
            <h3 className="font-semibold text-lg mb-4">
              Data Pajak
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="NPWP"
                value={form.npwp}
                onChange={(e) =>
                  handleChange(
                    "npwp",
                    e.target.value,
                  )
                }
              />

              <Input
                label="Nama NPWP"
                value={form.nama_npwp}
                onChange={(e) =>
                  handleChange(
                    "nama_npwp",
                    e.target.value,
                  )
                }
              />

              <Input
                label="Alamat NPWP"
                value={form.alamat_npwp}
                onChange={(e) =>
                  handleChange(
                    "alamat_npwp",
                    e.target.value,
                  )
                }
              />

              <Input
                label="Jenis Pajak"
                value={form.jenis_pajak}
                onChange={(e) =>
                  handleChange(
                    "jenis_pajak",
                    e.target.value,
                  )
                }
              />

              <div className="flex items-center gap-3 min-h-[42px]">
                <input
                  id="pkp"
                  type="checkbox"
                  checked={form.pkp}
                  onChange={(e) =>
                    handleChange(
                      "pkp",
                      e.target.checked,
                    )
                  }
                  className="h-4 w-4"
                />

                <label
                  htmlFor="pkp"
                  className="text-sm font-medium"
                >
                  PKP
                </label>
              </div>
            </div>
          </section>

          {/* ======================================================
              DATA REKENING
          ====================================================== */}

          <section>
            <h3 className="font-semibold text-lg mb-4">
              Data Rekening
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nama Bank"
                value={form.nama_bank}
                onChange={(e) =>
                  handleChange(
                    "nama_bank",
                    e.target.value,
                  )
                }
              />

              <Input
                label="Nomor Rekening"
                value={form.nomor_rekening}
                onChange={(e) =>
                  handleChange(
                    "nomor_rekening",
                    e.target.value,
                  )
                }
              />

              <Input
                label="Nama Rekening"
                value={form.nama_rekening}
                onChange={(e) =>
                  handleChange(
                    "nama_rekening",
                    e.target.value,
                  )
                }
              />
            </div>
          </section>

          {/* ======================================================
              INFORMASI COA
          ====================================================== */}

          <section className="rounded-lg border bg-gray-50 p-4">
            <h3 className="font-semibold text-sm mb-2">
              COA Vendor
            </h3>

            <p className="text-sm text-gray-600">
              COA vendor ditentukan otomatis oleh sistem.
              Vendor baru akan menggunakan COA default
              <strong> 12001 - Piutang Usaha</strong>.
            </p>
          </section>
        </div>

        {/* ========================================================
            BUTTON
        ======================================================== */}

        <div className="flex gap-3 mt-8">
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => router.push("/vendors")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            disabled={saving}
            onClick={handleSubmit}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Simpan
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
