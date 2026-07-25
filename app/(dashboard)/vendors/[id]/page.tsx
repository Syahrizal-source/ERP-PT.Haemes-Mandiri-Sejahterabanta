"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Vendor {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
  kategori_vendor: string | null;
  npwp: string | null;
  nama_npwp: string | null;
  alamat_npwp: string | null;
  telepon: string | null;
  email: string | null;
  alamat: string | null;
  status: boolean;
}

interface VendorRekening {
  id: number;
  vendor_id: number;
  nama_bank: string;
  nomor_rekening: string;
  nama_rekening: string;
}

interface VendorPajak {
  id: number;
  vendor_id: number;
  npwp: string | null;
  nama_npwp: string | null;
  alamat_npwp: string | null;
  pkp: boolean;
}

interface VendorDetailResponse {
  vendor: Vendor;
  rekening: VendorRekening[];
  pajak: VendorPajak[];
}

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [data, setData] = useState<Vendor | null>(null);
  const [rekening, setRekening] = useState<VendorRekening[]>([]);
  const [pajak, setPajak] = useState<VendorPajak[]>([]);

  useEffect(() => {
    async function load(): Promise<void> {
      const res = await fetch(`/api/vendors/${id}/detail`);

      if (!res.ok) return;

      const result: VendorDetailResponse = await res.json();

      setData(result.vendor);
      setRekening(result.rekening);
      setPajak(result.pajak);
    }

    load();
  }, [id]);

  if (!data) return <div className="p-6">Memuat...</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Detail Vendor">
        <div className="grid grid-cols-2 gap-4">
          <div>Kode Vendor</div>
          <div>{data.kode_vendor ?? "-"}</div>

          <div>Nama Vendor</div>
          <div>{data.nama_vendor}</div>

          <div>Kategori</div>
          <div>{data.kategori_vendor ?? "-"}</div>

          <div>Telepon</div>
          <div>{data.telepon ?? "-"}</div>

          <div>Email</div>
          <div>{data.email ?? "-"}</div>

          <div>Alamat</div>
          <div>{data.alamat ?? "-"}</div>

          <div>Status</div>
          <div>{data.status ? "Aktif" : "Nonaktif"}</div>
        </div>

        <div className="mt-6">
          <h3 className="font-semibold mb-2">Pajak Vendor</h3>

          {pajak.length === 0 ? (
            <div className="text-sm text-gray-500">Belum ada data pajak</div>
          ) : (
            pajak.map((p) => (
              <div key={p.id} className="border rounded p-3 mb-2">
                <div>NPWP: {p.npwp ?? "-"}</div>
                <div>Nama NPWP: {p.nama_npwp ?? "-"}</div>
                <div>Alamat NPWP: {p.alamat_npwp ?? "-"}</div>
                <div>PKP: {p.pkp ? "Ya" : "Tidak"}</div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6">
          <h3 className="font-semibold mb-2">Rekening Vendor</h3>

          {rekening.length === 0 ? (
            <div className="text-sm text-gray-500">
              Belum ada rekening vendor
            </div>
          ) : (
            rekening.map((r) => (
              <div key={r.id} className="border rounded p-3 mb-2">
                <div>Bank: {r.nama_bank}</div>
                <div>No Rekening: {r.nomor_rekening}</div>
                <div>Nama Rekening: {r.nama_rekening}</div>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={() => router.push("/vendors")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={() => router.push(`/vendors/${data.id}/edit`)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </Card>
    </div>
  );
}
