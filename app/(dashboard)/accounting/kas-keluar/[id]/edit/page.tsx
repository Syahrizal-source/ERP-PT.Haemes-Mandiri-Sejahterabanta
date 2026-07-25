"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/toast-context";

/* =========================
   TYPES
========================= */

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

export default function EditKasKeluarPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [form, setForm] = useState<KasKeluarForm>({
    tanggal: "",
    no_bukti: "",
    tujuan: "",
    id_akun_kas: 0,
    id_akun_beban: 0,
    nominal: 0,
    keterangan: "",
  });

  /* =========================
     FETCH DATA
  ========================= */

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch(`/api/kas-keluar/${params.id}`);

      if (!res.ok) {
        showToast("Gagal mengambil data", "error");
        setLoading(false);
        return;
      }

      const data: {
        tanggal: string;
        no_bukti: string;
        tujuan: string;
        id_akun_kas: number;
        id_akun_beban: number;
        nominal: number;
        keterangan: string;
      } = await res.json();

      setForm({
        tanggal: data.tanggal,
        no_bukti: data.no_bukti,
        tujuan: data.tujuan,
        id_akun_kas: data.id_akun_kas,
        id_akun_beban: data.id_akun_beban,
        nominal: data.nominal,
        keterangan: data.keterangan,
      });

      setLoading(false);
    }

    fetchData();
  }, []);

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
     SUBMIT
  ========================= */

  async function handleSubmit(): Promise<void> {
    setLoading(true);

    const res = await fetch(`/api/kas-keluar/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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
      title: "Update Kas Keluar Berhasil",
      text: result.message,
      confirmButtonText: "OK",
    }).then(() => {
      router.push("/accounting/kas-keluar");
      router.refresh();
    });
  }

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <div className="flex gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Edit Kas Keluar">
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            value={form.no_bukti}
            onChange={(e) => handleChange("no_bukti", e.target.value)}
          />

          <Input
            value={form.tujuan}
            onChange={(e) => handleChange("tujuan", e.target.value)}
          />

          <Input
            type="number"
            value={form.id_akun_kas}
            onChange={(e) =>
              handleChange("id_akun_kas", Number(e.target.value))
            }
          />

          <Input
            type="number"
            value={form.id_akun_beban}
            onChange={(e) =>
              handleChange("id_akun_beban", Number(e.target.value))
            }
          />

          <Input
            type="number"
            value={form.nominal}
            onChange={(e) => handleChange("nominal", Number(e.target.value))}
          />

          <Input
            className="col-span-2"
            value={form.keterangan}
            onChange={(e) => handleChange("keterangan", e.target.value)}
          />
        </div>

        {/* =========================
           PREVIEW PAJAK
        ========================= */}

        <div className="mt-6 border p-4 rounded bg-gray-50 text-sm">
          <p>Nominal: {nominal.toLocaleString("id-ID")}</p>
          <p>PPN: {ppn.toLocaleString("id-ID")}</p>
          <p className="text-red-600">PPh23: {pph23.toLocaleString("id-ID")}</p>
          <p className="font-semibold">
            Total: {total.toLocaleString("id-ID")}
          </p>
        </div>

        {/* =========================
           ACTION
        ========================= */}

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/accounting/kas-keluar/${params.id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Update
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
