"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import Swal from "sweetalert2";

import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";

import Button from "@/components/ui/Button";

import Input from "@/components/ui/Input";

/* =========================
   TYPE VENDOR
========================= */

interface Vendor {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
}

/* =========================
   TYPE FORM
========================= */

interface FormState {
  id_vendor: number;

  npwp_pembeli: string;

  nama_pembeli: string;

  nomor_faktur_pajak: string;

  tanggal_faktur_pajak: string;

  jenis_objek: string;

  nilai_transaksi: number;

  dpp_nilai_lain: number;

  ppn: number;

  tarif_pph4: number;

  tanggal_transaksi: string;
}

/* =========================
   PAGE
========================= */

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

    /* =====================
         PPN BARU
      ===================== */

    ppn: 0,

    tarif_pph4: 2,

    tanggal_transaksi: "",
  });

  /* =========================
     FETCH VENDOR
  ========================= */

  useEffect(() => {
    async function fetchVendor(): Promise<void> {
      try {
        const res = await fetch("/api/vendors", {
          cache: "no-store",
        });

        if (!res.ok) {
          return;
        }

        const data: unknown = await res.json();

        if (!Array.isArray(data)) {
          return;
        }

        setVendors(data as Vendor[]);
      } catch (error: unknown) {
        console.error("FETCH VENDOR ERROR:", error);
      }
    }

    void fetchVendor();
  }, []);

  /* =========================
     DASAR PAJAK
     
     Dasar PPh4:
     Nilai Transaksi - Potongan
  ========================= */
  const nilaiTransaksi: number = Math.max(0, form.nilai_transaksi);

  const dasarPajak: number = nilaiTransaksi;

  const pph4Terutang: number = Math.max(
    0,
    dasarPajak * (Math.max(0, form.tarif_pph4) / 100),
  );

  const potongan: number = pph4Terutang;

  /* =========================
     HANDLE CHANGE
  ========================= */

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  /* =========================
     SUBMIT
  ========================= */

  async function handleSubmit(): Promise<void> {
    if (form.id_vendor <= 0) {
      await Swal.fire("Validasi", "Vendor wajib dipilih", "warning");

      return;
    }

    if (!form.jenis_objek.trim()) {
      await Swal.fire("Validasi", "Jenis objek wajib diisi", "warning");

      return;
    }

    if (form.nilai_transaksi < 0) {
      await Swal.fire(
        "Validasi",
        "Nilai transaksi tidak boleh minus",
        "warning",
      );

      return;
    }

    if (form.dpp_nilai_lain < 0) {
      await Swal.fire(
        "Validasi",
        "DPP Nilai Lain tidak boleh minus",
        "warning",
      );

      return;
    }

    if (form.ppn < 0) {
      await Swal.fire("Validasi", "PPN tidak boleh minus", "warning");

      return;
    }

    if (form.tarif_pph4 < 0) {
      await Swal.fire("Validasi", "Tarif PPh4 tidak boleh minus", "warning");

      return;
    }

    if (!form.tanggal_transaksi) {
      await Swal.fire("Validasi", "Tanggal transaksi wajib diisi", "warning");

      return;
    }

    try {
      setLoading(true);

      const payload = {
        id_vendor: form.id_vendor,
        npwp_pembeli: form.npwp_pembeli.trim() || undefined,
        nama_pembeli: form.nama_pembeli.trim() || undefined,
        nomor_faktur_pajak: form.nomor_faktur_pajak.trim() || undefined,
        tanggal_faktur_pajak: form.tanggal_faktur_pajak || undefined,
        jenis_objek: form.jenis_objek.trim(),
        nilai_transaksi: nilaiTransaksi,
        dpp_nilai_lain: Math.max(0, form.dpp_nilai_lain),
        ppn: Math.max(0, form.ppn),

        tarif_pph4: Math.max(0, form.tarif_pph4),

        pph4_terutang: pph4Terutang,

        tanggal_transaksi: form.tanggal_transaksi,
      };

      const res = await fetch("/api/pph4", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      });

      const result: unknown = await res.json();

      if (!res.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Gagal menyimpan PPh4";

        await Swal.fire("Gagal", message, "error");

        return;
      }

      await Swal.fire({
        position: "center",
        icon: "success",
        title: "PPh4 Berhasil Disimpan",
        text: "Data PPh4 berhasil masuk",
        showConfirmButton: false,
        timer: 1500,
      });

      router.push("/pajak/pph4");

      router.refresh();
    } catch (error: unknown) {
      console.error("SUBMIT PPH4 ERROR:", error);

      await Swal.fire(
        "Gagal",
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menyimpan PPh4",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <Card title="Tambah PPh4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* =====================
            VENDOR
        ===================== */}

        <div>
          <label className="text-sm font-medium">Vendor</label>

          <select
            className="w-full border p-2 rounded mt-1"
            value={form.id_vendor}
            onChange={(e) => handleChange("id_vendor", Number(e.target.value))}
          >
            <option value={0}>-- Pilih Vendor --</option>

            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.kode_vendor ?? "-"} - {vendor.nama_vendor}
              </option>
            ))}
          </select>
        </div>

        {/* =====================
            NPWP
        ===================== */}

        <Input
          label="NPWP Pembeli"
          value={form.npwp_pembeli}
          onChange={(e) => handleChange("npwp_pembeli", e.target.value)}
        />

        {/* =====================
            NAMA PEMBELI
        ===================== */}

        <Input
          label="Nama Pembeli"
          value={form.nama_pembeli}
          onChange={(e) => handleChange("nama_pembeli", e.target.value)}
        />

        {/* =====================
            NOMOR FAKTUR
        ===================== */}

        <Input
          label="Nomor Faktur Pajak"
          value={form.nomor_faktur_pajak}
          onChange={(e) => handleChange("nomor_faktur_pajak", e.target.value)}
        />

        {/* =====================
            TANGGAL FAKTUR
        ===================== */}

        <Input
          label="Tanggal Faktur Pajak"
          type="date"
          value={form.tanggal_faktur_pajak}
          onChange={(e) => handleChange("tanggal_faktur_pajak", e.target.value)}
        />

        {/* =====================
            JENIS OBJEK
        ===================== */}

        <Input
          label="Jenis Objek"
          value={form.jenis_objek}
          onChange={(e) => handleChange("jenis_objek", e.target.value)}
        />

        {/* =====================
            NILAI TRANSAKSI
        ===================== */}

        <Input
          label="Nilai Transaksi"
          type="number"
          min="0"
          value={form.nilai_transaksi}
          onChange={(e) =>
            handleChange("nilai_transaksi", Math.max(0, Number(e.target.value)))
          }
        />

        {/* =====================
            DPP NILAI LAIN
        ===================== */}

        <Input
          label="DPP Nilai Lain"
          type="number"
          min="0"
          value={form.dpp_nilai_lain}
          onChange={(e) =>
            handleChange("dpp_nilai_lain", Math.max(0, Number(e.target.value)))
          }
        />

        {/* =====================
            PPN
        ===================== */}

        <Input
          label="PPN"
          type="number"
          min="0"
          value={form.ppn}
          onChange={(e) =>
            handleChange("ppn", Math.max(0, Number(e.target.value)))
          }
        />

        {/* =====================
            POTONGAN
        ===================== */}

        <div className="flex justify-between">
          <span>Potongan</span>

          <span className="font-medium">
            Rp{" "}
            {potongan.toLocaleString("id-ID", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        {/* =====================
            TARIF
        ===================== */}

        <Input
          label="Tarif (%)"
          type="number"
          min="0"
          step="0.01"
          value={form.tarif_pph4}
          onChange={(e) =>
            handleChange("tarif_pph4", Math.max(0, Number(e.target.value)))
          }
        />

        {/* =====================
            TANGGAL TRANSAKSI
        ===================== */}

        <Input
          label="Tanggal"
          type="date"
          value={form.tanggal_transaksi}
          onChange={(e) => handleChange("tanggal_transaksi", e.target.value)}
        />
      </div>

      {/* =========================
          RINGKASAN PERHITUNGAN
      ========================= */}

      <div className="mt-6 rounded-lg border bg-gray-50 p-4 text-sm space-y-2">
        <div className="flex justify-between">
          <span>Nilai Transaksi</span>

          <span className="font-medium">
            Rp {nilaiTransaksi.toLocaleString("id-ID")}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Potongan</span>

          <span>
            Rp{" "}
            {potongan.toLocaleString("id-ID", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Dasar Pajak</span>

          <span className="font-medium">
            Rp{" "}
            {dasarPajak.toLocaleString("id-ID", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        <div className="flex justify-between">
          <span>PPN</span>

          <span>
            Rp{" "}
            {form.ppn.toLocaleString("id-ID", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        <div className="flex justify-between border-t pt-2">
          <span>PPh4 Terutang</span>

          <span className="font-semibold text-blue-600">
            Rp{" "}
            {pph4Terutang.toLocaleString("id-ID", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>

      {/* =========================
          ACTION
      ========================= */}

      <div className="flex gap-3 mt-6">
        <Button
          variant="secondary"
          onClick={() => router.push("/pajak/pph4")}
          disabled={loading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </Button>

        <Button onClick={() => void handleSubmit()} disabled={loading}>
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
