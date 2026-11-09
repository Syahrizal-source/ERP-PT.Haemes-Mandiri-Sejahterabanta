"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

/* =========================
   TYPE
========================= */

interface Pph4Form {
  id_vendor: number;
  jenis_objek: string;

  npwp_pembeli: string;
  nama_pembeli: string;
  nomor_faktur_pajak: string;
  tanggal_faktur_pajak: string;

  nilai_transaksi: number;
  dpp_nilai_lain: number;
  ppn: number;

  tarif_pph4: number;
  tanggal_transaksi: string;
}

interface Pph4Payload extends Pph4Form {
  pph4_terutang: number;
}

interface Vendor {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
}

interface ApiErrorResponse {
  error?: string;
}

/* =========================
   HELPER
========================= */

function formatRupiah(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;

  return safeValue.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toNumber(value: unknown): number {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Math.max(0, numberValue);
}

/* =========================
   PAGE
========================= */

export default function EditPph4Page() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const EMPTY_FORM: Pph4Form = {
    id_vendor: 0,
    jenis_objek: "",
    npwp_pembeli: "",
    nama_pembeli: "",
    nomor_faktur_pajak: "",
    tanggal_faktur_pajak: "",
    nilai_transaksi: 0,
    dpp_nilai_lain: 0,
    ppn: 0,
    tarif_pph4: 0,
    tanggal_transaksi: "",
  };

  const [form, setForm] = useState<Pph4Form>(EMPTY_FORM);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  /* =========================
     FETCH DATA
  ========================= */

  useEffect(() => {
    async function loadData(): Promise<void> {
      try {
        setLoading(true);

        const [pph4Response, vendorResponse] = await Promise.all([
          fetch(`/api/pph4/${params.id}`, {
            cache: "no-store",
          }),

          fetch("/api/vendors", {
            cache: "no-store",
          }),
        ]);

        const pph4Result: unknown = await pph4Response.json();

        if (!pph4Response.ok) {
          const errorData = pph4Result as ApiErrorResponse;

          throw new Error(
            typeof errorData.error === "string"
              ? errorData.error
              : "Gagal mengambil data PPh4",
          );
        }

        const vendorResult: unknown = await vendorResponse.json();

        if (vendorResponse.ok && Array.isArray(vendorResult)) {
          setVendors(vendorResult as Vendor[]);
        }

        const data = pph4Result as Partial<Pph4Form>;

        setForm({
          id_vendor: toNumber(data.id_vendor),

          jenis_objek:
            typeof data.jenis_objek === "string" ? data.jenis_objek : "",

          npwp_pembeli:
            typeof data.npwp_pembeli === "string" ? data.npwp_pembeli : "",

          nama_pembeli:
            typeof data.nama_pembeli === "string" ? data.nama_pembeli : "",

          nomor_faktur_pajak:
            typeof data.nomor_faktur_pajak === "string"
              ? data.nomor_faktur_pajak
              : "",

          tanggal_faktur_pajak:
            typeof data.tanggal_faktur_pajak === "string"
              ? data.tanggal_faktur_pajak
              : "",

          nilai_transaksi: toNumber(data.nilai_transaksi),

          dpp_nilai_lain: toNumber(data.dpp_nilai_lain),

          /*
           * PPN dari database.
           * Tidak masuk perhitungan PPh4.
           */
          ppn: toNumber(data.ppn),

          tarif_pph4: toNumber(data.tarif_pph4),

          tanggal_transaksi:
            typeof data.tanggal_transaksi === "string"
              ? data.tanggal_transaksi
              : "",
        });
      } catch (error: unknown) {
        console.error("EDIT PPH4 ERROR:", error);

        await Swal.fire(
          "Error",
          error instanceof Error ? error.message : "Gagal mengambil data PPh4",
          "error",
        );
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      void loadData();
    }
  }, [params.id]);

  /* =========================
     HANDLE CHANGE
  ========================= */

  function handleChange<K extends keyof Pph4Form>(
    field: K,
    value: Pph4Form[K],
  ): void {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <Card title="Edit PPh4">
        <div className="py-10 text-center">Memuat data...</div>
      </Card>
    );
  }

  if (!form) {
    return (
      <Card title="Edit PPh4">
        <div className="space-y-4">
          <p className="text-sm text-red-600">Data PPh4 tidak ditemukan.</p>

          <Button
            variant="secondary"
            onClick={() => router.push("/pajak/pph4")}
          >
            Kembali
          </Button>
        </div>
      </Card>
    );
  }

  /* =========================
     PERHITUNGAN PPH4

     PPN TIDAK masuk dasar.

     Dasar PPh4:
     Nilai Transaksi - Potongan
  ========================= */

  const nilaiTransaksi: number = Math.max(0, form.nilai_transaksi);

  const dasarPajak: number = nilaiTransaksi;

  const tarifPph4: number = Math.max(0, form.tarif_pph4);

  const pajak: number = Math.max(0, dasarPajak * (tarifPph4 / 100));

  /*
   * Potongan otomatis mengikuti
   * hasil perhitungan PPh4.
   */
  const potongan: number = pajak;

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

    if (!form.tanggal_transaksi) {
      await Swal.fire("Validasi", "Tanggal transaksi wajib diisi", "warning");
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

    if (pajak <= 0) {
      await Swal.fire(
        "Validasi",
        "PPh4 Terutang harus lebih besar dari 0",
        "warning",
      );
      return;
    }

    try {
      setSaving(true);

      const payload: Pph4Payload = {
        id_vendor: form.id_vendor,

        jenis_objek: form.jenis_objek.trim(),

        npwp_pembeli: form.npwp_pembeli.trim(),

        nama_pembeli: form.nama_pembeli.trim(),

        nomor_faktur_pajak: form.nomor_faktur_pajak.trim(),

        tanggal_faktur_pajak: form.tanggal_faktur_pajak,

        nilai_transaksi: nilaiTransaksi,

        dpp_nilai_lain: Math.max(0, form.dpp_nilai_lain),

        // PPN hanya disimpan sebagai informasi faktur.
        // Tidak masuk perhitungan PPh4.
        ppn: Math.max(0, form.ppn),

        tarif_pph4: tarifPph4,

        // Nilai hasil kalkulasi.
        // API tetap menghitung ulang untuk keamanan.
        pph4_terutang: pajak,

        tanggal_transaksi: form.tanggal_transaksi,
      };

      const response = await fetch(`/api/pph4/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        const errorData = result as ApiErrorResponse;

        throw new Error(
          typeof errorData.error === "string"
            ? errorData.error
            : "Gagal mengupdate PPh4",
        );
      }

      await Swal.fire("Sukses", "PPh4 berhasil diupdate", "success");

      router.push("/pajak/pph4");
      router.refresh();
    } catch (error: unknown) {
      console.error("UPDATE PPH4 ERROR:", error);

      await Swal.fire(
        "Error",
        error instanceof Error ? error.message : "Gagal mengupdate PPh4",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <Card title="Edit PPh4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* =========================
            VENDOR
        ========================= */}

        <div>
          <label className="text-sm">Vendor</label>

          <select
            className="w-full rounded border p-2"
            value={form.id_vendor}
            onChange={(event) =>
              handleChange("id_vendor", Number(event.target.value))
            }
          >
            <option value={0}>-- Pilih Vendor --</option>

            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.kode_vendor ?? "-"} - {vendor.nama_vendor}
              </option>
            ))}
          </select>
        </div>

        {/* =========================
            IDENTITAS PEMBELI
        ========================= */}

        <Input
          label="NPWP Pembeli"
          value={form.npwp_pembeli}
          onChange={(event) => handleChange("npwp_pembeli", event.target.value)}
        />

        <Input
          label="Nama Pembeli"
          value={form.nama_pembeli}
          onChange={(event) => handleChange("nama_pembeli", event.target.value)}
        />

        <Input
          label="Nomor Faktur Pajak"
          value={form.nomor_faktur_pajak}
          onChange={(event) =>
            handleChange("nomor_faktur_pajak", event.target.value)
          }
        />

        <Input
          label="Tanggal Faktur Pajak"
          type="date"
          value={form.tanggal_faktur_pajak}
          onChange={(event) =>
            handleChange("tanggal_faktur_pajak", event.target.value)
          }
        />

        {/* =========================
            PPH4
        ========================= */}

        <Input
          label="Jenis Objek"
          value={form.jenis_objek}
          onChange={(event) => handleChange("jenis_objek", event.target.value)}
        />

        <Input
          label="Nilai Transaksi"
          type="number"
          min="0"
          step="0.01"
          value={form.nilai_transaksi}
          onChange={(event) =>
            handleChange(
              "nilai_transaksi",
              Math.max(0, Number(event.target.value)),
            )
          }
        />

        <Input
          label="DPP Nilai Lain"
          type="number"
          min="0"
          step="0.01"
          value={form.dpp_nilai_lain}
          onChange={(event) =>
            handleChange(
              "dpp_nilai_lain",
              Math.max(0, Number(event.target.value)),
            )
          }
        />

        {/* =========================
            PPN

            HANYA INFORMASI FAKTUR
            TIDAK MASUK HITUNG PPH4
        ========================= */}

        <Input
          label="PPN"
          type="number"
          min="0"
          step="0.01"
          value={form.ppn}
          onChange={(event) =>
            handleChange("ppn", Math.max(0, Number(event.target.value)))
          }
        />

        <div className="flex justify-between">
          <span>Potongan</span>
          <span>Rp {formatRupiah(potongan)}</span>
        </div>

        <Input
          label="Tarif (%)"
          type="number"
          min="0"
          step="0.01"
          value={form.tarif_pph4}
          onChange={(event) =>
            handleChange("tarif_pph4", Math.max(0, Number(event.target.value)))
          }
        />

        <Input
          label="Tanggal"
          type="date"
          value={form.tanggal_transaksi}
          onChange={(event) =>
            handleChange("tanggal_transaksi", event.target.value)
          }
        />
      </div>

      {/* =========================
          PERHITUNGAN
      ========================= */}

      <div className="mt-6 space-y-2 rounded-lg border p-4">
        <h3 className="mb-3 font-semibold">Perhitungan Pajak</h3>

        <div className="flex justify-between">
          <span>Nilai Transaksi</span>
          <span>Rp {formatRupiah(nilaiTransaksi)}</span>
        </div>

        <div className="flex justify-between">
          <span>DPP Nilai Lain</span>
          <span>Rp {formatRupiah(form.dpp_nilai_lain)}</span>
        </div>

        <div className="flex justify-between">
          <span>PPN</span>
          <span>Rp {formatRupiah(form.ppn)}</span>
        </div>

        <div className="flex justify-between">
          <span>Potongan</span>
          <span>Rp {formatRupiah(potongan)}</span>
        </div>

        <div className="flex justify-between border-t pt-2">
          <span>Dasar Pajak PPh4</span>
          <span className="font-medium">Rp {formatRupiah(dasarPajak)}</span>
        </div>

        <div className="flex justify-between">
          <span>Tarif PPh4</span>
          <span>
            {tarifPph4.toLocaleString("id-ID", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            %
          </span>
        </div>

        <div className="flex justify-between border-t pt-3 font-semibold text-blue-600">
          <span>PPh4 Terutang</span>

          <span>Rp {formatRupiah(pajak)}</span>
        </div>
      </div>

      {/* =========================
          BUTTON
      ========================= */}

      <div className="mt-6 flex gap-3">
        <Button
          variant="secondary"
          onClick={() => router.push("/pajak/pph4")}
          disabled={saving}
        >
          Kembali
        </Button>

        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? "Menyimpan..." : "Update"}
        </Button>
      </div>
    </Card>
  );
}
