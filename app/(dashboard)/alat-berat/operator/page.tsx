"use client";

import type { ReactElement } from "react";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Swal from "sweetalert2";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/toast-context";

interface Operator {
  id: string;
  nama: string;
  no_hp: string | null;
  sim: string | null;
  status: string;
  created_at: string;
}

export default function OperatorPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<Operator[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [page, setPage] = useState<number>(1);
  const limit = 10;

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function fetchData(): Promise<void> {
    setLoading(true);

    const res = await fetch("/api/alat-berat/operator");

    if (!res.ok) {
      showToast("Gagal mengambil data operator", "error");
      setLoading(false);
      return;
    }

    const result: Operator[] = await res.json();

    setData(result);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    let result = data;

    if (search !== "") {
      const keyword = search.toLowerCase();

      result = result.filter((item) =>
        item.nama.toLowerCase().includes(keyword),
      );
    }

    if (statusFilter !== "") {
      result = result.filter((item) => item.status === statusFilter);
    }

    return result;
  }, [data, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / limit));

  const paginatedData = useMemo(() => {
    const start = (page - 1) * limit;
    const end = start + limit;
    return filteredData.slice(start, end);
  }, [filteredData, page]);

  async function handleDelete(id: string): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Operator ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/alat-berat/operator/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      Swal.fire("Gagal", "Gagal menghapus", "error");
      return;
    }

    Swal.fire("Berhasil", "Data berhasil dihapus", "success");

    fetchData();
  }

  function renderStatus(status: string): ReactElement {
    if (status === "AKTIF") {
      return (
        <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded">
          AKTIF
        </span>
      );
    }

    return (
      <span className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded">
        NONAKTIF
      </span>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <Card title="Operator Alat Berat">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-64">
                <Search className="w-4 h-4 text-gray-500" />

                <Input
                  placeholder="Search operator..."
                  value={search}
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                />
              </div>

              <select
                className="border rounded px-3 py-2 text-sm min-w-[150px]"
                value={statusFilter}
                onChange={(e) => {
                  setPage(1);
                  setStatusFilter(e.target.value);
                }}
              >
                <option value="">Semua Status</option>
                <option value="AKTIF">AKTIF</option>
                <option value="NONAKTIF">NONAKTIF</option>
              </select>
            </div>

            <Button onClick={() => router.push("/alat-berat/operator/form")}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Operator
            </Button>
          </div>

          {loading ? (
            <div className="flex gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Memuat data...
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-3 py-2">Nama</th>
                      <th className="border px-3 py-2">No HP</th>
                      <th className="border px-3 py-2">SIM</th>
                      <th className="border px-3 py-2">Status</th>
                      <th className="border px-3 py-2 text-center">Aksi</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4">
                          Tidak ada data
                        </td>
                      </tr>
                    ) : (
                      paginatedData.map((item) => (
                        <tr key={item.id}>
                          <td className="border px-3 py-2">{item.nama}</td>

                          <td className="border px-3 py-2">
                            {item.no_hp ?? "-"}
                          </td>

                          <td className="border px-3 py-2">
                            {item.sim ?? "-"}
                          </td>

                          <td className="border px-3 py-2">
                            {renderStatus(item.status)}
                          </td>

                          <td className="border px-3 py-2">
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="secondary"
                                onClick={() =>
                                  router.push(`/alat-berat/operator/${item.id}`)
                                }
                              >
                                <Eye className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="secondary"
                                onClick={() =>
                                  router.push(
                                    `/alat-berat/operator/${item.id}/edit`,
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

              <div className="flex justify-center items-center gap-2 mt-4">
                <Button
                  variant="secondary"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <span className="text-sm">
                  Page {page} / {totalPages}
                </span>

                <Button
                  variant="secondary"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
