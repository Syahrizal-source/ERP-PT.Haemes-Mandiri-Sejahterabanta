"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface ItemForm {
  name: string;
  category: string;
  unit: string;
  minimum_stock: number;
}

export default function CreateItemPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [form, setForm] = useState<ItemForm>({
    name: "",
    category: "",
    unit: "",
    minimum_stock: 0,
  });

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
    const res = await fetch("/api/kebun-sawit/items", {
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
        text: "Gagal menyimpan items",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Items Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/kebun-sawit/inventory/items");
      router.refresh();
    });
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Tambah Item">
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
            onClick={() => router.push("/kebun-sawit/inventory/items")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit}>
            <Save className="w-4 h-4 mr-2" />
            Simpan
          </Button>
        </div>
      </Card>
    </div>
  );
}
