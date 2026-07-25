"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/toast-context";

interface VendorForm {
  kode_vendor: string;
  nama_vendor: string;
  kategori_vendor: string;
  telepon: string;
  email: string;
  alamat: string;
}

interface VendorPajak {
  id: number;
  vendor_id: number;
  npwp: string | null;
  nama_npwp: string | null;
  alamat_npwp: string | null;
  pkp: boolean;
}

interface VendorRekening {
  id: number;
  vendor_id: number;
  nama_bank: string;
  nomor_rekening: string;
  nama_rekening: string;
}

interface Props {
  vendorId: number | null;
  initialVendor: VendorForm;
  initialPajak: VendorPajak[];
  initialRekening: VendorRekening[];
}

type TabType = "vendor" | "pajak" | "rekening";

export default function VendorFormTabs({
  vendorId,
  initialVendor,
  initialPajak,
  initialRekening,
}: Props) {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>("vendor");

  const [vendor, setVendor] = useState<VendorForm>(initialVendor);
  const [pajakList, setPajakList] = useState<VendorPajak[]>(initialPajak);
  const [rekeningList, setRekeningList] =
    useState<VendorRekening[]>(initialRekening);

  const [pajakForm, setPajakForm] = useState({
    npwp: "",
    nama_npwp: "",
    alamat_npwp: "",
    pkp: false,
  });

  const [rekeningForm, setRekeningForm] = useState({
    nama_bank: "",
    nomor_rekening: "",
    nama_rekening: "",
  });

  function handleVendorChange<K extends keyof VendorForm>(
    field: K,
    value: VendorForm[K],
  ): void {
    setVendor((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function saveVendor(): Promise<void> {
    if (vendorId === null) return;

    const res = await fetch(`/api/vendors/${vendorId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vendor),
    });

    if (!res.ok) {
      showToast("Gagal update vendor", "error");
      return;
    }

    showToast("Vendor berhasil diupdate", "success");
  }

  async function addPajak(): Promise<void> {
    if (vendorId === null) return;

    const payload = {
      vendor_id: vendorId,
      ...pajakForm,
    };

    const res = await fetch("/api/vendor-pajak", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      showToast("Gagal menambah pajak", "error");
      return;
    }

    const created: VendorPajak = await res.json();

    setPajakList((prev) => [...prev, created]);

    setPajakForm({
      npwp: "",
      nama_npwp: "",
      alamat_npwp: "",
      pkp: false,
    });

    showToast("Pajak vendor berhasil ditambahkan", "success");
  }

  async function addRekening(): Promise<void> {
    if (vendorId === null) return;

    const payload = {
      vendor_id: vendorId,
      ...rekeningForm,
    };

    const res = await fetch("/api/vendor-rekening", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      showToast("Gagal menambah rekening", "error");
      return;
    }

    const created: VendorRekening = await res.json();

    setRekeningList((prev) => [...prev, created]);

    setRekeningForm({
      nama_bank: "",
      nomor_rekening: "",
      nama_rekening: "",
    });

    showToast("Rekening vendor berhasil ditambahkan", "success");
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === "vendor" ? "default" : "destructive"}
          onClick={() => setActiveTab("vendor")}
        >
          Data Vendor
        </Button>

        <Button
          variant={activeTab === "pajak" ? "default" : "destructive"}
          onClick={() => setActiveTab("pajak")}
        >
          Pajak
        </Button>

        <Button
          variant={activeTab === "rekening" ? "default" : "destructive"}
          onClick={() => setActiveTab("rekening")}
        >
          Rekening
        </Button>
      </div>

      {activeTab === "vendor" && (
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Kode Vendor"
            value={vendor.kode_vendor}
            onChange={(e) => handleVendorChange("kode_vendor", e.target.value)}
          />

          <Input
            label="Nama Vendor"
            value={vendor.nama_vendor}
            onChange={(e) => handleVendorChange("nama_vendor", e.target.value)}
          />

          <Input
            label="Kategori"
            value={vendor.kategori_vendor}
            onChange={(e) =>
              handleVendorChange("kategori_vendor", e.target.value)
            }
          />

          <Input
            label="Telepon"
            value={vendor.telepon}
            onChange={(e) => handleVendorChange("telepon", e.target.value)}
          />

          <Input
            label="Email"
            value={vendor.email}
            onChange={(e) => handleVendorChange("email", e.target.value)}
          />

          <Input
            label="Alamat"
            value={vendor.alamat}
            onChange={(e) => handleVendorChange("alamat", e.target.value)}
          />

          <div className="col-span-2 mt-4">
            <Button onClick={saveVendor}>Simpan Perubahan</Button>
          </div>
        </div>
      )}

      {activeTab === "pajak" && (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Input
              label="NPWP"
              value={pajakForm.npwp}
              onChange={(e) =>
                setPajakForm((p) => ({ ...p, npwp: e.target.value }))
              }
            />

            <Input
              label="Nama NPWP"
              value={pajakForm.nama_npwp}
              onChange={(e) =>
                setPajakForm((p) => ({
                  ...p,
                  nama_npwp: e.target.value,
                }))
              }
            />

            <Input
              label="Alamat NPWP"
              value={pajakForm.alamat_npwp}
              onChange={(e) =>
                setPajakForm((p) => ({
                  ...p,
                  alamat_npwp: e.target.value,
                }))
              }
            />
          </div>

          <Button onClick={addPajak}>Tambah Pajak</Button>

          <div className="mt-4 space-y-2">
            {pajakList.map((p) => (
              <div key={p.id} className="border rounded p-2">
                {p.npwp} - {p.nama_npwp}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "rekening" && (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Input
              label="Bank"
              value={rekeningForm.nama_bank}
              onChange={(e) =>
                setRekeningForm((r) => ({
                  ...r,
                  nama_bank: e.target.value,
                }))
              }
            />

            <Input
              label="Nomor Rekening"
              value={rekeningForm.nomor_rekening}
              onChange={(e) =>
                setRekeningForm((r) => ({
                  ...r,
                  nomor_rekening: e.target.value,
                }))
              }
            />

            <Input
              label="Nama Rekening"
              value={rekeningForm.nama_rekening}
              onChange={(e) =>
                setRekeningForm((r) => ({
                  ...r,
                  nama_rekening: e.target.value,
                }))
              }
            />
          </div>

          <Button onClick={addRekening}>Tambah Rekening</Button>

          <div className="mt-4 space-y-2">
            {rekeningList.map((r) => (
              <div key={r.id} className="border rounded p-2">
                {r.nama_bank} - {r.nomor_rekening}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
