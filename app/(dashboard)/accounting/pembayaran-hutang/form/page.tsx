"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/toast-context";

interface Hutang {
  id_hutang: number;
  supplier: string;
  no_invoice: string;
  nilai: number;
  terbayar: number;
  status: "UNPAID" | "PARTIAL" | "PAID";
}

interface FormState {
  tanggal: string;
  id_hutang: number;
  nominal: number;
  keterangan: string;
}

export default function Page() {
  const router = useRouter();
  const { showToast } = useToast();
  const [hutangList, setHutangList] = useState<Hutang[]>([]);

  const [form, setForm] = useState<FormState>({
    tanggal: "",
    id_hutang: 0,
    nominal: 0,
    keterangan: "",
  });

  const nominal = form.nominal;
  const ppn = nominal * 0.11;
  const pph23 = nominal * 0.02;
  const total = nominal + ppn - pph23;

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  useEffect(() => {
    async function fetchHutang(): Promise<void> {
      const res = await fetch("/api/hutang");
      const data: Hutang[] = await res.json();
      setHutangList(data);
    }

    fetchHutang();
  }, []);

  async function handleSubmit(): Promise<void> {
    if (total <= 0) {
      showToast("Total tidak valid", "error");
      return;
    }

    if (form.id_hutang === 0) {
      showToast("Pilih hutang terlebih dahulu", "error");
      return;
    }
    const res = await fetch("/api/pembayaran-hutang", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      showToast("Gagal menyimpan", "error");
      return;
    }

    showToast("Berhasil", "success");
    router.push("/accounting/pembayaran-hutang");
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Pembayaran Hutang">
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <select
            className="border rounded p-2"
            value={form.id_hutang}
            onChange={(e) => handleChange("id_hutang", Number(e.target.value))}
          >
            <option value={0}>-- Pilih Hutang --</option>

            {hutangList.map((h) => {
              const nilai = Number(h.nilai ?? 0);
              const terbayar = Number(h.terbayar ?? 0);
              const sisa = nilai - terbayar;

              return (
                <option key={h.id_hutang} value={h.id_hutang}>
                  {h.supplier} | {h.no_invoice} | Sisa:{" "}
                  {sisa.toLocaleString("id-ID")} | {h.status}
                </option>
              );
            })}
          </select>

          <Input
            type="number"
            placeholder="Nominal"
            value={form.nominal}
            onChange={(e) => handleChange("nominal", Number(e.target.value))}
          />

          <Input
            placeholder="Keterangan"
            value={form.keterangan}
            onChange={(e) => handleChange("keterangan", e.target.value)}
          />
        </div>

        <div className="mt-4 text-sm">
          <p>PPN: {ppn.toLocaleString("id-ID")}</p>
          <p>PPh23: {pph23.toLocaleString("id-ID")}</p>
          <p className="font-bold">
            Total Bayar: {total.toLocaleString("id-ID")}
          </p>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit}>
            <Save className="w-4 h-4 mr-2" />
            Simpan
          </Button>
        </div>
      </Card>
    </div>
  );
}
