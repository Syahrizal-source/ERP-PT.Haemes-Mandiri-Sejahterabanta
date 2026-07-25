"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/toast-context";

interface Vendor {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
}

interface FormState {
  jenis_ppn: string;
  nilai_dasar: number;
  tanggal: string;
}

export default function CreatePPNPage(): React.JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const { showToast } = useToast();

  const [form, setForm] = useState({
    id_transaksi: 1,
    vendor_id: 0,
    nomor_seri: "",
    keterangan: "",
    jenis_ppn: "masukan",
    nilai_dasar: 0,
    tarif_ppn: 11,
    tanggal_transaksi: "",
  });

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]:
        field === "nilai_dasar" || field === "tarif_ppn"
          ? Math.max(0, Number(value) || 0)
          : value,
    }));
  }

  const nilaiPpn = Number(
    ((form.nilai_dasar * form.tarif_ppn) / 100).toFixed(2),
  );

  useEffect(() => {
    async function loadVendor(): Promise<void> {
      const res = await fetch("/api/vendors");

      if (!res.ok) {
        return;
      }

      const result: Vendor[] = await res.json();

      setVendors(result);
    }

    loadVendor();
  }, []);

  async function handleSubmit(): Promise<void> {
    const nilaiPpn = (form.nilai_dasar * form.tarif_ppn) / 100;

    const payload = {
      id_transaksi: form.id_transaksi,
      vendor_id: form.vendor_id,
      nomor_seri: form.nomor_seri,
      keterangan: form.keterangan,
      jenis_ppn: form.jenis_ppn,
      nilai_dasar: form.nilai_dasar,
      tarif_ppn: form.tarif_ppn,
      nilai_ppn: nilaiPpn,
      tanggal_transaksi: form.tanggal_transaksi,
    };

    const res = await fetch("/api/ppn", {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // ✅ WAJIB
      },
      body: JSON.stringify(payload),
    });

    if (form.vendor_id <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Vendor belum dipilih",
        text: "Silakan pilih vendor terlebih dahulu.",
      });

      return;
    }

    if (form.nomor_seri.trim() === "") {
      Swal.fire({
        icon: "warning",
        title: "Nomor seri kosong",
        text: "Silakan isi nomor seri faktur.",
      });

      return;
    }

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan ppn",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Ppn Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/pajak/ppn");
      router.refresh();
    });
  }

  return (
    <Card title="Tambah PPN">
      <div className="space-y-2">
        <div>
          <label className="block text-sm font-medium mb-1">Jenis PPN</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={form.jenis_ppn}
            onChange={(e) => handleChange("jenis_ppn", e.target.value)}
          >
            <option value="masukan">Masukan</option>
            <option value="keluaran">Keluaran</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Vendor</label>

          <select
            className="w-full border rounded px-3 py-2"
            value={form.vendor_id}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                vendor_id: Number(e.target.value),
              }))
            }
          >
            <option value={0}>-- Pilih Vendor Terlebih Dahulu --</option>

            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.kode_vendor} - {vendor.nama_vendor}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Nomor Seri Faktur"
          placeholder="Contoh: 04002500186620794"
          value={form.nomor_seri}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              nomor_seri: e.target.value,
            }))
          }
        />

        <Input
          label="Keterangan"
          placeholder="Contoh: PPN Keluaran"
          value={form.keterangan}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              keterangan: e.target.value,
            }))
          }
        />

        {/* NILAI DASAR */}
        <Input
          label="Nilai Dasar Pengenaan Pajak"
          type="number"
          value={form.nilai_dasar}
          placeholder="Masukkan nilai dasar"
          onChange={(e) => handleChange("nilai_dasar", e.target.value)}
        />

        {/* TARIF */}
        <div>
          <label className="block text-sm font-medium mb-1">Tarif (%)</label>
          <Input
            type="number"
            className="w-full border rounded px-3 py-2"
            value={form.tarif_ppn}
            onChange={(e) => handleChange("tarif_ppn", e.target.value)}
          />
        </div>

        {/* TANGGAL */}
        <Input
          label="Tanggal Transaksi"
          type="date"
          value={form.tanggal_transaksi}
          onChange={(e) => handleChange("tanggal_transaksi", e.target.value)}
        />
        {/* HASIL */}
        <div className="rounded-lg border bg-gray-50 p-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Dasar Pengenaan Pajak</span>

            <span className="font-semibold">
              {form.nilai_dasar.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="mt-2 flex justify-between">
            <span className="text-gray-600">Nilai PPN</span>

            <span className="font-bold text-blue-600">
              {Math.max(0, nilaiPpn).toLocaleString("id-ID")}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <Button variant="secondary" onClick={() => router.push("/pajak/ppn")}>
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
  );
}
