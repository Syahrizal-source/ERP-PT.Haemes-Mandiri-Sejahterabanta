"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface FormState {
  id_payroll: number;
  nama: string;
  status_ptkp: string;
  gaji_bruto: number;
  thr: number;
  penghasilan_bruto: number;
  biaya_jabatan: number;
  iuran: number;
  tarif_pph21: number;
  tanggal: string;
}

interface PayrollOption {
  id: number;
  bulan: number;
  tahun: number;

  total_gaji: number;
  net_gaji: number;

  pegawai: {
    id: number;
    nama: string;
    divisi: string;
  };
}

export default function CreatePph21Page() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    id_payroll: 0,
    nama: "",
    status_ptkp: "TK",
    gaji_bruto: 0,
    thr: 0,
    penghasilan_bruto: 0,
    biaya_jabatan: 0,
    iuran: 0,
    tarif_pph21: 5,
    tanggal: "",
  });

  const [payrollList, setPayrollList] = useState<PayrollOption[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSelectPayroll(id: number): void {
    const selected = payrollList.find((p) => p.id === id);

    if (!selected) return;

    setForm((prev) => ({
      ...prev,
      id_payroll: id,
      nama: selected.pegawai.nama,
      status_ptkp: form.status_ptkp,
      gaji_bruto: selected.total_gaji ?? selected.net_gaji,
    }));
  }

  useEffect(() => {
    async function fetchPayroll(): Promise<void> {
      const res = await fetch("/api/payroll");
      if (!res.ok) return;

      const data: PayrollOption[] = await res.json();
      setPayrollList(data);
    }

    fetchPayroll();
  }, []);

  /* =========================
     HITUNG
  ========================= */

  const thr = Math.max(0, form.gaji_bruto * 0.1);

  const penghasilanBruto = Math.max(0, form.gaji_bruto + thr);

  const dasarPajak = Math.max(
    0,
    penghasilanBruto - form.biaya_jabatan - form.iuran,
  );

  const pajak = Math.max(0, dasarPajak * (form.tarif_pph21 / 100));

  async function handleSubmit(): Promise<void> {
    const res = await fetch("/api/pph21", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...form,
        status_ptkp: form.status_ptkp,
        thr,
        penghasilan_bruto: penghasilanBruto,
        nilai_pph21: pajak,
      }),
    });

    if (form.id_payroll <= 0) {
      Swal.fire("Error", "Silakan pilih payroll", "error");
      return;
    }

    if (!form.tanggal) {
      Swal.fire("Error", "Tanggal wajib diisi", "error");
      return;
    }

    const result = await res.json();

    if (!res.ok) {
      Swal.fire("Error", result.error, "error");
      return;
    }

    Swal.fire("Sukses", result.message, "success").then(() => {
      router.push("/pajak/pph21");
      router.refresh();
    });
  }

  return (
    <Card title="Tambah PPh21">
      <div className="grid grid-cols-2 gap-4">
        <select
          className="border rounded p-2 w-full"
          value={form.id_payroll}
          onChange={(e) => handleSelectPayroll(Number(e.target.value))}
        >
          <option value={0}>-- Pilih Payroll --</option>

          {payrollList.map((p) => (
            <option key={p.id} value={p.id}>
              {p.pegawai.nama} ({p.pegawai.divisi}) - {p.bulan}/{p.tahun} - Rp{" "}
              {p.total_gaji.toLocaleString("id-ID")}
            </option>
          ))}
        </select>

        <Input
          label="Nama"
          value={form.nama}
          onChange={(e) => handleChange("nama", e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium mb-1">Status PTKP</label>

          <select
            className="w-full border rounded px-3 py-2"
            value={form.status_ptkp}
            onChange={(e) => handleChange("status_ptkp", e.target.value)}
          >
            <option value="TK">TK</option>
            <option value="TK/1">TK/1</option>

            <option value="K/0">K/0</option>
            <option value="K/1">K/1</option>
            <option value="K/2">K/2</option>
            <option value="K/3">K/3</option>
            <option value="K/4">K/4</option>
            <option value="K/5">K/5</option>
            <option value="K/6">K/6</option>
          </select>
        </div>

        <Input
          label="Gaji Bruto"
          type="number"
          value={form.gaji_bruto}
          onChange={(e) => handleChange("gaji_bruto", Number(e.target.value))}
        />

        <Input
          label="Biaya Jabatan"
          type="number"
          value={form.biaya_jabatan}
          onChange={(e) =>
            handleChange("biaya_jabatan", Number(e.target.value))
          }
        />

        <Input
          label="Iuran"
          type="number"
          value={form.iuran}
          onChange={(e) => handleChange("iuran", Number(e.target.value))}
        />

        <Input
          label="Tarif (%)"
          type="number"
          value={form.tarif_pph21}
          onChange={(e) => handleChange("tarif_pph21", Number(e.target.value))}
        />

        <Input
          label="Tanggal"
          type="date"
          value={form.tanggal}
          onChange={(e) => handleChange("tanggal", e.target.value)}
        />
      </div>

      <div className="mt-4 rounded border p-4 bg-gray-50 space-y-1">
        <p>Gaji Bruto: {form.gaji_bruto.toLocaleString("id-ID")}</p>

        <p>THR (10%): {thr.toLocaleString("id-ID")}</p>

        <p>Penghasilan Bruto: {penghasilanBruto.toLocaleString("id-ID")}</p>

        <p>Dasar Pajak: {dasarPajak.toLocaleString("id-ID")}</p>

        <p className="font-semibold text-blue-600">
          PPh21: {pajak.toLocaleString("id-ID")}
        </p>
      </div>
      <div className="flex gap-3 mt-6">
        <Button variant="secondary" onClick={() => router.push("/pajak/pph21")}>
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
  );
}
