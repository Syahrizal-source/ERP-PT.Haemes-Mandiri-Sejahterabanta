"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

import { invoiceSchema } from "@/lib/validators/invoice";

type InvoiceStatus =
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";

interface VendorItem {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
  status: boolean;
}

interface ProjectItem {
  id: string;
  kode_proyek: string;
  nama_proyek: string;
  customer: string;
  id_vendor: number | null;
  nilai_kontrak: number;
  status: string | null;
  vendor: VendorItem | null;
}

interface InvoiceForm {
  tanggal: string;
  no_invoice: string;
  id_proyek: string;
  persentase_termin: number;
  potongan_uang_muka: number;
  retensi_persen: number;
  ppn_persen: number;
  status: InvoiceStatus;
  tanggal_jatuh_tempo: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function parseVendor(value: unknown): VendorItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = toNumber(value.id);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  const namaVendor =
    typeof value.nama_vendor === "string"
      ? value.nama_vendor.trim()
      : "";

  if (!namaVendor) {
    return null;
  }

  let kodeVendor: string | null = null;

  if (typeof value.kode_vendor === "string") {
    kodeVendor = value.kode_vendor.trim() || null;
  }

  const status =
    typeof value.status === "boolean"
      ? value.status
      : false;

  return {
    id,
    kode_vendor: kodeVendor,
    nama_vendor: namaVendor,
    status,
  };
}

function parseProject(value: unknown): ProjectItem | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.id !== "string") {
    return null;
  }

  if (typeof value.kode_proyek !== "string") {
    return null;
  }

  if (typeof value.nama_proyek !== "string") {
    return null;
  }

  const customer =
    typeof value.customer === "string"
      ? value.customer.trim()
      : "";

  const idVendor =
    typeof value.id_vendor === "number"
      ? value.id_vendor
      : null;

  const nilaiKontrak = toNumber(value.nilai_kontrak);

  const status =
    typeof value.status === "string"
      ? value.status
      : null;

  const vendor = parseVendor(value.vendor);

  return {
    id: value.id,
    kode_proyek: value.kode_proyek.trim(),
    nama_proyek: value.nama_proyek.trim(),
    customer,
    id_vendor: idVendor,
    nilai_kontrak: nilaiKontrak,
    status,
    vendor,
  };
}

