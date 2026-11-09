"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface HutangInput {
  supplier: string;
  no_invoice: string;
  tanggal: string;
  jatuh_tempo: string;
  nilai: number;
  status:
    | "Unpaid (Menunggu Pembayaran)"
    | "Partial (Pembayaran Sebagian)"
    | "Paid (Pembayaran Penuh/ Lunas)";
}

export default function CreateHutangPage() {
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(false);

  const [form, setForm] = useState<HutangInput>({
    supplier: "",
    no_invoice: "",
    tanggal: "",
    jatuh_tempo: "",
    nilai: 0,
    status: "Unpaid (Menunggu Pembayaran)",
  });

  function handleChange(field: keyof HutangInput, value: string): void {
    setForm((prev) => ({
      ...prev,
      [field]: field === "nilai" ? Number(value) : value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/hutang", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Gagal menyimpan hutang.";

        await Swal.fire({
          icon: "error",
          title: "Gagal",
          text: message,
        });

        return;
      }

      const message =
        typeof result === "object" &&
        result !== null &&
        "message" in result &&
        typeof result.message === "string"
          ? result.message
          : "Hutang berhasil disimpan dan jurnal telah dibuat.";

      await Swal.fire({
        icon: "success",
        title: "Hutang Berhasil Disimpan",
        text: message,
        confirmButtonText: "OK",
      });

      router.push("/accounting/hutang");
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menyimpan hutang.";

      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Card title="Tambah Hutang">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Supplier"
            value={form.supplier}
            onChange={(event) => handleChange("supplier", event.target.value)}
          />

          <Input
            label="No Invoice"
            value={form.no_invoice}
            onChange={(event) => handleChange("no_invoice", event.target.value)}
          />

          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(event) => handleChange("tanggal", event.target.value)}
          />

          <Input
            label="Jatuh Tempo"
            type="date"
            value={form.jatuh_tempo}
            onChange={(event) =>
              handleChange("jatuh_tempo", event.target.value)
            }
          />

          <Input
            label="Nilai"
            type="number"
            min="0"
            value={form.nilai}
            onChange={(event) => handleChange("nilai", event.target.value)}
          />
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push("/accounting/hutang")}
            disabled={loading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>

          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Simpan
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
