"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Swal from 'sweetalert2';
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

export default function EditFertilizationPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    total_used: 0,
    labor_cost: 0,
    notes: "",
  });

  useEffect(() => {
    async function load(): Promise<void> {
      const res = await fetch(`/api/kebun-sawit/fertilizations/${params.id}`);

      const json = await res.json();

      setForm({
        total_used: json.total_used ?? 0,
        labor_cost: json.labor_cost,
        notes: json.notes ?? "",
      });
    }

    load();
  }, [params.id]);

  async function handleUpdate(): Promise<void> {
    const res = await fetch(`/api/kebun-sawit/fertilizations/${params.id}`, {
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
        text: "Gagal menyimpan fertilization",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Update Fertilization Berhasil",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/kebun-sawit/fertilizations");
      router.refresh();
    });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card title="Edit Fertilization">
        <div className="space-y-4">
          <div>
            <label>Total Used</label>
            <input
              type="number"
              className="w-full border px-3 py-2"
              value={form.total_used}
              onChange={(e) =>
                setForm({
                  ...form,
                  total_used: Number(e.target.value),
                })
              }
            />
          </div>

          <div>
            <label>Labor Cost</label>
            <input
              type="number"
              className="w-full border px-3 py-2"
              value={form.labor_cost}
              onChange={(e) =>
                setForm({
                  ...form,
                  labor_cost: Number(e.target.value),
                })
              }
            />
          </div>

          <div>
            <label>Catatan</label>
            <textarea
              className="w-full border px-3 py-2"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => router.back()}>
              Kembali
            </Button>

            <Button onClick={handleUpdate}>Update</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
