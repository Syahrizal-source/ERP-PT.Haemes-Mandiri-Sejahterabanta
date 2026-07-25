"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Eye } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Payroll {
  id: number;
  bulan: number;
  tahun: number;
  total_gaji: number;
  total_tunjangan: number;
  total_potongan: number;
  pph21: number;
  bpjs: number;
  net_gaji: number;
}

export default function PayrollPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  async function fetchData(): Promise<void> {
    const res = await fetch("/api/payroll");

    if (!res.ok) {
      showToast("Gagal mengambil payroll", "error");
      setLoading(false);
      return;
    }

    const result: Payroll[] = await res.json();

    setData(result);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalGaji = data.reduce((acc, d) => acc + d.total_gaji, 0);
  const totalNet = data.reduce((acc, d) => acc + d.net_gaji, 0);

  return (
    <div className="max-w-7xl mx-auto">
      <Card title="Payroll">
        <div className="flex justify-between mb-4">
          <div className="text-sm">
            <p>Total Gaji: {totalGaji.toLocaleString("id-ID")}</p>
            <p>Total Net: {totalNet.toLocaleString("id-ID")}</p>
          </div>

          <Button onClick={() => router.push("/payroll/form")}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Payroll
          </Button>
        </div>

        {loading ? (
          <div className="flex gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Memuat...
          </div>
        ) : (
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2">Periode</th>
                <th className="border px-3 py-2">Gaji</th>
                <th className="border px-3 py-2">Net</th>
                <th className="border px-3 py-2">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td className="border px-3 py-2">
                    {item.bulan}/{item.tahun}
                  </td>

                  <td className="border px-3 py-2">
                    {item.total_gaji.toLocaleString("id-ID")}
                  </td>

                  <td className="border px-3 py-2">
                    {item.net_gaji.toLocaleString("id-ID")}
                  </td>

                  <td className="border px-3 py-2 text-center">
                    <Button
                      variant="secondary"
                      onClick={() => router.push(`/payroll/${item.id}/slip`)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
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
