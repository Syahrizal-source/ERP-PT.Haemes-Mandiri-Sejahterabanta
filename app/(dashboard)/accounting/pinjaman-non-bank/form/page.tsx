"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Swal from 'sweetalert2';
import Card from "@/components/ui/Card";
import { useToast } from "@/components/ui/toast-context";
import Input from "@/components/ui/Input";

/* ========================= */

type FormType = {
  tanggal: string;
  deskripsi: string;
  pihak: string;
  nominal: number;
  bunga_persen: number;
};

export default function Page(): React.JSX.Element {
  const router = useRouter();
  const { showToast } = useToast();

  const [form, setForm] = useState<FormType>({
    tanggal: "",
    deskripsi: "",
    pihak: "",
    nominal: 0,
    bunga_persen: 0,
  });

  const [loading, setLoading] = useState<boolean>(false);

  const totalBunga = (form.nominal * form.bunga_persen) / 100;
  const total = form.nominal + totalBunga;

  async function handleSubmit(): Promise<void> {
    if (total <= 0) {
      showToast("Total tidak valid", "error");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/pinjaman-non-bank", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: "Gagal menyimpan pinjaman non bank",
        });
        return;
      }

      const result = await res.json();

      Swal.fire({
        position: "center",
        icon: "success",
        title: "Pinjaman Non Bank Berhasil Masuk",
        text: result.message,
        showConfirmButton: false,
        timer: 1500,
      }).then(() => {
        router.push("/accounting/pinjaman-non-bank");
        router.refresh();
      });
    } catch {
      showToast("Gagal menyimpan", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card title="Tambah Pinjaman">
        <div className="space-y-4">

          <Input
            type="date"
            value={form.tanggal}
            onChange={(e) =>
              setForm({ ...form, tanggal: e.target.value })
            }
          />

          <Input
            placeholder="Pihak"
            value={form.pihak}
            onChange={(e) =>
              setForm({ ...form, pihak: e.target.value })
            }
          />

          <Input
            placeholder="Deskripsi"
            value={form.deskripsi}
            onChange={(e) =>
              setForm({ ...form, deskripsi: e.target.value })
            }
          />

          <Input
            type="number"
            placeholder="Nominal"
            value={form.nominal}
            onChange={(e) =>
              setForm({
                ...form,
                nominal: Number(e.target.value) || 0,
              })
            }
          />

          <Input
            type="number"
            placeholder="Bunga (%)"
            value={form.bunga_persen}
            onChange={(e) =>
              setForm({
                ...form,
                bunga_persen: Number(e.target.value) || 0,
              })
            }
          />

          <div className="bg-gray-50 p-3 rounded text-sm">
            <p>Bunga: {totalBunga.toLocaleString("id-ID")}</p>
            <p>Total: {total.toLocaleString("id-ID")}</p>
          </div>

          <Button onClick={handleSubmit} disabled={loading}>
            Simpan
          </Button>

        </div>
      </Card>
    </div>
  );
}