"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type Lead = {
  id: string;
  id_customer: string | null;
  sumber: string | null;
  status: string;
  minat: string | null;
  budget: number | null;
  timeline: string | null;
  created_at: string;
};

export default function LeadPage() {
  const router = useRouter();
  const [data, setData] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  async function fetchData(): Promise<void> {
    setLoading(true);
    const res = await fetch("/api/crm/lead");

    if (!res.ok) {
      setLoading(false);
      return;
    }

    const result: Lead[] = await res.json();
    setData(result);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: string): Promise<void> {
    const confirm = await Swal.fire({
      title: "Hapus Lead?",
      icon: "warning",
      showCancelButton: true,
    });

    if (!confirm.isConfirmed) return;

    await fetch(`/api/crm/lead/${id}`, { method: "DELETE" });
    fetchData();
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Card title="CRM Lead">
        <div className="flex justify-end mb-4">
          <Button onClick={() => router.push("/crm/lead/form")}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Lead
          </Button>
        </div>

        {loading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2 text-left">Status</th>
                <th className="border px-3 py-2 text-left">Sumber</th>
                <th className="border px-3 py-2 text-left">Minat</th>
                <th className="border px-3 py-2 text-right">Budget</th>
                <th className="border px-3 py-2 text-left">Timeline</th>
                <th className="border px-3 py-2 text-center">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/crm/lead/${item.id}`)}
                  >
                    <td className="border px-3 py-2 font-medium">
                      {item.status}
                    </td>

                    <td className="border px-3 py-2">
                      {item.sumber ?? "-"}
                    </td>

                    <td className="border px-3 py-2 max-w-xs truncate">
                      {item.minat ?? "-"}
                    </td>

                    <td className="border px-3 py-2 text-right whitespace-nowrap">
                      {item.budget !== null
                        ? item.budget.toLocaleString("id-ID")
                        : "-"}
                    </td>

                    <td className="border px-3 py-2">
                      {item.timeline ?? "-"}
                    </td>

                    <td
                      className="border px-3 py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            router.push(`/crm/lead/${item.id}/edit`)
                          }
                        >
                          Edit
                        </Button>

                        <Button
                          variant="destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}