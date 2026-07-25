"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface Vendor {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
}

interface FormState {
  id_vendor: number;
  jenis_jasa: string;
  nilai_transaksi: number;
  tarif_pph23: number;
  tanggal_transaksi: string;
}

export default function CreatePph23Page() {
  const router = useRouter();

  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [form, setForm] = useState<FormState>({
    id_vendor: 0,
    jenis_jasa: "",
    nilai_transaksi: 0,
    tarif_pph23: 2,
    tanggal_transaksi: "",
  });

  /* =========================
     FETCH VENDOR
  ========================= */

  useEffect(() => {
    async function fetchVendor(): Promise<void> {
      try {
        const res = await fetch("/api/vendors"); // ✅ sesuai API Anda

        if (!res.ok) return;

        const data: Vendor[] = await res.json();

        if (Array.isArray(data)) {
          setVendors(data);
        } else {
          setVendors([]);
        }
      } catch (err) {
        console.error("Vendor error:", err);
        setVendors([]);
      }
    }

    fetchVendor();
  }, []);

  /* =========================
     HITUNG PPH23
  ========================= */

  const dasar = Math.max(0, form.nilai_transaksi);

  const pajak = Math.max(0, dasar * (form.tarif_pph23 / 100));

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(): Promise<void> {
    const res = await fetch("/api/pph23", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...form,
        pph23_terutang: pajak,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      Swal.fire("Error", result.error, "error");
      return;
    }

    Swal.fire("Sukses", result.message, "success").then(() => {
      router.push("/pajak/pph23");
      router.refresh();
    });
  }

  return (
    <Card title="Tambah PPh23">
      <div className="grid grid-cols-2 gap-4">
        {/* VENDOR */}
        <div>
          <label className="text-sm">Vendors</label>
          <select
            className="w-full border p-2 rounded"
            value={form.id_vendor}
            onChange={(e) => handleChange("id_vendor", Number(e.target.value))}
          >
            <option value={0}>-- Pilih Vendor --</option>

            {vendors.map((v) => {
              if (!v.id) return null;

              return (
                <option key={`vendor-${v.id}`} value={v.id}>
                  {v.kode_vendor ?? "-"} - {v.nama_vendor}
                </option>
              );
            })}
          </select>
        </div>

        <Input
          label="Jenis Jasa"
          value={form.jenis_jasa}
          onChange={(e) => handleChange("jenis_jasa", e.target.value)}
        />

        <Input
          label="Nilai Transaksi"
          type="number"
          value={form.nilai_transaksi}
          onChange={(e) =>
            handleChange("nilai_transaksi", Number(e.target.value))
          }
        />

        <Input
          label="Tarif (%)"
          type="number"
          value={form.tarif_pph23}
          onChange={(e) => handleChange("tarif_pph23", Number(e.target.value))}
        />

        <Input
          label="Tanggal"
          type="date"
          value={form.tanggal_transaksi}
          onChange={(e) => handleChange("tanggal_transaksi", e.target.value)}
        />
      </div>

      <div className="mt-4 text-sm">
        <p>Dasar Pajak: {dasar.toLocaleString("id-ID")}</p>
        <p className="font-semibold">PPh23: {pajak.toLocaleString("id-ID")}</p>
      </div>

      <Button className="mt-4" onClick={handleSubmit}>
        Simpan
      </Button>
    </Card>
  );
}
