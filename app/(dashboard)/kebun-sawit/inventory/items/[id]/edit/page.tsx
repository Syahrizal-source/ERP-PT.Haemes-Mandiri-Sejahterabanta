"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface ItemForm {
  name: string;
  category: string;
  unit: string;
  minimum_stock: number;
}

interface Item extends ItemForm {
  id: string;
}

export default function EditItemPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [form, setForm] = useState<ItemForm>({
    name: "",
    category: "",
    unit: "",
    minimum_stock: 0,
  });

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch("/api/kebun-sawit/items");

      if (!res.ok) return;

      const list: Item[] = await res.json();

      const found = list.find((item) => item.id === id);

      if (!found) return;

      setForm({
        name: found.name,
        category: found.category ?? "",
        unit: found.unit,
        minimum_stock: found.minimum_stock,
      });
    }

    fetchData();
  }, [id]);

  function handleChange<K extends keyof ItemForm>(
    field: K,
    value: ItemForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    const res = await fetch(`/api/kebun-sawit/items/${id}`, {
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
        text: "Gagal menyimpan items",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Update Items Berhasil",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push(`/kebun-sawit/inventory/items/${id}`);
      router.refresh();
    });
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Edit Item">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nama Item"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
          />

          <Input
            label="Kategori"
            value={form.category}
            onChange={(e) => handleChange("category", e.target.value)}
          />

          <Input
            label="Satuan"
            value={form.unit}
            onChange={(e) => handleChange("unit", e.target.value)}
          />

          <Input
            label="Minimum Stock"
            type="number"
            min={0}
            value={form.minimum_stock}
            onChange={(e) =>
              handleChange("minimum_stock", Number(e.target.value))
            }
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/kebun-sawit/inventory/items/${id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit}>
            <Save className="w-4 h-4 mr-2" />
            Update
          </Button>
        </div>
      </Card>
    </div>
  );
}
