"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Swal from 'sweetalert2';
import Card from "@/components/ui/Card";
import { useToast } from "@/components/ui/toast-context";
import Input from "@/components/ui/Input";

export default function Page() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [form, setForm] = useState({
    tanggal: "",
    deskripsi: "",
    pihak: "",
    nominal: 0,
    bunga_persen: 0,
  });

  async function fetchData(): Promise<void> {
    const res = await fetch(`/api/pinjaman-non-bank/${id}`);

    const data = await res.json();

    setForm({
      tanggal: data.tanggal,
      deskripsi: data.deskripsi,
      pihak: data.pihak,
      nominal: data.nominal,
      bunga_persen: data.bunga_persen,
    });
  }

  useEffect(() => {
    fetchData();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(): Promise<void> {
    const res = await fetch(`/api/pinjaman-non-bank/${id}`, {
      method: "PUT",
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
      title: "Update Pinjaman Non Bank Berhasil",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/accounting/pinjaman-non-bank");
      router.refresh();
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card title="Edit Pinjaman">
        <div className="space-y-3">
          <Input
            type="date"
            value={form.tanggal}
            onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
            className="border p-2 w-full"
          />

          <Input
            value={form.pihak}
            onChange={(e) => setForm({ ...form, pihak: e.target.value })}
            className="border p-2 w-full"
          />

          <Input
            value={form.deskripsi}
            onChange={(e) =>
              setForm({
                ...form,
                deskripsi: e.target.value,
              })
            }
            className="border p-2 w-full"
          />

          <Input
            type="number"
            value={form.nominal}
            onChange={(e) =>
              setForm({
                ...form,
                nominal: Number(e.target.value),
              })
            }
            className="border p-2 w-full"
          />

          <Input
            type="number"
            value={form.bunga_persen}
            onChange={(e) =>
              setForm({
                ...form,
                bunga_persen: Number(e.target.value),
              })
            }
            className="border p-2 w-full"
          />

          <Button onClick={handleSubmit}>Update</Button>
        </div>
      </Card>
    </div>
  );
}
