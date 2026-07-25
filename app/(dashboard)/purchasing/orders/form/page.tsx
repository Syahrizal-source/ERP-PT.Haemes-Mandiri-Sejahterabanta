"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Vendor {
  id: number;
  nama_vendor: string;
}

interface Proyek {
  id: string;
  nama_proyek: string;
}

interface ItemForm {
  nama_item: string;
  qty: number;
  harga: number;
}

interface PurchaseOrderForm {
  nomor: string;
  tanggal: string;
  vendor_id: number;
  id_proyek: string | null;
  keterangan: string;
  status: string;
  items: ItemForm[];
}

export default function CreatePurchaseOrderPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [proyek, setProyek] = useState<Proyek[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [form, setForm] = useState<PurchaseOrderForm>({
    nomor: "",
    tanggal: "",
    vendor_id: 0,
    id_proyek: null,
    keterangan: "",
    status: "DRAFT",
    items: [
      {
        nama_item: "",
        qty: 1,
        harga: 0,
      },
    ],
  });

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const [vendorRes, proyekRes] = await Promise.all([
        fetch("/api/vendors"),
        fetch("/api/proyek/master"),
      ]);

      const vendorData: Vendor[] = await vendorRes.json();
      const proyekData: Proyek[] = await proyekRes.json();

      setVendors(vendorData);
      setProyek(proyekData);
    }

    fetchData();
  }, []);

  function handleChange<K extends keyof PurchaseOrderForm>(
    field: K,
    value: PurchaseOrderForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleItemChange(
    index: number,
    field: keyof ItemForm,
    value: string | number,
  ): void {
    const newItems = [...form.items];

    if (field === "nama_item") {
      newItems[index].nama_item = value as string;
    }

    if (field === "qty") {
      newItems[index].qty = Number(value);
    }

    if (field === "harga") {
      newItems[index].harga = Number(value);
    }

    setForm((prev) => ({
      ...prev,
      items: newItems,
    }));
  }

  function addItem(): void {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          nama_item: "",
          qty: 1,
          harga: 0,
        },
      ],
    }));
  }

  function removeItem(index: number): void {
    const newItems = form.items.filter((_, i) => i !== index);

    setForm((prev) => ({
      ...prev,
      items: newItems,
    }));
  }

  async function handleSubmit(): Promise<void> {
    if (form.vendor_id === 0) {
      showToast("Vendor harus dipilih", "error");
      return;
    }

    if (form.items.length === 0) {
      showToast("Minimal 1 item", "error");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/purchasing/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan orders",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Orders Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/purchasing/orders");
      router.refresh();
    });
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Card title="Tambah Purchase Order">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nomor PO"
            value={form.nomor}
            onChange={(e) => handleChange("nomor", e.target.value)}
          />

          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <div>
            <label className="text-sm font-medium">Vendor</label>
            <select
              className="w-full border rounded p-2"
              value={form.vendor_id}
              onChange={(e) =>
                handleChange("vendor_id", Number(e.target.value))
              }
            >
              <option value={0}>-- Pilih Vendor --</option>

              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nama_vendor}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Proyek</label>
            <select
              className="w-full border rounded p-2"
              value={form.id_proyek ?? ""}
              onChange={(e) =>
                handleChange(
                  "id_proyek",
                  e.target.value === "" ? null : e.target.value,
                )
              }
            >
              <option value="">-- Tanpa Proyek --</option>

              {proyek.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama_proyek}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Status</label>
          <select
            className="w-full border rounded p-2"
            value={form.status}
            onChange={(e) => handleChange("status", e.target.value)}
          >
            <option value="DRAFT">DRAFT</option>
            <option value="APPROVED">APPROVED</option>
            <option value="CANCEL">CANCEL</option>
          </select>
        </div>

        <Input
          label="Keterangan"
          value={form.keterangan}
          onChange={(e) => handleChange("keterangan", e.target.value)}
        />

        <div className="mt-6">
          <div className="flex justify-between mb-3">
            <h3 className="font-semibold">Items</h3>

            <Button type="button" onClick={addItem}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Item
            </Button>
          </div>

          {form.items.map((item, index) => (
            <div key={index} className="grid grid-cols-4 gap-3 mb-2">
              <Input
                label="Nama Item"
                value={item.nama_item}
                onChange={(e) =>
                  handleItemChange(index, "nama_item", e.target.value)
                }
              />

              <Input
                label="Qty"
                type="number"
                value={item.qty}
                onChange={(e) =>
                  handleItemChange(index, "qty", Number(e.target.value))
                }
              />

              <Input
                label="Harga"
                type="number"
                value={item.harga}
                onChange={(e) =>
                  handleItemChange(index, "harga", Number(e.target.value))
                }
              />

              <div className="flex items-end">
                <Button
                  variant="destructive"
                  type="button"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/purchasing/orders")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Simpan
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
