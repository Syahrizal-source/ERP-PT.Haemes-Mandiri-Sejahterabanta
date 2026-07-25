"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Block {
  id: string;
  code: string;
}

interface Item {
  id: string;
  name: string;
}

export default function FertilizationFormPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [form, setForm] = useState({
    block_id: "",
    item_id: "",
    vendor_name: "",
    fertilization_date: "",
    dose_per_ha: 0,
    total_used: 0,
    labor_cost: 0,
    notes: "",
  });

  async function loadData(): Promise<void> {
    const resBlock = await fetch("/api/kebun-sawit/blocks");
    const resItem = await fetch("/api/kebun-sawit/items");

    if (!resBlock.ok || !resItem.ok) {
      showToast("Gagal mengambil data master", "error");
      setLoading(false);
      return;
    }

    const blockData: Block[] = await resBlock.json();
    const itemData: Item[] = await resItem.json();

    setBlocks(blockData);
    setItems(itemData);
    setLoading(false);
  }

  useEffect(() => {
    loadData();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(): Promise<void> {
    const res = await fetch("/api/kebun-sawit/fertilizations", {
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
        text: "Gagal menyimpan fertilizations",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Fertilization Berhasil Masuk",
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
      <Card title="Tambah Fertilization">
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Memuat data...
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block mb-1">Block</label>
              <select
                className="w-full border px-3 py-2"
                value={form.block_id}
                onChange={(e) => setForm({ ...form, block_id: e.target.value })}
              >
                <option value="">Pilih Block</option>
                {blocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1">Item</label>
              <select
                className="w-full border px-3 py-2"
                value={form.item_id}
                onChange={(e) => setForm({ ...form, item_id: e.target.value })}
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
              <label className="block mb-1">Vendor</label>
              <input
                className="w-full border px-3 py-2"
                value={form.vendor_name}
                onChange={(e) =>
                  setForm({ ...form, vendor_name: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block mb-1">Tanggal</label>
              <input
                type="date"
                className="w-full border px-3 py-2"
                value={form.fertilization_date}
                onChange={(e) =>
                  setForm({ ...form, fertilization_date: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block mb-1">Dose / Ha</label>
              <input
                type="number"
                className="w-full border px-3 py-2"
                value={form.dose_per_ha}
                onChange={(e) =>
                  setForm({
                    ...form,
                    dose_per_ha: Number(e.target.value),
                  })
                }
              />
            </div>

            <div>
              <label className="block mb-1">Total Used</label>
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
              <label className="block mb-1">Labor Cost</label>
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
              <label className="block mb-1">Catatan</label>
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

              <Button onClick={handleSubmit}>Simpan</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
