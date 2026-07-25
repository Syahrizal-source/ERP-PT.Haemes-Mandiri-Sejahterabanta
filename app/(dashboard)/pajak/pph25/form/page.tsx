"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface FormState {
  tahun: number;
  bulan: number;
  nilai_angsuran: number;
  tanggal_transaksi: string;
  keterangan: string;
}

export default function CreatePph25Page() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    tahun: new Date().getFullYear(),
    bulan: new Date().getMonth() + 1,
    nilai_angsuran: 0,
    tanggal_transaksi: "",
    keterangan: "",
  });

  const nilai = Math.max(0, form.nilai_angsuran);

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(): Promise<void> {
    const res = await fetch("/api/pph25", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const result = await res.json();

    if (!res.ok) {
      Swal.fire("Error", result.error, "error");
      return;
    }

    Swal.fire("Sukses", result.message, "success").then(() => {
      router.push("/pajak/pph25");
      router.refresh();
    });
  }

  return (
    <Card title="Tambah PPh25">
      <div className="grid grid-cols-2 gap-4">
        {/* TAHUN */}
        <Input
          label="Tahun"
          type="number"
          value={form.tahun}
          onChange={(e) => handleChange("tahun", Number(e.target.value))}
        />

        {/* BULAN */}
        <div>
          <label className="text-sm">Bulan</label>
          <select
            className="w-full border p-2 rounded"
            value={form.bulan}
            onChange={(e) => handleChange("bulan", Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Nilai Angsuran"
          type="number"
          value={form.nilai_angsuran}
          onChange={(e) =>
            handleChange("nilai_angsuran", Number(e.target.value))
          }
        />

        <Input
          label="Tanggal Transaksi"
          type="date"
          value={form.tanggal_transaksi}
          onChange={(e) => handleChange("tanggal_transaksi", e.target.value)}
        />

        <Input
          label="Keterangan"
          value={form.keterangan}
          onChange={(e) => handleChange("keterangan", e.target.value)}
        />
      </div>

      <div className="mt-4 text-sm">
        <p>Nilai PPh25: {nilai.toLocaleString("id-ID")}</p>
      </div>

      <Button className="mt-4" onClick={handleSubmit}>
        Simpan
      </Button>
    </Card>
  );
}
