"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
  status: boolean;
}

interface Vendor {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
  kategori_vendor: string | null;
  telepon: string | null;
  email: string | null;
  alamat: string | null;
  status: boolean;
}

export default function EditVendorPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [form, setForm] = useState<FormState>({
    kode_vendor: "",
    nama_vendor: "",
    kategori_vendor: "",
    telepon: "",
    email: "",
    alamat: "",
    status: true,
  });

  useEffect(() => {
    async function load(): Promise<void> {
      const res = await fetch(`/api/vendors/${id}`);

      if (!res.ok) return;

      const result = await res.json();

      const vendor: Vendor = result.vendor;

      setForm({
        kode_vendor: vendor.kode_vendor ?? "",
        nama_vendor: vendor.nama_vendor,
        kategori_vendor: vendor.kategori_vendor ?? "",
        telepon: vendor.telepon ?? "",
        email: vendor.email ?? "",
        alamat: vendor.alamat ?? "",
        status: vendor.status,
      });
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
    const res = await fetch(`/api/vendors/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    if (form.nama_vendor.trim() === "") {
      showToast("Nama vendor wajib diisi", "error");
      return;
    }

    if (form.kode_vendor.trim() === "") {
      showToast("Kode vendor wajib diisi", "error");
      return;
    }

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan vendors",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Update Vendors Berhasil",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push(`/vendors/${id}`);
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Edit Vendor">
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

          <label className="block text-sm font-medium mb-1">Kategori</label>

          <select
            className="w-full border rounded px-3 py-2"
            value={form.kategori_vendor}
            onChange={(e) => handleChange("kategori_vendor", e.target.value)}
          >
            <option value="">-- Pilih Kategori --</option>
            <option value="PEMASOK">Pemasok</option>
            <option value="PENERIMA_JASA">Penerima Jasa</option>
            <option value="SUBKONTRAKTOR">Subkontraktor</option>
          </select>

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
          <label className="block text-sm font-medium mb-1">Status</label>

          <select
            className="w-full border rounded px-3 py-2"
            value={form.status ? "true" : "false"}
            onChange={(e) => handleChange("status", e.target.value === "true")}
          >
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </select>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/vendors/${id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit}>
            <Save className="w-4 h-4 mr-2" />
            Update
          </Button>
        </div>
      </Card>
    </div>
  );
}
