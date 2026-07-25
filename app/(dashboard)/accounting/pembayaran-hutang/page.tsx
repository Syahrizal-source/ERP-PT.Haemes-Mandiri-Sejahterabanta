"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Eye, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface PembayaranHutang {
  id: number;
  tanggal: string;
  id_hutang: number;
  nominal: number;
  ppn: number;
  pph23: number;
  total: number;
  keterangan: string;
}

export default function Page() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<PembayaranHutang[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteId, setlDeleteId] = useState<number | null>(null);

  async function fetchData(): Promise<void> {
    setLoading(true);

    const res = await fetch("/api/pembayaran-hutang");

    if (!res.ok) {
      showToast("Gagal mengambil data", "error");
      setLoading(false);
      return;
    }

    const result: PembayaranHutang[] = await res.json();

    setData(result);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Pembayaran Hutang ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/pembayaran-hutang/${id}`, {
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
    <>
      <div className="max-w-7xl mx-auto">
        <Card title="Pembayaran Hutang">
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => router.push("/accounting/pembayaran-hutang/form")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah
            </Button>
          </div>

          {loading ? (
            <Loader2 className="animate-spin w-4 h-4" />
          ) : (
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-3 py-2">Tanggal</th>
                  <th className="border px-3 py-2">Nominal</th>
                  <th className="border px-3 py-2">PPN</th>
                  <th className="border px-3 py-2">PPh23</th>
                  <th className="border px-3 py-2">Total</th>
                  <th className="border px-3 py-2">Keterangan</th>
                  <th className="border px-3 py-2">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {data.map((item) => (
                  <tr key={item.id}>
                    <td className="border px-3 py-2">{item.tanggal}</td>
                    <td className="border px-3 py-2">
                      {item.nominal.toLocaleString("id-ID")}
                    </td>
                    <td className="border px-3 py-2">
                      {item.ppn.toLocaleString("id-ID")}
                    </td>
                    <td className="border px-3 py-2">
                      {item.pph23.toLocaleString("id-ID")}
                    </td>
                    <td className="border px-3 py-2">
                      {item.total.toLocaleString("id-ID")}
                    </td>
                    <td className="border px-3 py-2">{item.keterangan}</td>

                    <td className="border px-3 py-2">
                      <div className="flex gap-2 justify-center">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            router.push(
                              `/accounting/pembayaran-hutang/${item.id}`,
                            )
                          }
                        >
                          <Eye className="w-4 h-4" />
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
      </div>
    </>
  );
}
