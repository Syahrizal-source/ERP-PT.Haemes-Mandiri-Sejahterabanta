"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, Loader2, ArrowLeft } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

import {
  kasArmadaSchema,
  type KasArmadaInput,
} from "@/lib/validators/kas-armada";

interface KasArmadaRow extends KasArmadaInput {
  id: number;
}

export default function EditKasArmadaPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [form, setForm] = useState<KasArmadaRow | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const response = await fetch(`/api/kas-armada/${params.id}`);
      if (!response.ok) {
        setErrorMessage("Data tidak ditemukan");
        return;
      }

      const data: KasArmadaRow = await response.json();
      setForm(data);
    }

    fetchData();
  }, [params.id]);

  function handleChange(field: keyof KasArmadaInput, value: string): void {
    if (!form) return;

    setForm({
      ...form,
      [field]: field === "tanggal" || field === "sopir" ? value : Number(value),
    });
  }

  async function handleUpdate(): Promise<void> {
    if (!form) return;

    setErrorMessage("");

    const parsed = kasArmadaSchema.safeParse(form);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      if (firstError) {
        setErrorMessage(firstError.message);
      }
      return;
    }

    setLoading(true);

    const response = await fetch(`/api/kas-armada/${params.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
    });

    setLoading(false);

    if (!response.ok) {
      setErrorMessage("Gagal mengupdate data");
      return;
    }

    router.push("/transaksi/kas-armada/form");
    router.refresh();
  }

  async function handleDelete(): Promise<void> {
    if (!form) return;

    const confirmDelete = confirm("Yakin ingin menghapus data ini?");
    if (!confirmDelete) return;

    setLoading(true);

    const response = await fetch(`/api/kas-armada/${params.id}`, {
      method: "DELETE",
    });

    setLoading(false);

    if (!response.ok) {
      setErrorMessage("Gagal menghapus data");
      return;
    }

    router.push("/transaksi/kas-armada/form");
    router.refresh();
  }

  if (!form) {
    return <div className="text-center py-10">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card title="Edit Kas Armada">
        <div className="space-y-4">
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            label="Sopir"
            value={form.sopir}
            onChange={(e) => handleChange("sopir", e.target.value)}
          />

          <Input
            label="Penerimaan"
            type="number"
            value={form.penerimaan}
            onChange={(e) => handleChange("penerimaan", e.target.value)}
          />

          <Input
            label="Pengembalian"
            type="number"
            value={form.pengembalian}
            onChange={(e) => handleChange("pengembalian", e.target.value)}
          />

          <Input
            label="Pengeluaran"
            type="number"
            value={form.pengeluaran}
            onChange={(e) => handleChange("pengeluaran", e.target.value)}
          />

          <Input
            label="Kasbon"
            type="number"
            value={form.kasbon}
            onChange={(e) => handleChange("kasbon", e.target.value)}
          />

          {errorMessage && (
            <p className="text-red-600 text-sm">{errorMessage}</p>
          )}

          <div className="pt-4 flex justify-between">
            <Button
              variant="secondary"
              onClick={() => router.push("/transaksi/kas-armada")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>

            <Button onClick={handleUpdate} disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Update
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
