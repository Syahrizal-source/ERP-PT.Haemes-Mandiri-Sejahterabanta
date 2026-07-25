"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Breakdown {
  id: string;
  equipment_id: string | null;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  penyebab: string | null;
  tindakan: string | null;
  durasi_jam: number | null;
  id_operator: string | null;
  id_proyek: string | null;
  created_at: string;
}

interface Equipment {
  id: string;
  asset_number: string;
}

interface Operator {
  id: string;
  nama: string;
}

interface Proyek {
  id: string;
  nama: string;
}

export default function BreakdownDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);

  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [equipmentName, setEquipmentName] = useState<string>("-");
  const [operatorName, setOperatorName] = useState<string>("-");
  const [proyekName, setProyekName] = useState<string>("");

  const [history, setHistory] = useState<Breakdown[]>([]);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const breakdownRes = await fetch(`/api/alat-berat/breakdown/${id}`);

      if (!breakdownRes.ok) {
        showToast("Gagal mengambil data breakdown", "error");
        setLoading(false);
        return;
      }

      const breakdownData: Breakdown = await breakdownRes.json();
      setBreakdown(breakdownData);

      const [eqRes, opRes, prRes] = await Promise.all([
        fetch("/api/alat-berat/master"),
        fetch("/api/alat-berat/operator"),
        fetch("/api/proyek/master"),
      ]);

      const equipments: Equipment[] = await eqRes.json();
      const operators: Operator[] = await opRes.json();
      const proyeks: Proyek[] = await prRes.json();

      const equipment = equipments.find(
        (item) => item.id === breakdownData.equipment_id,
      );

      const operator = operators.find(
        (item) => item.id === breakdownData.id_operator,
      );

      const proyek = proyeks.find(
        (item) => item.id === breakdownData.id_proyek,
      );

      setEquipmentName(equipment ? equipment.asset_number : "-");
      setOperatorName(operator ? operator.nama : "-");
      setProyekName(proyek ? proyek.nama : "-");

      const historyRes = await fetch("/api/alat-berat/breakdown");

      if (historyRes.ok) {
        const historyData: Breakdown[] = await historyRes.json();

        const filtered = historyData.filter(
          (item) => item.equipment_id === breakdownData.equipment_id,
        );

        setHistory(filtered);
      }

      setLoading(false);
    }

    fetchData();
  }, [id, showToast]);

  if (loading) {
    return (
      <div className="flex gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  if (!breakdown) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Detail Breakdown">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold">Equipment</p>
            <p>{equipmentName}</p>
          </div>

          <div>
            <p className="font-semibold">Operator</p>
            <p>{operatorName}</p>
          </div>

          <div>
            <p className="font-semibold">Proyek</p>
            <p>{proyekName}</p>
          </div>

          <div>
            <p className="font-semibold">Durasi Jam</p>
            <p>{breakdown.durasi_jam ?? "-"}</p>
          </div>

          <div>
            <p className="font-semibold">Mulai</p>
            <p>{breakdown.tanggal_mulai}</p>
          </div>

          <div>
            <p className="font-semibold">Selesai</p>
            <p>{breakdown.tanggal_selesai ?? "-"}</p>
          </div>

          <div>
            <p className="font-semibold">Penyebab</p>
            <p>{breakdown.penyebab ?? "-"}</p>
          </div>

          <div>
            <p className="font-semibold">Tindakan</p>
            <p>{breakdown.tindakan ?? "-"}</p>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/alat-berat/breakdown")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() =>
              router.push(`/alat-berat/breakdown/${breakdown.id}/edit`)
            }
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </Card>

      <Card title="History Breakdown Alat">
        <div className="overflow-x-auto">
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2">Mulai</th>
                <th className="border px-3 py-2">Selesai</th>
                <th className="border px-3 py-2">Durasi</th>
              </tr>
            </thead>

            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-4">
                    Tidak ada history
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id}>
                    <td className="border px-3 py-2">{item.tanggal_mulai}</td>
                    <td className="border px-3 py-2">
                      {item.tanggal_selesai ?? "-"}
                    </td>
                    <td className="border px-3 py-2">
                      {item.durasi_jam ?? "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
