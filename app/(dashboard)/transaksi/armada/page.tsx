"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, HardDriveUpload, Download } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface ArmadaRow {
  id: number;
  tanggal: string;
  kode_transaksi: string;
  no_polisi: string;
  supir: string;
  jumlah_tagihan: number;
  bersih: number;
}

export default function ArmadaPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<ArmadaRow[]>([]);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function fetchData(): Promise<void> {
    const res = await fetch("/api/armada", {
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      showToast("Gagal mengambil data armada", "error");
      return;
    }

    const result: ArmadaRow[] = await res.json();
    setData(result);
  }

  useEffect(() => {
    fetchData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Armada ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/armada/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      Swal.fire("Gagal", "Gagal menghapus", "error");
      return;
    }

    Swal.fire("Berhasil", "Data berhasil dihapus", "success");

    fetchData();
  }

  async function downloadExcel(): Promise<void> {
    const res = await fetch("/api/laporan/armada");

    const blob = await res.blob();

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "laporan-armada.xlsx";
    a.click();
  }
  async function downloadPerUnit(): Promise<void> {
    try {
      const res = await fetch("/api/laporan/armada-unit");

      if (!res.ok) {
        throw new Error();
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "laporan-armada-per-unit.xlsx";
      a.click();
    } catch {
      Swal.fire("Error", "Gagal download laporan", "error");
    }
  }

  return (
    <>
      <Card title="Transaksi Armada">
        <div className="overflow-x-auto">
          <div className="flex justify-end mb-4 gap-2">
            <Button onClick={downloadPerUnit}>
              <Download className="w-4 h-4 mr-2" />
              Laporan Per Unit
            </Button>
            <Button onClick={downloadExcel}>
              <HardDriveUpload className="w-4 h-4 mr-2" />
              Laporan Omset
            </Button>
          </div>
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Tanggal</th>
                <th className="p-2 border">Kode</th>
                <th className="p-2 border">No Polisi</th>
                <th className="p-2 border">Supir</th>
                <th className="p-2 border">Tagihan</th>
                <th className="p-2 border">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td className="p-2 border">{item.tanggal}</td>
                  <td className="p-2 border">{item.kode_transaksi}</td>
                  <td className="p-2 border">{item.no_polisi}</td>
                  <td className="p-2 border">{item.supir}</td>
                  <td className="p-2 border">
                    {item.jumlah_tagihan.toLocaleString()}
                  </td>
                  <td className="p-2 border flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        router.push(`/transaksi/armada/form/${item.id}`)
                      }
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="destructive"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
