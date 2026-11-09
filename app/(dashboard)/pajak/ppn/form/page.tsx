"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface Vendor {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
  npwp: string | null;
  nama_npwp: string | null;
}

interface FormState {
  id_transaksi: number;
  vendor_id: number;
  npwp: string;
  nama_pkp: string;
  nomor_seri: string;
  keterangan: string;
  jenis_ppn: "masukan" | "keluaran";
  nilai_transaksi: number;
  nilai_dasar: number;
  tarif_ppn: number;
  tanggal_transaksi: string;
}

export default function CreatePPNPage(): React.JSX.Element {
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [form, setForm] = useState<FormState>({
    id_transaksi: 1,
    vendor_id: 0,
    npwp: "",
    nama_pkp: "",
    nomor_seri: "",
    keterangan: "",
    jenis_ppn: "masukan",
    nilai_transaksi: 0,
    nilai_dasar: 0,
    tarif_ppn: 11,
    tanggal_transaksi: "",
  });

  useEffect(() => {
    async function loadVendor(): Promise<void> {
      try {
        const res = await fetch("/api/vendors");

        if (!res.ok) {
          return;
        }

        const result: Vendor[] = await res.json();

        if (Array.isArray(result)) {
          setVendors(result);
        }
      } catch (error: unknown) {
        console.error("Gagal mengambil vendor:", error);
      }
    }

    void loadVendor();
  }, []);

  const selectedVendor: Vendor | null =
    vendors.find((vendor: Vendor) => vendor.id === form.vendor_id) ?? null;

  const nilaiPpn: number = Number(
    ((form.nilai_dasar * form.tarif_ppn) / 100).toFixed(2),
  );

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev: FormState) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleNumberChange(
    field: "nilai_transaksi" | "nilai_dasar" | "tarif_ppn",
    value: string,
  ): void {
    const numberValue: number = Math.max(0, Number(value) || 0);

    setForm((prev: FormState) => ({
      ...prev,
      [field]: numberValue,
    }));
  }

  async function handleSubmit(): Promise<void> {
    if (form.vendor_id <= 0) {
      await Swal.fire({
        icon: "warning",
        title: "Vendor belum dipilih",
        text: "Silakan pilih vendor terlebih dahulu.",
      });
      return;
    }

    if (form.nomor_seri.trim() === "") {
      await Swal.fire({
        icon: "warning",
        title: "Nomor seri kosong",
        text: "Silakan isi nomor seri faktur.",
      });
      return;
    }

    if (form.nilai_transaksi <= 0) {
      await Swal.fire({
        icon: "warning",
        title: "Nilai transaksi tidak valid",
        text: "Nilai transaksi harus lebih besar dari 0.",
      });
      return;
    }

    if (form.nilai_dasar <= 0) {
      await Swal.fire({
        icon: "warning",
        title: "DPP tidak valid",
        text: "Dasar pengenaan pajak harus lebih besar dari 0.",
      });
      return;
    }

    if (form.tanggal_transaksi.trim() === "") {
      await Swal.fire({
        icon: "warning",
        title: "Tanggal belum diisi",
        text: "Silakan isi tanggal transaksi.",
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        id_transaksi: form.id_transaksi,
        vendor_id: form.vendor_id,
        npwp: form.npwp.trim(),
        nama_pkp: form.nama_pkp.trim(),
        nomor_seri: form.nomor_seri.trim(),
        keterangan: form.keterangan.trim(),
        jenis_ppn: form.jenis_ppn,
        nilai_transaksi: form.nilai_transaksi,
        nilai_dasar: form.nilai_dasar,
        tarif_ppn: form.tarif_ppn,
        /*
         * Tetap boleh dikirim dari UI,
         * tetapi API menghitung ulang.
         */
        nilai_ppn: nilaiPpn,

        tanggal_transaksi: form.tanggal_transaksi,
      };

      const res = await fetch("/api/ppn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result: unknown = await res.json();

      if (!res.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Gagal menyimpan PPN";

        await Swal.fire({
          icon: "error",
          title: "Gagal",
          text: message,
        });

        return;
      }

      await Swal.fire({
        position: "center",
        icon: "success",
        title: "PPN berhasil disimpan",
        text: "Data PPN berhasil masuk.",
        showConfirmButton: false,
        timer: 1500,
      });

      router.push("/pajak/ppn");
      router.refresh();
    } catch (error: unknown) {
      console.error("PPN SUBMIT ERROR:", error);

      await Swal.fire({
        icon: "error",
        title: "Terjadi kesalahan",
        text:
          error instanceof Error
            ? error.message
            : "Gagal menyimpan transaksi PPN",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Tambah PPN">
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Jenis PPN</label>

            <select
              className="w-full rounded border px-3 py-2"
              value={form.jenis_ppn}
              onChange={(e) =>
                handleChange(
                  "jenis_ppn",
                  e.target.value as "masukan" | "keluaran",
                )
              }
            >
              <option value="masukan">Masukan</option>
              <option value="keluaran">Keluaran</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Vendor / PKP
            </label>

            <select
              className="w-full border rounded px-3 py-2"
              value={form.vendor_id}
              onChange={(e) => {
                const vendorId: number = Number(e.target.value);

                setForm((prev) => ({
                  ...prev,
                  vendor_id: vendorId,
                }));
              }}
            >
              <option value={0}>-- Pilih Vendor --</option>

              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.kode_vendor ?? "-"} - {vendor.nama_vendor}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="NPWP"
            value={form.npwp}
            placeholder="Masukkan NPWP secara manual"
            onChange={(e) => handleChange("npwp", e.target.value)}
          />

          <Input
            label="Nama Pengusaha Kena Pajak"
            value={form.nama_pkp}
            placeholder="Masukkan nama Pengusaha Kena Pajak"
            onChange={(e) => handleChange("nama_pkp", e.target.value)}
          />

          <Input
            label="Nomor Seri Faktur Pajak"
            placeholder="Contoh: 010.000-26.12345679"
            value={form.nomor_seri}
            onChange={(e) => handleChange("nomor_seri", e.target.value)}
          />

          <Input
            label="Tanggal Faktur Pajak"
            type="date"
            value={form.tanggal_transaksi}
            onChange={(e) => handleChange("tanggal_transaksi", e.target.value)}
          />

          <Input
            label="Nilai Transaksi"
            type="number"
            min="0"
            value={form.nilai_transaksi}
            onChange={(e) =>
              handleNumberChange("nilai_transaksi", e.target.value)
            }
          />

          <Input
            label="Dasar Pengenaan Pajak"
            type="number"
            min="0"
            value={form.nilai_dasar}
            onChange={(e) => handleNumberChange("nilai_dasar", e.target.value)}
          />

          <Input
            label="Tarif PPN (%)"
            type="number"
            min="0"
            value={form.tarif_ppn}
            onChange={(e) => handleNumberChange("tarif_ppn", e.target.value)}
          />

          <Input
            label="Keterangan Transaksi"
            placeholder="Contoh: Pembelian Material / SOLAR / BAN / SPAREPART"
            value={form.keterangan}
            onChange={(e) => handleChange("keterangan", e.target.value)}
          />
        </div>

        <div className="rounded-lg border bg-gray-50 p-4">
          <h3 className="mb-3 text-sm font-semibold">Ringkasan PPN</h3>

          <div className="space-y-2 text-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <span className="text-gray-600">Nilai Transaksi</span>

              <span className="font-semibold">
                Rp {form.nilai_transaksi.toLocaleString("id-ID")}
              </span>
            </div>

            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <span className="text-gray-600">Dasar Pengenaan Pajak</span>

              <span className="font-semibold">
                Rp {form.nilai_dasar.toLocaleString("id-ID")}
              </span>
            </div>

            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <span className="text-gray-600">Tarif PPN</span>

              <span className="font-semibold">{form.tarif_ppn}%</span>
            </div>

            <div className="mt-3 flex flex-col gap-1 border-t pt-3 sm:flex-row sm:justify-between">
              <span className="font-semibold">PPN Terutang</span>

              <span className="font-bold text-blue-600">
                Rp{" "}
                {nilaiPpn.toLocaleString("id-ID", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button
            variant="secondary"
            onClick={() => router.push("/pajak/ppn")}
            disabled={loading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>

          <Button onClick={() => void handleSubmit()} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Simpan
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
