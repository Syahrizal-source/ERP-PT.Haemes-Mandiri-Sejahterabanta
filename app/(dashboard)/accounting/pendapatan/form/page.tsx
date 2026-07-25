"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/toast-context";

/* =========================
   TYPES
========================= */

interface Coa {
  id_coa: number;
  kode: string;
  nama: string;
}

interface PendapatanForm {
  tanggal: string;
  id_coa: number;
  nominal: number;
  ppn: number;
  pph23: number;
  keterangan: string;
}

/* =========================
   PAGE
========================= */

export default function CreatePendapatanPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState<boolean>(false);
  const [coas, setCoas] = useState<Coa[]>([]);

  const [form, setForm] = useState<PendapatanForm>({
    tanggal: "",
    id_coa: 0,
    nominal: 0,
    ppn: 0,
    pph23: 0,
    keterangan: "",
  });

  /* =========================
     FETCH COA
  ========================= */

  useEffect(() => {
    async function fetchCoa(): Promise<void> {
      const res = await fetch("/api/coa");

      if (!res.ok) return;

      const data: Coa[] = await res.json();

      setCoas(data);
    }

    fetchCoa();
  }, []);

  /* =========================
     HANDLE CHANGE
  ========================= */

  function handleChange<K extends keyof PendapatanForm>(
    field: K,
    value: PendapatanForm[K],
  ): void {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };

      /* AUTO HITUNG */
      const nominal = Number(updated.nominal) || 0;

      const ppn = nominal * 0.11;
      const pph23 = nominal * 0.02;

      return {
        ...updated,
        ppn,
        pph23,
      };
    });
  }

  /* =========================
     TOTAL
  ========================= */

  const total: number = form.nominal + form.ppn - form.pph23;

  /* =========================
     SUBMIT
  ========================= */

  async function handleSubmit(): Promise<void> {
    setLoading(true);

    const res = await fetch("/api/pendapatan", {
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
        text: "Gagal menyimpan pendapatan",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Pendapatan Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/accounting/pendapatan");
      router.refresh();
    });
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Pendapatan">
        <div className="grid grid-cols-2 gap-4">
          {/* COA */}
          <select
            className="border rounded p-2"
            value={form.id_coa}
            onChange={(e) => handleChange("id_coa", Number(e.target.value))}
          >
            <option value={0}>-- Pilih COA Pendapatan --</option>

            {coas.map((c) => (
              <option key={c.id_coa} value={c.id_coa}>
                {c.kode} - {c.nama}
              </option>
            ))}
          </select>

          {/* TANGGAL */}
          <Input
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          {/* NOMINAL */}
          <Input
            type="number"
            placeholder="Nominal"
            value={form.nominal}
            onChange={(e) => handleChange("nominal", Number(e.target.value))}
          />

          {/* PPN */}
          <Input type="number" value={form.ppn} disabled />

          {/* PPH23 */}
          <Input type="number" value={form.pph23} disabled />

          {/* KETERANGAN */}
          <Input
            placeholder="Keterangan"
            value={form.keterangan}
            onChange={(e) => handleChange("keterangan", e.target.value)}
          />
        </div>

        {/* SUMMARY */}
        <div className="mt-6 text-sm space-y-1">
          <p>Nominal: {form.nominal.toLocaleString("id-ID")}</p>
          <p>PPN (11%): {form.ppn.toLocaleString("id-ID")}</p>
          <p>PPh23 (2%): {form.pph23.toLocaleString("id-ID")}</p>
          <p className="font-semibold text-lg">
            Total: {total.toLocaleString("id-ID")}
          </p>
        </div>

        {/* ACTION */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/accounting/pendapatan")}
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
