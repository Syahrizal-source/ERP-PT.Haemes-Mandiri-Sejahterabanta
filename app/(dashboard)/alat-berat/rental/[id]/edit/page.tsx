"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";
import Input from "@/components/ui/Input";

interface RentalResponse {
  id: string;
  equipment_id: string | null;
  tanggal: string;
  id_proyek: string | null;
  customer: string | null;
  jam: number | null;
  harga_jam: number | null;
}

interface RentalForm {
  equipment_id: string;
  tanggal: string;
  id_proyek: string;
  customer: string;
  jam: number;
  harga_jam: number;
}

export default function EditRentalPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [form, setForm] = useState<RentalForm>({
    equipment_id: "",
    tanggal: "",
    id_proyek: "",
    customer: "",
    jam: 0,
    harga_jam: 0,
  });

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch(`/api/alat-berat/rental/${id}`);

      if (!res.ok) {
        showToast("Gagal mengambil data rental", "error");
        setLoading(false);
        return;
      }

      const data: RentalResponse = await res.json();

      setForm({
        equipment_id: data.equipment_id ?? "",
        tanggal: data.tanggal,
        id_proyek: data.id_proyek ?? "",
        customer: data.customer ?? "",
        jam: data.jam ?? 0,
        harga_jam: data.harga_jam ?? 0,
      });

      setLoading(false);
    }

    fetchData();
  }, [id, showToast]);

  function handleChange<K extends keyof RentalForm>(
    field: K,
    value: RentalForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  const subtotal = form.jam * form.harga_jam;
  const ppn = subtotal * 0.11;
  const pph23 = subtotal * 0.02;
  const total = subtotal + ppn - pph23;

  async function handleSubmit(): Promise<void> {
    setSaving(true);

    const payload = {
      ...form,
      subtotal,
      ppn,
      pph23,
      total,
    };

    const res = await fetch(`/api/alat-berat/rental/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan rental",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Update Rental Berhasil",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push(`/alat-berat/rental/${id}`);
      router.refresh();
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Edit Rental">
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="date"
            className="border rounded p-2"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            className="border rounded p-2"
            placeholder="Customer"
            value={form.customer}
            onChange={(e) => handleChange("customer", e.target.value)}
          />

          <Input
            type="number"
            className="border rounded p-2"
            value={form.jam}
            onChange={(e) => handleChange("jam", Number(e.target.value))}
          />

          <Input
            type="number"
            className="border rounded p-2"
            value={form.harga_jam}
            onChange={(e) => handleChange("harga_jam", Number(e.target.value))}
          />
        </div>

        <div className="mt-4 text-sm">
          <p>Subtotal: {subtotal}</p>
          <p>PPN: {ppn}</p>
          <p>PPh23: {pph23}</p>
          <p className="font-semibold">Total: {total}</p>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/alat-berat/rental/${id}`)}
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
