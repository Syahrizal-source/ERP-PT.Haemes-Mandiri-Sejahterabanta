"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type KasbonInput = {
  tanggal: string;
  no_voucher: string;
  deskripsi: string;
  debit: number;
};

export default function CreateKasbonDireksiPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState<boolean>(false);
  const [form, setForm] = useState<KasbonInput>({
    tanggal: "",
    no_voucher: "",
    deskripsi: "",
    debit: 0,
  });

  function handleChange(field: keyof KasbonInput, value: string): void {
    setForm((prev) => ({
      ...prev,
      [field]: field === "debit" ? Number(value) : value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    setLoading(true);

    const res = await fetch("/api/kasbon-direksi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, kredit: 0 }),
    });

    setLoading(false);

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal menyimpan kasbon direksi",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      icon: "success",
      title: "Kasbon Direksi Berhasil Masuk",
      text: result.message,
      confirmButtonText: "OK",
    }).then(() => {
      router.push("/accounting/kasbon-direksi");
      router.refresh();
    });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card title="Tambah Kasbon Direksi">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />
          <Input
            label="No Voucher"
            value={form.no_voucher}
            onChange={(e) => handleChange("no_voucher", e.target.value)}
          />
          <Input
            label="Deskripsi"
            value={form.deskripsi}
            onChange={(e) => handleChange("deskripsi", e.target.value)}
          />
          <Input
            label="Nilai"
            type="number"
            value={form.debit}
            onChange={(e) => handleChange("debit", e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
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
