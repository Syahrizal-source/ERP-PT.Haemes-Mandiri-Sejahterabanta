"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

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
  npwp_pembeli: string;
  nama_pembeli: string;
  nomor_faktur_pajak: string;
  tanggal_faktur_pajak: string;
  jenis_objek: string;
  nilai_transaksi: number;
  dpp_nilai_lain: number;
  potongan: number;
  tarif_pph4: number;
  tanggal_transaksi: string;
}

export default function CreatePph4Page() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);

  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [form, setForm] = useState<FormState>({
    id_vendor: 0,
    npwp_pembeli: "",
    nama_pembeli: "",
    nomor_faktur_pajak: "",
    tanggal_faktur_pajak: "",
    jenis_objek: "",
    nilai_transaksi: 0,
    dpp_nilai_lain: 0,
    potongan: 0,
    tarif_pph4: 2,
    tanggal_transaksi: "",
  });

  /* =========================
     FETCH VENDOR
  ========================= */

  useEffect(() => {
    async function fetchVendor(): Promise<void> {
      try {
        const res = await fetch("/api/vendors");

        if (!res.ok) return;

        const data: Vendor[] = await res.json();

        if (Array.isArray(data)) {
          setVendors(data);
        }
      } catch (err) {
        console.error(err);
      }
    }

    fetchVendor();
  }, []);

  /* =========================
     HITUNG PAJAK
  ========================= */

  const dasar = Math.max(0, form.nilai_transaksi);

  const potongan = Math.max(0, dasar * (form.tarif_pph4 / 100));

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(): Promise<void> {
    const res = await fetch("/api/pph4", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...form,
        potongan,
        pph4_terutang: potongan,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan pph4",
      });
      return;
    }

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Pph4 Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/pajak/pph4");
      router.refresh();
    });
  }

  return (
    <Card title="Tambah PPh4">
      <div className="grid grid-cols-2 gap-4">
        {/* VENDOR */}
        <div>
          <label className="text-sm">Vendor</label>
          <select
            className="w-full border p-2 rounded"
            value={form.id_vendor}
            onChange={(e) => handleChange("id_vendor", Number(e.target.value))}
          >
            <option value={0}>-- Pilih Vendor --</option>

            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.kode_vendor ?? "-"} - {v.nama_vendor}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="NPWP Pembeli"
          value={form.npwp_pembeli}
          onChange={(e) => handleChange("npwp_pembeli", e.target.value)}
        />

        <Input
          label="Nama Pembeli"
          value={form.nama_pembeli}
          onChange={(e) => handleChange("nama_pembeli", e.target.value)}
        />

        <Input
          label="Nomor Faktur Pajak"
          value={form.nomor_faktur_pajak}
          onChange={(e) => handleChange("nomor_faktur_pajak", e.target.value)}
        />

        <Input
          label="Tanggal Faktur Pajak"
          type="date"
          value={form.tanggal_faktur_pajak}
          onChange={(e) => handleChange("tanggal_faktur_pajak", e.target.value)}
        />

        <Input
          label="Jenis Objek"
          value={form.jenis_objek}
          onChange={(e) => handleChange("jenis_objek", e.target.value)}
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
          label="DPP Nilai Lain"
          type="number"
          value={form.dpp_nilai_lain}
          onChange={(e) =>
            handleChange("dpp_nilai_lain", Number(e.target.value))
          }
        />

        <Input label="Potongan" type="number" value={potongan} readOnly />

        <Input
          label="Tarif (%)"
          type="number"
          value={form.tarif_pph4}
          onChange={(e) => handleChange("tarif_pph4", Number(e.target.value))}
        />

        <Input
          label="Tanggal"
          type="date"
          value={form.tanggal_transaksi}
          onChange={(e) => handleChange("tanggal_transaksi", e.target.value)}
        />
      </div>

      <div className="mt-4 text-sm space-y-1">
        <p>Dasar Pajak: {dasar.toLocaleString("id-ID")}</p>

        <p>
          Potongan ({form.tarif_pph4}%):{" "}
          {potongan.toLocaleString("id-ID", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>

        <p className="font-semibold text-blue-600">
          PPh4 Terutang:{" "}
          {potongan.toLocaleString("id-ID", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="secondary" onClick={() => router.push("/pajak/pph4")}>
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
