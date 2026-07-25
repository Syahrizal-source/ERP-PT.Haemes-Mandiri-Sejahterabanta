"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface RekeningKoran {
  id: number;
  tanggal: string;
  deskripsi: string;
  debit: number;
  kredit: number;
  saldo: number;
  jenis: string;
}

export default function RekeningKoranPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<RekeningKoran[]>([]);

  async function fetchData(): Promise<void> {
    const res = await fetch("/api/rekening-koran");

    if (!res.ok) {
      showToast("Gagal mengambil data", "error");
      return;
    }

    const result: RekeningKoran[] = await res.json();
    setData(result);
  }

  useEffect(() => {
    fetchData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card title="Rekening Koran">
      <div className="flex justify-end mb-4">
        <Button onClick={() => router.push("/accounting/rekening-koran/form")}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah
        </Button>
      </div>

      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Tanggal</th>
            <th className="border p-2">Deskripsi</th>
            <th className="border p-2 text-right">Debit</th>
            <th className="border p-2 text-right">Kredit</th>
            <th className="border p-2 text-right">Saldo</th>
            <th className="border p-2">Jenis</th>
            <th className="border p-2">Aksi</th>
          </tr>
        </thead>

        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              <td className="border p-2">{item.tanggal}</td>
              <td className="border p-2">{item.deskripsi}</td>

              <td className="border p-2 text-right">
                {item.debit > 0 ? item.debit.toLocaleString("id-ID") : "-"}
              </td>

              <td className="border p-2 text-right">
                {item.kredit > 0 ? item.kredit.toLocaleString("id-ID") : "-"}
              </td>

              <td className="border p-2 text-right font-semibold">
                {item.saldo.toLocaleString("id-ID")}
              </td>

              <td className="border p-2">{item.jenis}</td>

              <td className="border p-2">
                <Button
                  onClick={() =>
                    router.push(`/accounting/rekening-koran/${item.id}`)
                  }
                >
                  Detail
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
