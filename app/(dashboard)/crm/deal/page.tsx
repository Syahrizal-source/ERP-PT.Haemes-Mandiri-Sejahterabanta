"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type Deal = {
  id: string;
  id_customer: string | null;
  nama_deal: string;
  nilai: number;
  tahap: string;
  probabilitas: number | null;
  closing_date: string | null;
  created_at: string;
};

export default function DealPage() {
  const router = useRouter();
  const [data, setData] = useState<Deal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  async function fetchData(): Promise<void> {
    setLoading(true);
    const res = await fetch("/api/crm/deal");
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const result: Deal[] = await res.json();
    setData(result);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();// eslint-disable-next-line react-hooks/exhaustive-deps

  }, []);

  async function handleDelete(id: string): Promise<void> {
    const confirm = await Swal.fire({
      title: "Hapus Deal?",
      icon: "warning",
      showCancelButton: true,
    });

    if (!confirm.isConfirmed) return;

    await fetch(`/api/crm/deal/${id}`, { method: "DELETE" });
    fetchData();
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Card title="CRM Deal">
        <div className="flex justify-end mb-4">
          <Button onClick={() => router.push("/crm/deal/form")}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Deal
          </Button>
        </div>

        {loading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th>Nama Deal</th>
                <th>Nilai</th>
                <th>Tahap</th>
                <th>Probabilitas</th>
                <th>Closing</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr
                  key={item.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/crm/deal/${item.id}`)}
                >
                  <td>{item.nama_deal}</td>
                  <td>
                    Rp {item.nilai.toLocaleString("id-ID")}
                  </td>
                  <td>{item.tahap}</td>
                  <td>{item.probabilitas ?? "-"}</td>
                  <td>
                    {item.closing_date ?? "-"}
                  </td>
                  <td
                    className="border px-3 py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-center items-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          router.push(`/crm/deal/${item.id}/edit`)
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
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}