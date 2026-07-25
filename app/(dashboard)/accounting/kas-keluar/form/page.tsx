"use client";

import { useState, useEffect } from "react";
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

interface KasKeluarForm {
  tanggal: string;
  no_bukti: string;
  tujuan: string;
  id_akun_kas: number;
  id_akun_beban: number;
  nominal: number;
  keterangan: string;
}

/* =========================
   PAGE
========================= */

export default function CreateKasKeluarPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState<boolean>(false);

  const [form, setForm] = useState<KasKeluarForm>({
    tanggal: "",
    no_bukti: "",
    tujuan: "",
    id_akun_kas: 0,
    id_akun_beban: 0,
    nominal: 0,
    keterangan: "",
  });

  const [coaList, setCoaList] = useState<Coa[]>([]);

  /* =========================
     HANDLE CHANGE
  ========================= */

  function handleChange<K extends keyof KasKeluarForm>(
    field: K,
    value: KasKeluarForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  /* =========================
     HITUNG PAJAK
  ========================= */

  const nominal: number = form.nominal;
  const ppn: number = nominal * 0.11;
  const pph23: number = nominal * 0.02;
  const total: number = nominal + ppn - pph23;

  /* =========================
     VALIDASI
  ========================= */

  const isInvalid: boolean =
    nominal <= 0 ||
    form.id_akun_kas === 0 ||
    form.id_akun_beban === 0 ||
    form.tanggal === "" ||
    form.no_bukti === "" ||
    form.tujuan === "";

  /* =========================
     SUBMIT
  ========================= */

  async function handleSubmit(): Promise<void> {
    setLoading(true);

    const res = await fetch("/api/kas-keluar", {
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
        text: "Gagal menyimpan kas keluar",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      icon: "success",
      title: "Kas Keluar Berhasil Masuk",
      text: result.message,
      confirmButtonText: "OK",
    }).then(() => {
      router.push("/accounting/kas-keluar");
      router.refresh();
    });
  }

  /* =========================
     FETCH COA
  ========================= */

  useEffect(() => {
    async function fetchCoa(): Promise<void> {
      const res = await fetch("/api/coa");

      if (!res.ok) return;

      const data: Coa[] = await res.json();
      setCoaList(data);
    }

    fetchCoa();
  }, []);

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Kas Keluar">
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            placeholder="No Bukti"
            value={form.no_bukti}
            onChange={(e) => handleChange("no_bukti", e.target.value)}
          />

          <Input
            placeholder="Tujuan"
            value={form.tujuan}
            onChange={(e) => handleChange("tujuan", e.target.value)}
          />

          {/* AKUN KAS */}
          <select
            className="border rounded p-2"
            value={form.id_akun_kas}
            onChange={(e) =>
              handleChange("id_akun_kas", Number(e.target.value))
            }
          >
            <option value={0}>-- Pilih Akun Kas --</option>

            {coaList.map((coa) => (
              <option key={coa.id_coa} value={coa.id_coa}>
                {coa.kode} - {coa.nama}
              </option>
            ))}
          </select>

          {/* AKUN BEBAN */}
          <select
            className="border rounded p-2"
            value={form.id_akun_beban}
            onChange={(e) =>
              handleChange("id_akun_beban", Number(e.target.value))
            }
          >
            <option value={0}>-- Pilih Akun Beban --</option>

            {coaList.map((coa) => (
              <option key={coa.id_coa} value={coa.id_coa}>
                {coa.kode} - {coa.nama}
              </option>
            ))}
          </select>

          <Input
            type="number"
            placeholder="Nominal"
            value={form.nominal}
            onChange={(e) => handleChange("nominal", Number(e.target.value))}
          />

          <Input
            className="col-span-2"
            placeholder="Keterangan"
            value={form.keterangan}
            onChange={(e) => handleChange("keterangan", e.target.value)}
          />
        </div>

        {/* =========================
           PREVIEW PAJAK
        ========================= */}

        <div className="mt-6 border rounded p-4 bg-gray-50 text-sm">
          <p>
            <strong>Nominal:</strong> {nominal.toLocaleString("id-ID")}
          </p>
          <p>
            <strong>PPN (11%):</strong> {ppn.toLocaleString("id-ID")}
          </p>
          <p className="text-red-600">
            <strong>PPh23 (2%):</strong> {pph23.toLocaleString("id-ID")}
          </p>
          <p className="font-semibold">
            <strong>Total:</strong> {total.toLocaleString("id-ID")}
          </p>
        </div>

        {/* =========================
           ACTION
        ========================= */}

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/accounting/kas-keluar")}
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