function parseProjectList(value: unknown): ProjectItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => parseProject(item))
    .filter(
      (item): item is ProjectItem => item !== null,
    );
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] =
    useState<boolean>(false);

  const [loadingProjects, setLoadingProjects] =
    useState<boolean>(true);

  const [projects, setProjects] =
    useState<ProjectItem[]>([]);

  const [selectedProject, setSelectedProject] =
    useState<ProjectItem | null>(null);

  const [form, setForm] = useState<InvoiceForm>({
    tanggal: "",
    no_invoice: "",
    id_proyek: "",
    persentase_termin: 0,
    potongan_uang_muka: 0,
    retensi_persen: 0,
    ppn_persen: 0,
    status: "Unpaid (Menunggu Pembayaran)",
    tanggal_jatuh_tempo: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadProjects(): Promise<void> {
      setLoadingProjects(true);

      try {
        /*
         * API /api/proyek/master mengembalikan:
         *
         * [
         *   {
         *     id,
         *     kode_proyek,
         *     nama_proyek,
         *     customer,
         *     id_vendor,
         *     nilai_kontrak,
         *     vendor: {...}
         *   }
         * ]
         *
         * Jadi response langsung diproses sebagai array.
         */
        const res = await fetch("/api/proyek/master", {
          method: "GET",
          cache: "no-store",
        });

        const result: unknown = await res.json();

        if (!res.ok) {
          let message =
            "Gagal mengambil data proyek.";

          if (isRecord(result)) {
            if (typeof result.error === "string") {
              message = result.error;
            } else if (
              typeof result.message === "string"
            ) {
              message = result.message;
            }
          }

          throw new Error(message);
        }

        const parsedProjects =
          parseProjectList(result);

        if (!cancelled) {
          setProjects(parsedProjects);
        }
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Gagal mengambil data proyek.";

        await Swal.fire({
          icon: "error",
          title: "Gagal Memuat Proyek",
          text: message,
        });
      } finally {
        if (!cancelled) {
          setLoadingProjects(false);
        }
      }
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange<K extends keyof InvoiceForm>(
    field: K,
    value: InvoiceForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleProjectChange(
    projectId: string,
  ): void {
    const project =
      projects.find(
        (item) => item.id === projectId,
      ) ?? null;

    setSelectedProject(project);

    setForm((prev) => ({
      ...prev,
      id_proyek: projectId,
    }));
  }

  async function handleSubmit(): Promise<void> {
    if (loading) {
      return;
    }

    /*
     * PENTING:
     *
     * Frontend HANYA mengirim parameter input.
     *
     * Frontend TIDAK mengirim:
     * - customer
     * - nominal
     * - nilai_kontrak
     * - nilai_tagihan_termin
     * - potongan_retensi
     * - subtotal_tagihan
     * - ppn_nilai
     * - total_neto
     *
     * Semua itu dihitung / ditentukan oleh backend.
     */

    const payload = {
      tanggal: form.tanggal,
      no_invoice: form.no_invoice.trim(),
      id_proyek: form.id_proyek,
      persentase_termin:
        form.persentase_termin,
      potongan_uang_muka:
        form.potongan_uang_muka,
      retensi_persen:
        form.retensi_persen,
      ppn_persen:
        form.ppn_persen,
      status: form.status,
      tanggal_jatuh_tempo:
        form.tanggal_jatuh_tempo.trim() === ""
          ? null
          : form.tanggal_jatuh_tempo,
    };

    const parsed =
      invoiceSchema.safeParse(payload);

    if (!parsed.success) {
      const firstError =
        parsed.error.issues[0]?.message ??
        "Data invoice tidak valid.";

      await Swal.fire({
        icon: "warning",
        title: "Data Belum Lengkap",
        text: firstError,
      });

      return;
    }

    if (!selectedProject) {
      await Swal.fire({
        icon: "warning",
        title: "Proyek Belum Dipilih",
        text: "Silakan pilih proyek terlebih dahulu.",
      });

      return;
    }

    /*
     * Customer/Vendor sudah melekat pada proyek.
     *
     * Tidak ada pemilihan vendor kedua di sini.
     */
    if (
      !selectedProject.id_vendor ||
      !selectedProject.customer
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Customer Proyek Tidak Valid",
        text:
          "Proyek belum memiliki Customer/Vendor yang valid. Periksa Master Proyek terlebih dahulu.",
      });

      return;
    }

    /*
     * Vendor yang ada pada proyek harus aktif.
     */
    if (
      selectedProject.vendor &&
      !selectedProject.vendor.status
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Vendor Tidak Aktif",
        text:
          "Vendor yang terhubung dengan proyek sudah tidak aktif.",
      });

      return;
    }

    if (
      !Number.isFinite(
        form.persentase_termin,
      ) ||
      form.persentase_termin <= 0 ||
      form.persentase_termin > 100
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Persentase Termin Tidak Valid",
        text:
          "Persentase termin harus lebih dari 0% dan maksimal 100%.",
      });

      return;
    }

    if (
      !Number.isFinite(
        form.potongan_uang_muka,
      ) ||
      form.potongan_uang_muka < 0
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Potongan Uang Muka Tidak Valid",
        text:
          "Potongan uang muka tidak boleh negatif.",
      });

      return;
    }

    if (
      !Number.isFinite(form.retensi_persen) ||
      form.retensi_persen < 0 ||
      form.retensi_persen > 100
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Retensi Tidak Valid",
        text:
          "Retensi harus berada antara 0% sampai 100%.",
      });

      return;
    }

    if (
      !Number.isFinite(form.ppn_persen) ||
      form.ppn_persen < 0 ||
      form.ppn_persen > 100
    ) {
      await Swal.fire({
        icon: "warning",
        title: "PPN Tidak Valid",
        text:
          "PPN harus berada antara 0% sampai 100%.",
      });

      return;
    }

    if (
      form.potongan_uang_muka >
      selectedProject.nilai_kontrak
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Potongan Uang Muka Tidak Valid",
        text:
          "Potongan uang muka tidak boleh melebihi nilai kontrak proyek.",
      });

      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        "/api/invoice",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result: unknown =
        await res.json();

      if (!res.ok) {
        let errorMessage =
          "Gagal menyimpan invoice.";

        if (isRecord(result)) {
          if (
            typeof result.error ===
            "string"
          ) {
            errorMessage = result.error;
          } else if (
            typeof result.message ===
            "string"
          ) {
            errorMessage = result.message;
          }
        }

        await Swal.fire({
          icon: "error",
          title: "Gagal Menyimpan",
          text: errorMessage,
        });

        return;
      }

      showToast(
        "Invoice dan jurnal berhasil dibuat.",
        "success",
      );

      await Swal.fire({
        position: "center",
        icon: "success",
        title: "Invoice Berhasil Masuk",
        text:
          "Invoice tersimpan dan perhitungan dilakukan oleh backend.",
        showConfirmButton: false,
        timer: 1800,
      });

      router.push(
        "/accounting/invoice",
      );

      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menyimpan invoice.";

      await Swal.fire({
        icon: "error",
        title: "Terjadi Kesalahan",
        text: message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Invoice Proyek">
        <div className="space-y-6">

          {/* =================================================
              INFORMASI INVOICE
          ================================================= */}
          <div>
            <h3 className="text-sm font-semibold mb-3">
              Informasi Invoice
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <Input
                label="Tanggal"
                type="date"
                value={form.tanggal}
                onChange={(e) =>
                  handleChange(
                    "tanggal",
                    e.target.value,
                  )
                }
                disabled={loading}
              />

              <Input
                label="No Invoice"
                value={form.no_invoice}
                onChange={(e) =>
                  handleChange(
                    "no_invoice",
                    e.target.value,
                  )
                }
                placeholder="Contoh: INV/PRJ/001/2026"
                disabled={loading}
              />

              <Input
                label="Jatuh Tempo"
                type="date"
                value={
                  form.tanggal_jatuh_tempo
                }
                onChange={(e) =>
                  handleChange(
                    "tanggal_jatuh_tempo",
                    e.target.value,
                  )
                }
                disabled={loading}
              />

              <div>
                <label className="block text-sm font-medium mb-1">
                  Status
                </label>

                <select
                  className="w-full border rounded p-2 bg-white disabled:bg-gray-100"
                  value={form.status}
                  onChange={(e) =>
                    handleChange(
                      "status",
                      e.target
                        .value as InvoiceStatus,
                    )
                  }
                  disabled={loading}
                >
                  <option value="Unpaid (Menunggu Pembayaran)">
                    Unpaid
                  </option>

                  <option value="Partial (Pembayaran Sebagian)">
                    Partial
                  </option>

                  <option value="Paid (Pembayaran Penuh/ Lunas)">
                    Paid
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* =================================================
              PILIH PROYEK
              CUSTOMER/VENDOR SUDAH MENJADI SATU DENGAN PROYEK
          ================================================= */}
          <div className="rounded-lg border p-4 bg-gray-50">
            <h3 className="text-sm font-semibold mb-3">
              Proyek & Customer
            </h3>

            <div>
              <label className="block text-sm font-medium mb-1">
                Proyek
              </label>

              <select
                className="w-full border rounded p-2 bg-white disabled:bg-gray-100"
                value={form.id_proyek}
                onChange={(e) =>
                  handleProjectChange(
                    e.target.value,
                  )
                }
                disabled={
                  loading ||
                  loadingProjects
                }
              >
                <option value="">
                  {loadingProjects
                    ? "Memuat proyek..."
                    : projects.length === 0
                      ? "Tidak ada proyek tersedia"
                      : "Pilih proyek"}
                </option>

                {projects.map((project) => (
                  <option
                    key={project.id}
                    value={project.id}
                  >
                    {project.kode_proyek} -{" "}
                    {project.nama_proyek}
                  </option>
                ))}
              </select>
            </div>

            {selectedProject && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">

                <div className="rounded border bg-white p-3">
                  <div className="text-xs text-gray-500">
                    Kode Proyek
                  </div>

                  <div className="font-semibold">
                    {
                      selectedProject.kode_proyek
                    }
                  </div>
                </div>

                <div className="rounded border bg-white p-3">
                  <div className="text-xs text-gray-500">
                    Nama Proyek
                  </div>

                  <div className="font-semibold">
                    {
                      selectedProject.nama_proyek
                    }
                  </div>
                </div>

                <div className="rounded border bg-white p-3">
                  <div className="text-xs text-gray-500">
                    Customer / Vendor
                  </div>

                  <div className="font-semibold">
                    {
                      selectedProject.customer ||
                      selectedProject.vendor
                        ?.nama_vendor ||
                      "-"
                    }
                  </div>
                </div>

                <div className="rounded border bg-white p-3 md:col-span-3">
                  <div className="text-xs text-gray-500">
                    Nilai Kontrak
                  </div>

                  <div className="text-lg font-semibold">
                    {formatRupiah(
                      selectedProject.nilai_kontrak,
                    )}
                  </div>
                </div>
              </div>
            )}

            {!selectedProject &&
              !loadingProjects && (
                <div className="mt-3 text-sm text-gray-500">
                  Pilih proyek. Customer/Vendor akan
                  otomatis mengikuti Customer/Vendor
                  yang sudah terhubung pada proyek.
                </div>
              )}
          </div>

          {/* =================================================
              TERMIN
          ================================================= */}
          <div>
            <h3 className="text-sm font-semibold mb-3">
              Tagihan Termin
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <Input
                label="Persentase Termin (%)"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={
                  form.persentase_termin
                }
                onChange={(e) =>
                  handleChange(
                    "persentase_termin",
                    Number(e.target.value),
                  )
                }
                disabled={loading}
              />

              <Input
                label="Potongan Uang Muka"
                type="number"
                min="0"
                step="0.01"
                value={
                  form.potongan_uang_muka
                }
                onChange={(e) =>
                  handleChange(
                    "potongan_uang_muka",
                    Number(e.target.value),
                  )
                }
                disabled={loading}
              />

              <Input
                label="Retensi (%)"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={
                  form.retensi_persen
                }
                onChange={(e) =>
                  handleChange(
                    "retensi_persen",
                    Number(e.target.value),
                  )
                }
                disabled={loading}
              />

              <Input
                label="PPN (%)"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.ppn_persen}
                onChange={(e) =>
                  handleChange(
                    "ppn_persen",
                    Number(e.target.value),
                  )
                }
                disabled={loading}
              />
            </div>
          </div>

          {/* =================================================
              INFO BACKEND
          ================================================= */}
          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold mb-2">
              Perhitungan Invoice
            </h3>

            <p className="text-sm text-gray-600">
              Nilai kontrak, customer/vendor,
              nilai tagihan termin, potongan retensi,
              subtotal, PPN, dan total netto
              ditentukan oleh backend. Form ini hanya
              mengirim parameter invoice.
            </p>

            {selectedProject && (
              <div className="mt-4 space-y-2 text-sm">

                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">
                    Nilai Kontrak
                  </span>

                  <span className="font-semibold">
                    {formatRupiah(
                      selectedProject.nilai_kontrak,
                    )}
                  </span>
                </div>

                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">
                    Termin
                  </span>

                  <span className="font-semibold">
                    {form.persentase_termin.toFixed(
                      2,
                    )}
                    %
                  </span>
                </div>

                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">
                    Potongan Uang Muka
                  </span>

                  <span className="font-semibold">
                    {formatRupiah(
                      form.potongan_uang_muka,
                    )}
                  </span>
                </div>

                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">
                    Retensi
                  </span>

                  <span className="font-semibold">
                    {form.retensi_persen.toFixed(
                      2,
                    )}
                    %
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">
                    PPN
                  </span>

                  <span className="font-semibold">
                    {form.ppn_persen.toFixed(
                      2,
                    )}
                    %
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* =================================================
              ACTION
          ================================================= */}
          <div className="flex gap-3 pt-2">

            <Button
              variant="secondary"
              onClick={() =>
                router.push(
                  "/accounting/invoice",
                )
              }
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>

            <Button
              onClick={() =>
                void handleSubmit()
              }
              disabled={
                loading ||
                loadingProjects ||
                !form.id_proyek
              }
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Simpan Invoice
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}