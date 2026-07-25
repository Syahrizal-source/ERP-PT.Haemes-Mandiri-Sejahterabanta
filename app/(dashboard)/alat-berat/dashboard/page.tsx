"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { Loader2 } from "lucide-react";

interface Equipment {
  id: string;
  asset_number: string;
}

interface Breakdown {
  id: string;
  equipment_id: string | null;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  durasi_jam: number | null;
}

interface EquipmentStats {
  equipment_id: string;
  asset_number: string;
  total_breakdown: number;
  total_downtime: number;
  mtbf: number;
  mttr: number;
}

function normalizeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];

  if (
    typeof data === "object" &&
    data !== null &&
    "data" in data &&
    Array.isArray((data as { data: unknown }).data)
  ) {
    return (data as { data: T[] }).data;
  }

  return [];
}

export default function FleetDashboardPage() {
  const [loading, setLoading] = useState<boolean>(true);

  const [stats, setStats] = useState<EquipmentStats[]>([]);
  const [totalDowntime, setTotalDowntime] = useState<number>(0);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const [eqRes, bdRes] = await Promise.all([
        fetch("/api/alat-berat/master"),
        fetch("/api/alat-berat/breakdown"),
      ]);

      const eqJson = await eqRes.json();
      const bdJson = await bdRes.json();

      const equipments = normalizeArray<Equipment>(eqJson);
      const breakdowns = normalizeArray<Breakdown>(bdJson);

      const statsMap: Record<string, EquipmentStats> = {};

      equipments.forEach((eq) => {
        statsMap[eq.id] = {
          equipment_id: eq.id,
          asset_number: eq.asset_number,
          total_breakdown: 0,
          total_downtime: 0,
          mtbf: 0,
          mttr: 0,
        };
      });

      breakdowns.forEach((bd) => {
        if (!bd.equipment_id) return;

        const stat = statsMap[bd.equipment_id];

        if (!stat) return;

        stat.total_breakdown += 1;

        const durasi = bd.durasi_jam ?? 0;

        stat.total_downtime += durasi;
      });

      const statsArray: EquipmentStats[] = Object.values(statsMap);

      statsArray.forEach((s) => {
        if (s.total_breakdown > 0) {
          s.mttr = Number((s.total_downtime / s.total_breakdown).toFixed(2));
        }

        const operatingHours = 720;

        if (s.total_breakdown > 0) {
          s.mtbf = Number((operatingHours / s.total_breakdown).toFixed(2));
        }
      });

      const downtime = statsArray.reduce(
        (acc, item) => acc + item.total_downtime,
        0,
      );

      setTotalDowntime(downtime);

      const sorted = [...statsArray].sort(
        (a, b) => b.total_breakdown - a.total_breakdown,
      );

      setStats(sorted);

      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat dashboard...
      </div>
    );
  }

  const topFailure = stats.slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Card title="Fleet Health Overview">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="border rounded p-4">
            <p className="text-sm text-gray-500">Total Equipment</p>
            <p className="text-2xl font-bold">{stats.length}</p>
          </div>

          <div className="border rounded p-4">
            <p className="text-sm text-gray-500">Total Downtime (Jam)</p>
            <p className="text-2xl font-bold">{totalDowntime.toFixed(2)}</p>
          </div>

          <div className="border rounded p-4">
            <p className="text-sm text-gray-500">Total Breakdown</p>
            <p className="text-2xl font-bold">
              {stats.reduce((acc, s) => acc + s.total_breakdown, 0)}
            </p>
          </div>
        </div>
      </Card>

      <Card title="MTBF & MTTR Equipment">
        <div className="overflow-x-auto">
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2">Equipment</th>
                <th className="border px-3 py-2">Breakdown</th>
                <th className="border px-3 py-2">Downtime</th>
                <th className="border px-3 py-2">MTBF (Jam)</th>
                <th className="border px-3 py-2">MTTR (Jam)</th>
              </tr>
            </thead>

            <tbody>
              {stats.map((item) => (
                <tr key={item.equipment_id}>
                  <td className="border px-3 py-2">{item.asset_number}</td>

                  <td className="border px-3 py-2 text-center">
                    {item.total_breakdown}
                  </td>

                  <td className="border px-3 py-2 text-center">
                    {item.total_downtime.toFixed(2)}
                  </td>

                  <td className="border px-3 py-2 text-center">{item.mtbf}</td>

                  <td className="border px-3 py-2 text-center">{item.mttr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Ranking Alat Paling Sering Rusak">
        <div className="space-y-3">
          {topFailure.map((item) => (
            <div
              key={item.equipment_id}
              className="border rounded p-3 flex justify-between items-center"
            >
              <span className="font-medium">{item.asset_number}</span>

              <span className="text-red-600 font-semibold">
                {item.total_breakdown} Breakdown
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Downtime Chart (Jam)">
        <div className="space-y-2">
          {stats.map((item) => {
            const width = item.total_downtime * 10;

            return (
              <div key={item.equipment_id}>
                <div className="text-sm mb-1">
                  {item.asset_number} ({item.total_downtime.toFixed(2)} jam)
                </div>

                <div className="w-full bg-gray-200 h-4 rounded">
                  <div
                    className="bg-red-500 h-4 rounded"
                    style={{ width: `${width}px` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
