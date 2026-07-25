"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Equipment {
  id: string;
  asset_number: string;
}

interface Proyek {
  id: string;
  nama: string;
}

interface Mutation {
  id: string;
  equipment_id: string | null;
  tanggal: string | null;
  dari_lokasi: string | null;
  ke_lokasi: string | null;
  id_proyek: string | null;
  created_at: string;
}

export default function MutationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);

  const [mutation, setMutation] = useState<Mutation | null>(null);
  const [equipmentName, setEquipmentName] = useState<string>("-");
  const [proyekName, setProyekName] = useState<string>("");

  const [history, setHistory] = useState<Mutation[]>([]);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const mutationRes = await fetch(`/api/alat-berat/mutation/${id}`);

      if (!mutationRes.ok) {
        showToast("Gagal mengambil data mutation", "error");
        setLoading(false);
        return;
      }

      const mutationData: Mutation = await mutationRes.json();

      setMutation(mutationData);

      const equipmentRes = await fetch("/api/alat-berat/master");
      const proyekRes = await fetch("/api/proyek/master");

      const equipments: Equipment[] = await equipmentRes.json();
      const proyeks: Proyek[] = await proyekRes.json();

      const equipment = equipments.find(
        (item) => item.id === mutationData.equipment_id,
      );

      const proyek = proyeks.find((item) => item.id === mutationData.id_proyek);

      setEquipmentName(equipment ? equipment.asset_number : "-");
      setProyekName(proyek ? proyek.nama : "-");

      const historyRes = await fetch("/api/alat-berat/mutation");

      if (historyRes.ok) {
        const historyData: Mutation[] = await historyRes.json();

        const filtered = historyData.filter(
          (item) => item.equipment_id === mutationData.equipment_id,
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

  if (!mutation) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Detail Mutation">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold">Equipment</p>
            <p>{equipmentName}</p>
          </div>

          <div>
            <p className="font-semibold">Tanggal</p>
            <p>{mutation.tanggal ?? "-"}</p>
          </div>

          <div>
            <p className="font-semibold">Dari Lokasi</p>
            <p>{mutation.dari_lokasi ?? "-"}</p>
          </div>

          <div>
            <p className="font-semibold">Ke Lokasi</p>
            <p>{mutation.ke_lokasi ?? "-"}</p>
          </div>

          <div>
            <p className="font-semibold">Proyek</p>
            <p>{proyekName}</p>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/alat-berat/mutation")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() =>
              router.push(`/alat-berat/mutation/${mutation.id}/edit`)
            }
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </Card>

      <Card title="History Perpindahan Alat">
        <div className="overflow-x-auto">
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2">Tanggal</th>
                <th className="border px-3 py-2">Dari</th>
                <th className="border px-3 py-2">Ke</th>
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
                    <td className="border px-3 py-2">{item.tanggal ?? "-"}</td>
                    <td className="border px-3 py-2">
                      {item.dari_lokasi ?? "-"}
                    </td>
                    <td className="border px-3 py-2">
                      {item.ke_lokasi ?? "-"}
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
