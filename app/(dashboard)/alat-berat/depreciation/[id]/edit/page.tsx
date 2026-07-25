"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";
import Input from "@/components/ui/Input";

interface DepreciationResponse {
  id: string;
  equipment_id: string | null;
  tanggal: string;
  nilai: number;
  id_jurnal: number | null;
}

interface DepreciationForm {
  equipment_id: string;
  tanggal: string;
  nilai: number;
}

export default function EditDepreciationPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [form, setForm] = useState<DepreciationForm>({
    equipment_id: "",
    tanggal: "",
    nilai: 0,
  });

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch(`/api/alat-berat/depreciation/${id}`);

      if (!res.ok) {
        showToast("Gagal mengambil data depreciation", "error");
        setLoading(false);
        return;
      }

      const data: DepreciationResponse = await res.json();

      setForm({
        equipment_id: data.equipment_id ?? "",
        tanggal: data.tanggal,
        nilai: data.nilai,
      });

      setLoading(false);
    }

    fetchData();
  }, [id, showToast]);

  function handleChange<K extends keyof DepreciationForm>(
    field: K,
    value: DepreciationForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    setSaving(true);

    const res = await fetch(`/api/alat-berat/depreciation/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    setSaving(false);

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan depreciation",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Update Depreciation Berhasil",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push(`/alat-berat/depreciation/${id}`);
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
      <Card title="Edit Depreciation">
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="date"
            className="border rounded p-2"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            type="number"
            className="border rounded p-2"
            value={form.nilai}
            onChange={(e) => handleChange("nilai", Number(e.target.value))}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/alat-berat/depreciation/${id}`)}
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
