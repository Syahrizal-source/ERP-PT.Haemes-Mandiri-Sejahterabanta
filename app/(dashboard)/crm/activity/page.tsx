"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

/* =========================
   TYPE (SESUAI DATABASE)
========================= */
interface Activity {
  id: string;
  id_lead: string | null;
  id_customer: string | null;
  catatan: string | null;
  tanggal: string | null;
  follow_up_date: string | null;
  tipe: string | null;
  status: string;
  assigned_to: string | null;
  created_at: string;
}

/* =========================
   PAGE
========================= */
export default function ActivityPage() {
  const router = useRouter();

  const [data, setData] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  /* =========================
     FETCH
  ========================= */
  async function fetchData(): Promise<void> {
    setLoading(true);

    const res = await fetch("/api/crm/activity");

    if (!res.ok) {
      setLoading(false);
      return;
    }

    const result: Activity[] = await res.json();
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
      text: "Hapus activity?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/crm/activity/${id}`, {
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
      <Card title="CRM Activity">
        {/* BUTTON */}
        <div className="flex justify-end mb-4">
          <Button onClick={() => router.push("/crm/activity/form")}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Activity
          </Button>
        </div>

        {/* LOADING */}
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
                  <th className="border px-3 py-2">Tipe</th>
                  <th className="border px-3 py-2">Catatan</th>
                  <th className="border px-3 py-2">Tanggal</th>
                  <th className="border px-3 py-2">Follow Up</th>
                  <th className="border px-3 py-2">Status</th>
                  <th className="border px-3 py-2">Assigned</th>
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
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() =>
                        router.push(`/crm/activity/${item.id}`)
                      }
                    >
                      <td className="border px-3 py-2">
                        {item.tipe ?? "-"}
                      </td>

                      <td className="border px-3 py-2 max-w-xs truncate">
                        {item.catatan ?? "-"}
                      </td>

                      <td className="border px-3 py-2">
                        {item.tanggal
                          ? new Date(item.tanggal).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                          : "-"}
                      </td>

                      <td className="border px-3 py-2">
                        {item.follow_up_date
                          ? new Date(item.follow_up_date).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                          : "-"}
                      </td>

                      <td className="border px-3 py-2">
                        <span
                          className={`text-xs px-2 py-1 rounded ${item.status === "DONE"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                            }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="border px-3 py-2">
                        {item.assigned_to ?? "-"}
                      </td>

                      {/* ACTION */}
                      <td
                        className="border px-3 py-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="secondary"
                            onClick={() =>
                              router.push(`/crm/activity/${item.id}/edit`)
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