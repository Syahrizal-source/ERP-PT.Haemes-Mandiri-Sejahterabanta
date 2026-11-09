"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Download } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type Vendor = {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
  npwp: string | null;
  nama_npwp: string | null;
  alamat_npwp: string | null;
  pkp: boolean;
  jenis_pajak: string | null;
};

type Ppn = {
  id: number;
  id_transaksi: number;
  vendor_id: number | null;
  nomor_seri: string | null;
  keterangan: string | null;
  jenis_ppn: "masukan" | "keluaran";
  nilai_dasar: number;
  tarif_ppn: number;
  nilai_ppn: number;
  tanggal_transaksi: string;
  vendors: Vendor | null;
};

export default function PPNPage(): React.JSX.Element {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<Ppn[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  async function fetchData(): Promise<void> {
    try {
      const res = await fetch("/api/ppn");

      if (!res.ok) {
        showToast("Gagal mengambil data", "error");
        return;
      }

      const result: Ppn[] = await res.json();
      setData(result);
    } catch {
      showToast("Terjadi kesalahan", "error");
    } finally {
      setLoading(false); // ✅ FIX WAJIB
    }
  }

  useEffect(() => {
    fetchData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus PPN ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/ppn/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      Swal.fire("Gagal", "Gagal menghapus", "error");
      return;
    }

    Swal.fire("Berhasil", "Data berhasil dihapus", "success");

    fetchData();
  }

  return (
    <Card title="Transaksi PPN">
      <div className="flex justify-end gap-2 mb-4">
        <Button onClick={() => router.push("/pajak/ppn/form")}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah
        </Button>

        <Button onClick={() => router.push("/pajak/ppn/laporan")}>
          <Download className="w-4 h-4 mr-2" />
          Laporan
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-4">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center p-4 text-gray-500">Belum ada data PPN</div>
      ) : (
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Tanggal</th>
              <th className="border p-2">Vendor</th>
              <th className="border p-2">Nomor Seri</th>
              <th className="border p-2">Jenis</th>
              <th className="border p-2 text-right">Dasar</th>
              <th className="border p-2 text-right">PPN</th>
              <th className="border p-2">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {data.map((item) => (
              <tr key={item.id}>
                <td className="border p-2">{item.tanggal_transaksi}</td>

                <td className="border p-2">
                  {item.vendors?.nama_vendor ?? "-"}
                </td>

                <td className="border p-2">{item.nomor_seri ?? "-"}</td>

                <td className="border p-2 capitalize">{item.jenis_ppn}</td>

                <td className="border p-2 text-right">
                  {Number(item.nilai_dasar).toLocaleString("id-ID")}
                </td>

                <td className="border p-2 text-right font-semibold text-blue-600">
                  {Number(item.nilai_ppn).toLocaleString("id-ID")}
                </td>

                <td className="border p-2">
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => router.push(`/pajak/ppn/${item.id}`)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="destructive"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
