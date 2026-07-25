"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface PiutangInternalRow {
  id_piutang: number;
  tanggal: string;
  pihak: string;
  keterangan: string;
  nominal: number;
  status: string;
}

export default function PiutangInternalPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<PiutangInternalRow[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function fetchData(): Promise<void> {
    const res = await fetch("/api/piutang-internal");
    if (!res.ok) {
      showToast("Gagal mengambil data piutang internal", "error");
      return;
    }
    const result: PiutangInternalRow[] = await res.json();
    setData(result);
  }

  useEffect(() => {
    fetchData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Piutang Internal ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/piutang-internal/${id}`, {
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
      <Card
        title="Piutang Internal"
        action={
          <Button
            onClick={() => router.push("/accounting/piutang-internal/form")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambahkan
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Tanggal</th>
                <th className="p-2 border">Pihak</th>
                <th className="p-2 border">Nominal</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    Belum ada data
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id_piutang}>
                    <td className="p-2 border">{item.tanggal}</td>
                    <td className="p-2 border">{item.pihak}</td>
                    <td className="p-2 border">
                      {item.nominal.toLocaleString()}
                    </td>
                    <td className="p-2 border">{item.status}</td>
                    <td className="p-2 border flex justify-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          router.push(
                            `/accounting/piutang-internal/${item.id_piutang}`,
                          )
                        }
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={() =>
                          router.push(
                            `/accounting/piutang-internal/${item.id_piutang}/edit`,
                          )
                        }
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="destructive"
                        onClick={() => handleDelete(item.id_piutang)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
