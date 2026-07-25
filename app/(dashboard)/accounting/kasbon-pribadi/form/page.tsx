"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type KasbonPribadiInput = {
  tanggal: string;
  no_voucher: string;
  deskripsi: string;
  debit: number;
  kredit: number;
};

export default function CreateKasbonPribadiPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<KasbonPribadiInput>({
    tanggal: "",
    no_voucher: "",
    deskripsi: "",
    debit: 0,
    kredit: 0,
  });

  function handleChange(field: keyof KasbonPribadiInput, value: string): void {
    setForm((prev) => ({
      ...prev,
      [field]: field === "debit" || field === "kredit" ? Number(value) : value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    setLoading(true);

    const res = await fetch("/api/kasbon-pribadi", {
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
        title: "Gagal",
        text: "Gagal menyimpan kasbon pribadi",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      icon: "success",
      title: "Kasbon Pribadi Berhasil Masuk",
      text: result.message,
      confirmButtonText: "OK",
    }).then(() => {
      router.push("/accounting/kasbon-pribadi");
      router.refresh();
    });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card title="Tambah Kasbon Pribadi">
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
            label="Debit"
            type="number"
            value={form.debit}
            onChange={(e) => handleChange("debit", e.target.value)}
          />
          <Input
            label="Kredit"
            type="number"
            value={form.kredit}
            onChange={(e) => handleChange("kredit", e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/accounting/kasbon-pribadi")}
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
