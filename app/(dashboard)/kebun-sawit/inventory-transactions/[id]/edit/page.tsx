"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface FormState {
  quantity: number;
  unit_price: number;
  notes: string;
}

export default function EditInventoryTransactionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState<FormState>({
    quantity: 0,
    unit_price: 0,
    notes: "",
  });

  useEffect(() => {
    async function load(): Promise<void> {
      const res = await fetch(`/api/kebun-sawit/inventory-transactions/${id}`);

      const data = await res.json();

      setForm({
        quantity: Number(data.quantity),
        unit_price: Number(data.unit_price),
        notes: data.notes ?? "",
      });
    }

    load();
  }, [id]);

  async function handleSubmit(): Promise<void> {
    await fetch(`/api/kebun-sawit/inventory-transactions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    router.push("/kebun-sawit/inventory-transactions");
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card title="Edit Inventory Transaction">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Quantity"
            type="number"
            value={form.quantity}
            onChange={(e) =>
              setForm({
                ...form,
                quantity: Number(e.target.value),
              })
            }
          />

          <Input
            label="Unit Price"
            type="number"
            value={form.unit_price}
            onChange={(e) =>
              setForm({
                ...form,
                unit_price: Number(e.target.value),
              })
            }
          />
        </div>

        <div className="mt-6">
          <Input
            label="Catatan"
            value={form.notes}
            onChange={(e) =>
              setForm({
                ...form,
                notes: e.target.value,
              })
            }
          />
        </div>

        <div className="flex gap-3 mt-8">
          <Button
            variant="secondary"
            onClick={() => router.push("/kebun-sawit/inventory-transactions")}
          >
            Kembali
          </Button>

          <Button onClick={handleSubmit}>Update</Button>
        </div>
      </Card>
    </div>
  );
}
