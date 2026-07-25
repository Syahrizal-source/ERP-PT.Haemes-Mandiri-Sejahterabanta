"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Eye, Pencil, Trash2, Loader2 } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";

interface PestControl {
  id: string;
  block_id: string;
  control_date: string;
  pest_type: string | null;
  severity_level: string | null;
  action_taken: string | null;
  chemical_used: string | null;
  cost: number;
  notes: string | null;
}

interface Block {
  id: string;
  code: string;
}

export default function PestControlPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<PestControl[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function fetchData(): Promise<void> {
    setLoading(true);

    const resData = await fetch("/api/kebun-sawit/pest-controls");
    const resBlocks = await fetch("/api/kebun-sawit/blocks");

    if (!resData.ok || !resBlocks.ok) {
      showToast("Gagal mengambil data pest control", "error");
      setLoading(false);
      return;
    }

    const pestData: PestControl[] = await resData.json();
    const blockData: Block[] = await resBlocks.json();

    setData(pestData);
    setBlocks(blockData);

    setLoading(false);
  }

  useEffect(() => {
    fetchData();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getBlockName(blockId: string): string {
    const block = blocks.find((b) => b.id === blockId);
    return block ? block.code : "-";
  }

  async function handleDelete(id: string): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Pest Controls ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/kebun-sawit/pest-controls/${id}`, {
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
        <Card title="Pest Control">
          <div className="flex justify-between mb-4">
            <div />

            <Button
              onClick={() => router.push("/kebun-sawit/pest-controls/form")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Pest Control
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Memuat data...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-3 py-2">Tanggal</th>
                    <th className="border px-3 py-2">Block</th>
                    <th className="border px-3 py-2">Jenis Hama</th>
                    <th className="border px-3 py-2">Severity</th>
                    <th className="border px-3 py-2">Chemical</th>
                    <th className="border px-3 py-2">Biaya</th>
                    <th className="border px-3 py-2 text-center">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4">
                        Tidak ada data
                      </td>
                    </tr>
                  ) : (
                    data.map((item) => (
                      <tr key={item.id}>
                        <td className="border px-3 py-2">
                          {item.control_date}
                        </td>

                        <td className="border px-3 py-2">
                          {getBlockName(item.block_id)}
                        </td>

                        <td className="border px-3 py-2">{item.pest_type}</td>

                        <td className="border px-3 py-2">
                          {item.severity_level}
                        </td>

                        <td className="border px-3 py-2">
                          {item.chemical_used}
                        </td>

                        <td className="border px-3 py-2 text-right">
                          {Number(item.cost).toLocaleString("id-ID")}
                        </td>

                        <td className="border px-3 py-2">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(
                                  `/kebun-sawit/pest-controls/${item.id}`,
                                )
                              }
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="secondary"
                              onClick={() =>
                                router.push(
                                  `/kebun-sawit/pest-controls/${item.id}/edit`,
                                )
                              }
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="destructive"
                              disabled={loadingId === item.id}
                              onClick={() => handleDelete(item.id)}
                            >
                              {loadingId === item.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
