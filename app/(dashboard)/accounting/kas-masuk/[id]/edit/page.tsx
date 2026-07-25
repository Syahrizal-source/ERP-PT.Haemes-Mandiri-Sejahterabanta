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

interface KasMasukForm {
  tanggal: string;
  no_bukti: string;
  sumber: string;
  id_akun_kas: number;
  id_akun_lawan: number;
  nominal: number;
  keterangan: string;
}

/* =========================
   PAGE
========================= */

export default function EditKasMasukPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [form, setForm] = useState<KasMasukForm>({
    tanggal: "",
    no_bukti: "",
    sumber: "",
    id_akun_kas: 0,
    id_akun_lawan: 0,
    nominal: 0,
    keterangan: "",
  });

  /* =========================
     FETCH
  ========================= */

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch(`/api/kas-masuk/${params.id}`);

      if (!res.ok) {
        showToast("Gagal mengambil data", "error");
        setLoading(false);
        return;
      }

      const data = await res.json();

      setForm({
        tanggal: data.tanggal,
        no_bukti: data.no_bukti,
        sumber: data.sumber,
        id_akun_kas: data.id_akun_kas,
        id_akun_lawan: data.id_akun_lawan,
        nominal: data.nominal,
        keterangan: data.keterangan,
      });

      setLoading(false);
    }

    fetchData();
  }, []);

  function handleChange<K extends keyof KasMasukForm>(
    field: K,
    value: KasMasukForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  /* =========================
     HITUNG
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

    const res = await fetch(`/api/kas-masuk/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);
    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal menyimpan kas masuk",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      icon: "success",
      title: "Update Kas Masuk Berhasil",
      text: result.message,
      confirmButtonText: "OK",
    }).then(() => {
      router.push("/accounting/kas-masuk");
      router.refresh();
    });
  }

  if (loading) {
    return (
      <div className="flex gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Edit Kas Masuk">
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
            value={form.sumber}
            onChange={(e) => handleChange("sumber", e.target.value)}
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
            value={form.id_akun_lawan}
            onChange={(e) =>
              handleChange("id_akun_lawan", Number(e.target.value))
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

        {/* Preview */}
        <div className="mt-6 border p-4 rounded bg-gray-50 text-sm">
          <p>Nominal: {nominal.toLocaleString("id-ID")}</p>
          <p>PPN: {ppn.toLocaleString("id-ID")}</p>
          <p className="text-red-600">PPh23: {pph23.toLocaleString("id-ID")}</p>
          <p className="font-semibold">
            Total: {total.toLocaleString("id-ID")}
          </p>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/accounting/kas-masuk/${params.id}`)}
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
