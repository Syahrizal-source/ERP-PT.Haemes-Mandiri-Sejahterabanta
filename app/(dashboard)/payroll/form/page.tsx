"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";
import Input from "@/components/ui/Input";

/* =========================
   TYPES
========================= */

interface Pegawai {
  id: number;
  nama: string;
  divisi: string;
  gaji_pokok: number;
  tunjangan: number;
}

interface PayrollForm {
  bulan: number;
  tahun: number;
  id_pegawai: number;
  total_potongan: number;
}

/* =========================
   PAGE
========================= */

export default function CreatePayrollPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState<boolean>(false);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [selectedPegawai, setSelectedPegawai] = useState<Pegawai | null>(null);

  const [form, setForm] = useState<PayrollForm>({
    bulan: 1,
    tahun: 2026,
    id_pegawai: 0,
    total_potongan: 0,
  });

  /* =========================
     FETCH PEGAWAI
  ========================= */

  useEffect(() => {
    async function fetchPegawai(): Promise<void> {
      try {
        const [resPegawai, resKebun] = await Promise.all([
          fetch("/api/pegawai"),
          fetch("/api/kebun-sawit/employees"),
        ]);

        const dataPegawai: Pegawai[] = resPegawai.ok
          ? await resPegawai.json()
          : [];

        const dataKebunRaw: {
          id: number;
          nama: string;
          gaji: number;
        }[] = resKebun.ok ? await resKebun.json() : [];

        /* =========================
         NORMALISASI KEBUN SAWIT
      ========================= */

        const dataKebun: Pegawai[] = dataKebunRaw.map((k) => ({
          id: k.id,
          nama: k.nama,
          divisi: "KEBUN_SAWIT",
          gaji_pokok: k.gaji,
          tunjangan: 0,
        }));

        /* =========================
         GABUNG
      ========================= */

        const combined: Pegawai[] = [...dataPegawai, ...dataKebun];

        setPegawaiList(combined);
      } catch (error) {
        console.error("Fetch error:", error);
      }
    }

    fetchPegawai();
  }, []);

  /* =========================
     HANDLE CHANGE
  ========================= */

  function handleChange<K extends keyof PayrollForm>(
    field: K,
    value: PayrollForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleSelectPegawai(id: number): void {
    handleChange("id_pegawai", id);

    const found = pegawaiList.find((p) => p.id === id) || null;
    setSelectedPegawai(found);
  }

  /* =========================
     HITUNG OTOMATIS
  ========================= */

  const gaji: number = selectedPegawai?.gaji_pokok ?? 0;
  const tunjangan: number = selectedPegawai?.tunjangan ?? 0;

  const pph21: number = gaji * 0.05;
  const bpjs: number = gaji * 0.02;

  const net: number = gaji + tunjangan - form.total_potongan - pph21 - bpjs;

  /* =========================
     SUBMIT
  ========================= */

  async function handleSubmit(): Promise<void> {
    if (form.id_pegawai === 0) {
      showToast("Pilih pegawai terlebih dahulu", "error");
      return;
    }

    if (net < 0) {
      showToast("Net gaji tidak valid", "error");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/payroll", {
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
        text: "Gagal menyimpan payroll",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Payroll Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/payroll");
      router.refresh();
    });
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Payroll">
        <div className="grid grid-cols-2 gap-4">
          {/* BULAN */}
          <div>
            <label className="text-sm font-medium">Bulan</label>
            <Input
              type="number"
              value={form.bulan}
              onChange={(e) => handleChange("bulan", Number(e.target.value))}
            />
          </div>

          {/* TAHUN */}
          <div>
            <label className="text-sm font-medium">Tahun</label>
            <Input
              type="number"
              value={form.tahun}
              onChange={(e) => handleChange("tahun", Number(e.target.value))}
            />
          </div>

          {/* PEGAWAI (DROPDOWN) */}
          <div className="col-span-2">
            <label className="text-sm font-medium">Pilih Pegawai</label>
            <select
              className="border rounded p-2 w-full"
              value={form.id_pegawai}
              onChange={(e) => handleSelectPegawai(Number(e.target.value))}
            >
              <option value={0}>-- Pilih Pegawai --</option>

              {pegawaiList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama} - {p.divisi}
                </option>
              ))}
            </select>
          </div>

          {/* INFO OTOMATIS */}
          {selectedPegawai && (
            <>
              <div>
                <label className="text-sm">Gaji Pokok</label>
                <Input value={gaji} disabled />
              </div>

              <div>
                <label className="text-sm">Tunjangan</label>
                <Input value={tunjangan} disabled />
              </div>
            </>
          )}

          {/* POTONGAN */}
          <div>
            <label className="text-sm font-medium">Total Potongan</label>
            <Input
              type="number"
              value={form.total_potongan}
              onChange={(e) =>
                handleChange("total_potongan", Number(e.target.value))
              }
            />
          </div>
        </div>

        {/* PREVIEW */}
        <div className="mt-4 text-sm space-y-1">
          <p>PPH21 (5%): {pph21.toLocaleString("id-ID")}</p>
          <p>BPJS (2%): {bpjs.toLocaleString("id-ID")}</p>
          <p className="font-semibold">
            Net Gaji: {net.toLocaleString("id-ID")}
          </p>
        </div>

        {/* ACTION */}
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={() => router.push("/payroll")}>
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
