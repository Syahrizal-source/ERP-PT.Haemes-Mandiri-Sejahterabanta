"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Item {
  id: string;
  name: string;
}

interface Block {
  id: string;
  code: string;
}

export default function InventoryTransactionForm() {
  const router = useRouter();
  const { showToast } = useToast();

  const [items, setItems] = useState<Item[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);

  const [form, setForm] = useState({
    item_id: "",
    block_id: "",
    transaction_date: "",
    transaction_type: "IN",
    quantity: 0,
    unit_price: 0,
    ppn: 0,
    pph23: 0,
    pph4: 0,
    reference_module: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/kebun-sawit/items")
      .then((r) => r.json())
      .then((d: Item[]) => setItems(d));

    fetch("/api/kebun-sawit/blocks")
      .then((r) => r.json())
      .then((d: Block[]) => setBlocks(d));
  }, []);

  function handleChange<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(): Promise<void> {
    const res = await fetch("/api/kebun-sawit/inventory-transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan inventory transactions",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Inventroy Transactions Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/kebun-sawit/inventory-transactions");
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Inventory Transaction">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>Item</label>
            <select
              className="w-full border rounded p-2"
              value={form.item_id}
              onChange={(e) => handleChange("item_id", e.target.value)}
            >
              <option value="">Pilih Item</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Block</label>
            <select
              className="w-full border rounded p-2"
              value={form.block_id}
              onChange={(e) => handleChange("block_id", e.target.value)}
            >
              <option value="">Pilih Block</option>
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Tanggal"
            type="date"
            value={form.transaction_date}
            onChange={(e) => handleChange("transaction_date", e.target.value)}
          />

          <Input
            label="Quantity"
            type="number"
            value={form.quantity}
            onChange={(e) => handleChange("quantity", Number(e.target.value))}
          />

          <Input
            label="Unit Price"
            type="number"
            value={form.unit_price}
            onChange={(e) => handleChange("unit_price", Number(e.target.value))}
          />

          <Input
            label="PPN (%)"
            type="number"
            value={form.ppn}
            onChange={(e) => handleChange("ppn", Number(e.target.value))}
          />

          <Input
            label="PPh23 (%)"
            type="number"
            value={form.pph23}
            onChange={(e) => handleChange("pph23", Number(e.target.value))}
          />

          <Input
            label="PPh4 (%)"
            type="number"
            value={form.pph4}
            onChange={(e) => handleChange("pph4", Number(e.target.value))}
          />

          <Input
            label="Reference Module"
            value={form.reference_module}
            onChange={(e) => handleChange("reference_module", e.target.value)}
          />

          <Input
            label="Catatan"
            value={form.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/kebun-sawit/inventory-transactions")}
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
