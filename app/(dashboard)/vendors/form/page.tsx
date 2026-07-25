"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
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
  nama_bank: string;
  nomor_rekening: string;
  nama_rekening: string;
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
    nama_bank: "",
    nomor_rekening: "",
    nama_rekening: "",
  });

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
    // simpan vendor
    const vendorRes = await fetch("/api/vendors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kode_vendor: form.kode_vendor,
        nama_vendor: form.nama_vendor,
        kategori_vendor: form.kategori_vendor,
        telepon: form.telepon,
        email: form.email,
        alamat: form.alamat,
      }),
    });

    if (!vendorRes.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan vendor",
      });
      return;
    }

    const vendor = await vendorRes.json();

    const vendorId: number = vendor.id;

    // simpan pajak (jika diisi)
    if (form.npwp.trim() !== "") {
      await fetch("/api/vendor-pajak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vendor_id: vendorId,
          npwp: form.npwp,
          nama_npwp: form.nama_npwp,
          alamat_npwp: form.alamat_npwp,
          pkp: form.pkp,
        }),
      });
    }

    // simpan rekening (jika diisi)
    if (form.nama_bank.trim() !== "" && form.nomor_rekening.trim() !== "") {
      await fetch("/api/vendor-rekening", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vendor_id: vendorId,
          nama_bank: form.nama_bank,
          nomor_rekening: form.nomor_rekening,
          nama_rekening: form.nama_rekening,
        }),
      });
    }

    Swal.fire({
      icon: "success",
      title: "Berhasil",
      text: "Vendor berhasil disimpan",
    }).then(() => {
      router.push("/vendors");
      router.refresh();
    });
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Tambah Vendor">
        <div className="grid grid-cols-2 gap-4">
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

          <h3 className="font-semibold text-lg mt-6 mb-4">Data Pajak</h3>

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

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.pkp}
              onChange={(e) => handleChange("pkp", e.target.checked)}
            />
            PKP
          </label>

          <h3 className="font-semibold text-lg mt-6 mb-4">Data Rekening</h3>

          <Input
            label="Nama Bank"
            value={form.nama_bank}
            onChange={(e) => handleChange("nama_bank", e.target.value)}
          />

          <Input
            label="Nomor Rekening"
            value={form.nomor_rekening}
            onChange={(e) => handleChange("nomor_rekening", e.target.value)}
          />

          <Input
            label="Nama Rekening"
            value={form.nama_rekening}
            onChange={(e) => handleChange("nama_rekening", e.target.value)}
          />

          <Input
            label="Kategori"
            value={form.kategori_vendor}
            onChange={(e) => handleChange("kategori_vendor", e.target.value)}
          />

          <Input
            label="Telepon"
            value={form.telepon}
            onChange={(e) => handleChange("telepon", e.target.value)}
          />

          <Input
            label="Email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
          />

          <Input
            label="Alamat"
            value={form.alamat}
            onChange={(e) => handleChange("alamat", e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={() => router.push("/vendors")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit}>
            <Save className="w-4 h-4 mr-2" />
            Simpan
          </Button>
        </div>
      </Card>
    </div>
  );
}
