"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface OperatorForm {
  nama: string;
  no_hp: string;
  sim: string;
  status: string;
}

export default function CreateOperatorPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState<boolean>(false);

  const [form, setForm] = useState<OperatorForm>({
    nama: "",
    no_hp: "",
    sim: "",
    status: "AKTIF",
  });

  function handleChange<K extends keyof OperatorForm>(
    field: K,
    value: OperatorForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    setLoading(true);

    const res = await fetch("/api/alat-berat/operator", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan operator",
      });
      return;
    }

    const result = await res.json();


    Swal.fire({
      position: "center",
      icon: "success",
      title: "Operator Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/alat-berat/operator");
      router.refresh();
    });
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Tambah Operator">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nama Operator"
            value={form.nama}
            onChange={(e) => handleChange("nama", e.target.value)}
          />

          <Input
            label="No HP"
            value={form.no_hp}
            onChange={(e) => handleChange("no_hp", e.target.value)}
          />

          <Input
            label="SIM"
            value={form.sim}
            onChange={(e) => handleChange("sim", e.target.value)}
          />

          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              className="w-full border rounded p-2"
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
            >
              <option value="AKTIF">AKTIF</option>
              <option value="NONAKTIF">NONAKTIF</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/alat-berat/operator")}
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
