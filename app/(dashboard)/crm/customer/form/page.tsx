"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/toast-context";

/* =========================
   TYPES
========================= */
interface CustomerForm {
  nama: string;
  email: string;
  telp: string;
}

/* =========================
   PAGE
========================= */
export default function CreateCustomerPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState<boolean>(false);

  const [form, setForm] = useState<CustomerForm>({
    nama: "",
    email: "",
    telp: "",
  });

  /* =========================
     HANDLE CHANGE (GENERIC)
  ========================= */
  function handleChange<K extends keyof CustomerForm>(
    field: K,
    value: CustomerForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  /* =========================
     SUBMIT
  ========================= */
  async function handleSubmit(): Promise<void> {
    if (!form.nama || form.nama.trim() === "") {
      showToast("Nama wajib diisi", "error");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/crm/customer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nama: form.nama,
        email: form.email || null,
        telp: form.telp || null,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal menyimpan customer",
      });
      return;
    }

    const result: { id: string } = await res.json();

    Swal.fire({
      icon: "success",
      title: "Customer Berhasil Masuk",
      text: "Data berhasil disimpan",
      confirmButtonText: "OK",
    }).then(() => {
      router.push("/crm/customer");
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Customer">
        {/* =========================
            FORM GRID (SAMA PEGAWAI)
        ========================= */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            placeholder="Nama Customer"
            value={form.nama}
            onChange={(e) => handleChange("nama", e.target.value)}
          />

          <Input
            placeholder="Email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
          />

          <Input
            placeholder="No Telepon"
            value={form.telp}
            onChange={(e) => handleChange("telp", e.target.value)}
          />
        </div>

        {/* =========================
            ACTION BUTTON
        ========================= */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/crm/customer")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
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