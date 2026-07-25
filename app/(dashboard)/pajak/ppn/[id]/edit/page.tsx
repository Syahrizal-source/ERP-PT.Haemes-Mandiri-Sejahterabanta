"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/toast-context";

type FormType = {
  id_transaksi: number;
  jenis_ppn: "masukan" | "keluaran";
  nilai_dasar: number;
  tarif_ppn: number;
  tanggal_transaksi: string;
};

export default function EditPPNPage(): React.JSX.Element {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [form, setForm] = useState<FormType | null>(null);

  /* =========================
     FETCH DATA
  ========================= */
  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const res = await fetch(`/api/ppn/${id}`);

        if (!res.ok) {
          throw new Error("Gagal mengambil data");
        }

        const data = await res.json();

        setForm({
          id_transaksi: data.id_transaksi,
          jenis_ppn: data.jenis_ppn,
          nilai_dasar: Number(data.nilai_dasar),
          tarif_ppn: Number(data.tarif_ppn),
          tanggal_transaksi: data.tanggal_transaksi,
        });
      } catch {
        Swal.fire("Error", "Gagal mengambil data", "error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  /* =========================
     HANDLE CHANGE
  ========================= */
  function handleChange<K extends keyof FormType>(
    field: K,
    value: FormType[K],
  ): void {
    setForm((prev) => {
      if (!prev) return prev;

      const updated = { ...prev, [field]: value };

      if (field === "nilai_dasar" && Number(updated.nilai_dasar) < 0) {
        return prev;
      }

      if (field === "tarif_ppn" && Number(updated.tarif_ppn) < 0) {
        return prev;
      }

      return updated;
    });
  }

  /* =========================
     LOADING
  ========================= */
  if (loading) {
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="p-6 text-red-500 text-center">Data tidak ditemukan</div>
    );
  }

  /* =========================
     HITUNG PPN
  ========================= */
  const nilaiPpn = (form.nilai_dasar * form.tarif_ppn) / 100;

  const total = form.nilai_dasar + nilaiPpn;

  /* =========================
     SUBMIT
  ========================= */
  async function handleSubmit(): Promise<void> {
    setSaving(true);

    const res = await fetch(`/api/ppn/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...form,
        nilai_ppn: nilaiPpn,
      }),
    });

    const result = await res.json();

    setSaving(false);

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan ppn",
      });
      return;
    }

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Ppn Berhasil Update",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push(`/pajak/ppn/${id}`);
      router.refresh();
    });
  }

  return (
    <Card title="Edit PPN">
      {/* JENIS */}
      <select
        className="w-full border rounded px-3 py-2"
        value={form.jenis_ppn}
        onChange={(e) =>
          handleChange("jenis_ppn", e.target.value as "masukan" | "keluaran")
        }
      >
        <option value="masukan">Masukan</option>
        <option value="keluaran">Keluaran</option>
      </select>

      {/* NILAI DASAR */}
      <Input
        className="mb-3 gap-2"
        type="number"
        value={form.nilai_dasar}
        onChange={(e) =>
          handleChange("nilai_dasar", Math.max(0, Number(e.target.value)))
        }
      />

      {/* TARIF */}
      <Input
        className="mb-3 gap-2"
        type="number"
        value={form.tarif_ppn}
        onChange={(e) =>
          handleChange("tarif_ppn", Math.max(0, Number(e.target.value)))
        }
      />

      {/* TANGGAL */}
      <Input
        type="date"
        value={form.tanggal_transaksi}
        onChange={(e) => handleChange("tanggal_transaksi", e.target.value)}
      />

      {/* HASIL */}
      <p className="mt-4 text-blue-600 font-semibold">
        PPN: {Math.round(nilaiPpn).toLocaleString("id-ID")}
      </p>

      <p className="font-bold">
        Total: {Math.round(total).toLocaleString("id-ID")}
      </p>

      {/* BUTTON */}
      <div className="flex gap-2 mt-4">
        <Button
          variant="secondary"
          onClick={() => router.push(`/pajak/ppn/${id}`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </Button>

        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? (
            <Loader2 className="animate-spin w-4 h-4" />
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Update
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
