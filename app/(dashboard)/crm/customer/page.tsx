"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

/* =========================
   TYPE (UPDATE SESUAI DB)
========================= */
interface Customer {
  id: string;
  nama: string;
  perusahaan: string | null;
  email: string | null;
  telp: string | null;
  alamat: string | null;
  industri: string | null;
  created_at: string;
}

export default function CustomerPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  /* =========================
     FETCH
  ========================= */
  async function fetchData(): Promise<void> {
    setLoading(true);

    const res = await fetch("/api/crm/customer");

    if (!res.ok) {
      showToast("Gagal mengambil data", "error");
      setLoading(false);
      return;
    }

    const result: Customer[] = await res.json();
    setData(result);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     DELETE
  ========================= */
  async function handleDelete(id: string): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi",
      text: "Hapus customer?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/crm/customer/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      Swal.fire("Error", "Gagal hapus", "error");
      return;
    }

    Swal.fire("Berhasil", "Data dihapus", "success");
    fetchData();
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Card title="CRM Customer">
        {/* BUTTON */}
        <div className="flex justify-end mb-4">
          <Button onClick={() => router.push("/crm/customer/form")}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Customer
          </Button>
        </div>

        {loading ? (
          <div className="flex gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Memuat...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-2">Nama</th>
                  <th className="border px-2 py-2">Perusahaan</th>
                  <th className="border px-2 py-2">Email</th>
                  <th className="border px-2 py-2">Telepon</th>
                  <th className="border px-2 py-2">Industri</th>
                  <th className="border px-2 py-2">Dibuat</th>
                  <th className="border px-2 py-2 text-center">Aksi</th>
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
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() =>
                        router.push(`/crm/customer/${item.id}`)
                      }
                    >
                      <td className="border px-2 py-2">{item.nama}</td>
                      <td className="border px-2 py-2">
                        {item.perusahaan ?? "-"}
                      </td>
                      <td className="border px-2 py-2">
                        {item.email ?? "-"}
                      </td>
                      <td className="border px-2 py-2">
                        {item.telp ?? "-"}
                      </td>
                      <td className="border px-2 py-2">
                        {item.industri ?? "-"}
                      </td>
                      <td className="border px-2 py-2">
                        {new Date(item.created_at).toLocaleDateString("id-ID")}
                      </td>

                      {/* STOP PROPAGATION BIAR BUTTON GA KE-CLICK ROW */}
                      <td
                        className="border px-2 py-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="secondary"
                            onClick={() =>
                              router.push(
                                `/crm/customer/${item.id}/edit`,
                              )
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
  );
}