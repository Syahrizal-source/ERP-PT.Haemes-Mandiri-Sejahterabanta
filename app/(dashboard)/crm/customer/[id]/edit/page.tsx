"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

/* =========================
   TYPE
========================= */
type CustomerForm = {
  nama: string;
  perusahaan: string;
  email: string;
  telp: string;
  alamat: string;
  industri: string;
};

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [form, setForm] = useState<CustomerForm>({
    nama: "",
    perusahaan: "",
    email: "",
    telp: "",
    alamat: "",
    industri: "",
  });

  /* =========================
     FETCH DATA
  ========================= */
  async function fetchData(): Promise<void> {
    const res = await fetch(`/api/crm/customer/${params.id}`);

    if (!res.ok) {
      setLoading(false);
      return;
    }

    const data = await res.json();

    setForm({
      nama: data.nama ?? "",
      perusahaan: data.perusahaan ?? "",
      email: data.email ?? "",
      telp: data.telp ?? "",
      alamat: data.alamat ?? "",
      industri: data.industri ?? "",
    });

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!form.nama) {
      Swal.fire("Error", "Nama wajib diisi", "error");
      return;
    }

    setSaving(true);

    const res = await fetch(`/api/crm/customer/${params.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nama: form.nama,
        perusahaan: form.perusahaan || null,
        email: form.email || null,
        telp: form.telp || null,
        alamat: form.alamat || null,
        industri: form.industri || null,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      Swal.fire("Error", "Gagal update customer", "error");
      return;
    }

    Swal.fire("Sukses", "Data berhasil diupdate", "success").then(() => {
      router.push(`/crm/customer/${params.id}`);
      router.refresh();
    });
  }

  if (loading) {
    return (
      <div className="flex gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Edit Customer">
        <div className="grid grid-cols-2 gap-4">
          <Input
            placeholder="Nama"
            value={form.nama}
            onChange={(e) => handleChange("nama", e.target.value)}
          />

          <Input
            placeholder="Perusahaan"
            value={form.perusahaan}
            onChange={(e) => handleChange("perusahaan", e.target.value)}
          />

          <Input
            placeholder="Email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
          />

          <Input
            placeholder="Telepon"
            value={form.telp}
            onChange={(e) => handleChange("telp", e.target.value)}
          />

          <Input
            placeholder="Alamat"
            value={form.alamat}
            onChange={(e) => handleChange("alamat", e.target.value)}
          />

          <Input
            placeholder="Industri"
            value={form.industri}
            onChange={(e) => handleChange("industri", e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() =>
              router.push(`/crm/customer/${params.id}`)
            }
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
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