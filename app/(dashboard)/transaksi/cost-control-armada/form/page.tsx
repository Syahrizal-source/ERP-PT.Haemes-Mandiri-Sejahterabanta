"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, ArrowLeft } from "lucide-react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface FormState {
  id_armada: number;
  tanggal: string;
  jenis_biaya: string;
  nominal: number;
}

export default function CreateCostControlPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    id_armada: 0,
    tanggal: "",
    jenis_biaya: "",
    nominal: 0,
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  function handleChange(field: keyof FormState, value: string): void {
    setForm((prev) => ({
      ...prev,
      [field]:
        field === "id_armada" || field === "nominal" ? Number(value) : value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    setError("");

    if (form.nominal < 0) {
      setError("Nominal tidak boleh minus");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/cost-control-armada", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Gagal menyimpan data");
      return;
    }

    router.push("/accounting/jurnal");
    router.refresh();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card title="Tambah Cost Control Armada">
        <div className="space-y-4">
          <Input
            label="ID Armada"
            type="number"
            value={form.id_armada}
            onChange={(e) => handleChange("id_armada", e.target.value)}
          />

          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            label="Jenis Biaya"
            value={form.jenis_biaya}
            onChange={(e) => handleChange("jenis_biaya", e.target.value)}
          />

          <Input
            label="Nominal"
            type="number"
            value={form.nominal}
            onChange={(e) => handleChange("nominal", e.target.value)}
          />

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => router.back()}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </Button>

            <Button onClick={handleSubmit} disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Simpan
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
