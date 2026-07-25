"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import ChartCard from "@/components/ui/ChartCard";

import Card from "@/components/ui/Card";
import { useToast } from "@/components/ui/toast-context";

/* ================= TYPES ================= */

interface DashboardData {
  totalJurnal: number;
  totalDebit: number;
  totalKredit: number;
  totalProyek: number;
  totalPayroll: number;
  totalFuel: number;
  totalRental: number;
}

interface KasArmada {
  id: string;
  tanggal: string;
  sopir: string;
  penerimaan: number;
  pengeluaran: number;
}

interface Armada {
  id: string;
  tanggal: string;
  kode_transaksi: string;
  no_polisi: string;
  supir: string;
  tagihan: number;
}

/* ================= PAGE ================= */

export default function DashboardPage() {
  const { showToast } = useToast();
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [kas, setKas] = useState<KasArmada[]>([]);
  const [armada, setArmada] = useState<Armada[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  async function fetchData(): Promise<void> {
    try {
      const [resDashboard, resKas, resArmada] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/dashboard/kas-armada"),
        fetch("/api/armada"),
      ]);

      if (!resDashboard.ok || !resKas.ok || !resArmada.ok) {
        showToast("Gagal mengambil dashboard", "error");
        setLoading(false);
        return;
      }

      const dashboardData: DashboardData = await resDashboard.json();
      const kasData: KasArmada[] = await resKas.json();
      const armadaData: Armada[] = await resArmada.json();

      setData(dashboardData);
      setKas(kasData);
      setArmada(armadaData);
      setLoading(false);
    } catch {
      showToast("Terjadi kesalahan", "error");
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat dashboard...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ================= KPI ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => router.push("/accounting/jurnal")}
          className="cursor-pointer hover:scale-[1.02] transition"
        >
          <Card title="Jurnal">
            <p className="text-sm">Total: {data.totalJurnal}</p>
            <p className="text-green-600 text-sm">
              Debit: {data.totalDebit.toLocaleString("id-ID")}
            </p>
            <p className="text-red-600 text-sm">
              Kredit: {data.totalKredit.toLocaleString("id-ID")}
            </p>
          </Card>
        </div>

        <div
          onClick={() => router.push("/proyek")}
          className="cursor-pointer hover:scale-[1.02] transition"
        >
          <Card title="Proyek">
            <p className="text-lg font-semibold">{data.totalProyek}</p>
          </Card>
        </div>

        <div
          onClick={() => router.push("/payroll")}
          className="cursor-pointer hover:scale-[1.02] transition"
        >
          <Card title="Payroll">
            <p className="text-lg font-semibold">
              {data.totalPayroll.toLocaleString("id-ID")}
            </p>
          </Card>
        </div>

        <div
          onClick={() => router.push("/alat-berat")}
          className="cursor-pointer hover:scale-[1.02] transition"
        >
          <Card title="Alat Berat">
            <p className="text-sm">
              Fuel: {data.totalFuel.toLocaleString("id-ID")}
            </p>
            <p className="text-sm">
              Rental: {data.totalRental.toLocaleString("id-ID")}
            </p>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ChartCard
          title="Jurnal (Debit vs Kredit)"
          labels={["Debit", "Kredit"]}
          data={[1557409998380, 1556050998380]}
        />

        <ChartCard
          title="Payroll"
          labels={["Gaji"]}
          data={[16160000]}
        />

        <ChartCard
          title="Alat Berat"
          labels={["Fuel", "Rental"]}
          data={[137680000000, 8944649000]}
        />

        <ChartCard
          title="Produksi TBS (Kg)"
          labels={[
            "21/03 BLK-DRI-02",
            "12/03 BLK-DRI-02",
            "08/03 BLK-BLM-01",
          ]}
          data={[66.5, 60, 1500]}
        />

        <ChartCard
          title="Brondolan (Kg)"
          labels={[
            "21/03",
            "12/03",
            "08/03",
          ]}
          data={[30, 30, 240]}
        />

        <ChartCard
          title="Kas Armada (Penerimaan)"
          labels={kas.map((k) => k.tanggal)}
          data={kas.map((k) => k.penerimaan)}
        />

        <ChartCard
          title="Kas Armada (Pengeluaran)"
          labels={kas.map((k) => k.tanggal)}
          data={kas.map((k) => k.pengeluaran)}
        />

        {/* TAGIHAN ARMADA */}
        <ChartCard
          title="Tagihan Armada"
          labels={armada.map((a) => a.supir)}
          data={armada.map((a) => a.tagihan)}
        />

      </div>

      {/* ================= GRID CONTENT ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ================= KAS ARMADA ================= */}
        <Card title="Transaksi Kas Armada">
          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-3 py-2">Tanggal</th>
                  <th className="border px-3 py-2">Sopir</th>
                  <th className="border px-3 py-2">Penerimaan</th>
                  <th className="border px-3 py-2">Pengeluaran</th>
                </tr>
              </thead>
              <tbody>
                {kas.map((item) => (
                  <tr key={item.id}>
                    <td className="border px-3 py-2">{item.tanggal}</td>
                    <td className="border px-3 py-2">{item.sopir}</td>
                    <td className="border px-3 py-2 text-green-600">
                      {item.penerimaan.toLocaleString("id-ID")}
                    </td>
                    <td className="border px-3 py-2 text-red-600">
                      {item.pengeluaran.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ================= ARMADA ================= */}
        <Card title="Transaksi Armada">
          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-3 py-2">Tanggal</th>
                  <th className="border px-3 py-2">Kode Transaksi</th>
                  <th className="border px-3 py-2">No Polisi</th>
                  <th className="border px-3 py-2">Supir</th>
                  <th className="border px-3 py-2">Tagihan</th>
                </tr>
              </thead>
              <tbody>
                {armada.map((item) => (
                  <tr key={item.id}>
                    <td className="border px-3 py-2">{item.tanggal}</td>
                    <td className="border px-3 py-2">{item.kode_transaksi}</td>
                    <td className="border px-3 py-2">{item.no_polisi}</td>
                    <td className="border px-3 py-2">{item.supir}</td>
                    <td className="border px-3 py-2 text-right">
                      {item.tagihan.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
