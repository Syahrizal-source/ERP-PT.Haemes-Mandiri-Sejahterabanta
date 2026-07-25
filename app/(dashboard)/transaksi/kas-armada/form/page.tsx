"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, ArrowLeft } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

import {
  kasArmadaSchema,
  type KasArmadaInput,
} from "@/lib/validators/kas-armada";

export default function CreateKasArmadaPage() {
  const router = useRouter();

  const [form, setForm] = useState<KasArmadaInput>({
    tanggal: "",
    sopir: "",
    penerimaan: 0,
    pengembalian: 0,
    pengeluaran: 0,
    kasbon: 0,
  });

  const [errorMessage, setErrorMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  /* =========================
     HITUNG (REALTIME)
  ========================= */
  const totalMasuk = form.penerimaan + form.pengembalian;

  const totalKeluar = form.pengeluaran + form.kasbon;

  const saldo = totalMasuk - totalKeluar;

  function handleChange(field: keyof typeof form, value: string) {
    const isNumberField =
      field === "penerimaan" ||
      field === "pengembalian" ||
      field === "pengeluaran" ||
      field === "kasbon";

    setForm((prev) => ({
      ...prev,
      [field]: isNumberField
        ? Math.max(0, Number(value) || 0) // ✅ PAKSA NUMBER
        : value,
    }));
  }

  async function handleSubmit(): Promise<void> {
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

    const res = await fetch("/api/kas-armada", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
    });

    const result = await res.json();

    setLoading(false);

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan kas armada",
      });
      return;
    }

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Kas Armada Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/transaksi/kas-armada");
      router.refresh();
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card title="Tambah Kas Armada">
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

          <div className="bg-gray-100 p-3">
            Masuk: {totalMasuk.toLocaleString()}
            <br />
            Keluar: {totalKeluar.toLocaleString()}
            <br />
            Saldo: {saldo.toLocaleString()}
          </div>

          {errorMessage && (
            <p className="text-red-600 text-sm">{errorMessage}</p>
          )}

          <div className="flex gap-3 mt-6">
            <Button
              variant="secondary"
              onClick={() => router.push("/transaksi/kas-armada")}
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
        </div>
      </Card>
    </div>
  );
}
