"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/toast-context";

/* =========================
   TYPES
========================= */

type Divisi =
  | "DIREKSI"
  | "MANAGER"
  | "ACCOUNTING"
  | "PAJAK"
  | "PROYEK"
  | "ARMADA"
  | "KEBUN_SAWIT"
  | "ALAT_BERAT"
  | "PURCHASING";

type Status = "AKTIF" | "NONAKTIF";

interface PegawaiForm {
  nik: string;
  nama: string;
  divisi: Divisi;
  jabatan: string;
  gaji_pokok: number;
  tunjangan: number;
  status: Status;
}

/* =========================
   PAGE
========================= */

export default function EditPegawaiPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [form, setForm] = useState<PegawaiForm>({
    nik: "",
    nama: "",
    divisi: "ACCOUNTING",
    jabatan: "",
    gaji_pokok: 0,
    tunjangan: 0,
    status: "AKTIF",
  });

  /* =========================
     FETCH DATA
  ========================= */

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch(`/api/pegawai/${params.id}`);

      if (!res.ok) {
        showToast("Gagal mengambil data", "error");
        setLoading(false);
        return;
      }

      const data: PegawaiForm = await res.json();

      setForm({
        nik: data.nik,
        nama: data.nama,
        divisi: data.divisi,
        jabatan: data.jabatan,
        gaji_pokok: data.gaji_pokok,
        tunjangan: data.tunjangan,
        status: data.status,
      });

      setLoading(false);
    }

    fetchData();
  }, []);

  function handleChange<K extends keyof PegawaiForm>(
    field: K,
    value: PegawaiForm[K],
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
    setLoading(true);

    const res = await fetch(`/api/pegawai/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);
    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal menyimpan pegawai",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      icon: "success",
      title: "Update Pegawai Berhasil",
      text: result.message,
      confirmButtonText: "OK",
    }).then(() => {
      router.push("/accounting/pegawai");
      router.refresh();
    });
  }

  if (loading) {
    return (
      <div className="flex gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Edit Pegawai">
        <div className="grid grid-cols-2 gap-4">
          <Input
            value={form.nik}
            onChange={(e) => handleChange("nik", e.target.value)}
          />

          <Input
            value={form.nama}
            onChange={(e) => handleChange("nama", e.target.value)}
          />

          <select
            className="border rounded p-2"
            value={form.divisi}
            onChange={(e) => handleChange("divisi", e.target.value as Divisi)}
          >
            <option value="DIREKSI">Direksi</option>
            <option value="MANAGER">Manager</option>
            <option value="ACCOUNTING">Accounting</option>
            <option value="PAJAK">Pajak</option>
            <option value="PROYEK">Proyek</option>
            <option value="ARMADA">Armada</option>
            <option value="KEBUN_SAWIT">Kebun Sawit</option>
            <option value="ALAT_BERAT">Alat Berat</option>
            <option value="PURCHASING">Purchasing</option>
          </select>

          <Input
            value={form.jabatan}
            onChange={(e) => handleChange("jabatan", e.target.value)}
          />

          <Input
            type="number"
            value={form.gaji_pokok}
            onChange={(e) => handleChange("gaji_pokok", Number(e.target.value))}
          />

          <Input
            type="number"
            value={form.tunjangan}
            onChange={(e) => handleChange("tunjangan", Number(e.target.value))}
          />

          <select
            className="border rounded p-2"
            value={form.status}
            onChange={(e) => handleChange("status", e.target.value as Status)}
          >
            <option value="AKTIF">Aktif</option>
            <option value="NONAKTIF">Non Aktif</option>
          </select>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/accounting/pegawai/${params.id}`)}
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
