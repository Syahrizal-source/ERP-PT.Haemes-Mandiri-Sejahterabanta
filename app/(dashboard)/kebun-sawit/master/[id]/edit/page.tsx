"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Region {
  id: string;
  province_id: string;
  name: string;
}

interface RegionForm {
  province_id: string;
  name: string;
}

export default function EditRegionPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [form, setForm] = useState<RegionForm>({
    province_id: "",
    name: "",
  });

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch("/api/kebun-sawit/master");

      if (!res.ok) {
        showToast("Gagal mengambil data region", "error");
        setLoading(false);
        return;
      }

      const list: Region[] = await res.json();
      const data = list.find((r) => r.id === id);

      if (!data) {
        showToast("Region tidak ditemukan", "error");
        setLoading(false);
        return;
      }

      setForm({
        province_id: data.province_id,
        name: data.name,
      });

      setLoading(false);
    }

    fetchData();
  }, [id, showToast]);

  function handleChange<K extends keyof RegionForm>(
    field: K,
    value: RegionForm[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(): Promise<void> {
    if (!form.name.trim()) {
      showToast("Nama region wajib diisi", "error");
      return;
    }

    setSaving(true);

    const res = await fetch(`/api/kebun-sawit/master/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan master",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Update Master Berhasil",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/kebun-sawit/master");
      router.refresh();
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Edit Region Kebun">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Province ID"
            value={form.province_id}
            onChange={(e) => handleChange("province_id", e.target.value)}
          />

          <Input
            label="Nama Region"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/kebun-sawit/master")}
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
