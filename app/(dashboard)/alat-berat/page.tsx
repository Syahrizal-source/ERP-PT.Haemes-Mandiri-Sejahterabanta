"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Card from "@/components/ui/Card";

interface RingkasanAlatBerat {
  total_equipment: number;
  total_operator: number;
  total_operation_jam: number;
  total_fuel: number;
  total_maintenance: number;
  total_breakdown: number;
  total_rental: number;
  total_depreciation: number;
}

export default function DashboardAlatBerat() {
  const router = useRouter();

  const [ringkasan, setRingkasan] = useState<RingkasanAlatBerat | null>(null);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch("/api/alat-berat/ringkasan");

      const data: RingkasanAlatBerat = await res.json();

      setRingkasan(data);
    }

    fetchData();
  }, []);

  if (!ringkasan) return null;

  return (
    <Card title="Ringkasan Alat Berat">
      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        <div
          className="cursor-pointer"
          onClick={() => router.push("/alat-berat/master")}
        >
          <p className="text-xs text-gray-500 mb-1">Total Equipment</p>
          <p className="text-lg font-semibold">
            {Number(ringkasan.total_equipment).toLocaleString("id-ID")}
          </p>
        </div>

        <div
          className="cursor-pointer"
          onClick={() => router.push("/alat-berat/operator")}
        >
          <p className="text-xs text-gray-500 mb-1">Total Operator</p>
          <p className="text-lg font-semibold">
            {Number(ringkasan.total_operator).toLocaleString("id-ID")}
          </p>
        </div>

        <div
          className="cursor-pointer"
          onClick={() => router.push("/alat-berat/operation")}
        >
          <p className="text-xs text-gray-500 mb-1">Total Jam Operasi</p>
          <p className="text-lg font-semibold">
            {Number(ringkasan.total_operation_jam).toLocaleString("id-ID")}
          </p>
        </div>

        <div
          className="cursor-pointer"
          onClick={() => router.push("/alat-berat/fuel")}
        >
          <p className="text-xs text-gray-500 mb-1">Total Fuel Cost</p>
          <p className="text-lg font-semibold text-orange-600">
            {Number(ringkasan.total_fuel).toLocaleString("id-ID")}
          </p>
        </div>

        <div
          className="cursor-pointer"
          onClick={() => router.push("/alat-berat/maintenance")}
        >
          <p className="text-xs text-gray-500 mb-1">Total Maintenance</p>
          <p className="text-lg font-semibold text-red-600">
            {Number(ringkasan.total_maintenance).toLocaleString("id-ID")}
          </p>
        </div>

        <div
          className="cursor-pointer"
          onClick={() => router.push("/alat-berat/breakdown")}
        >
          <p className="text-xs text-gray-500 mb-1">Total Breakdown</p>
          <p className="text-lg font-semibold">
            {Number(ringkasan.total_breakdown).toLocaleString("id-ID")}
          </p>
        </div>

        <div
          className="cursor-pointer"
          onClick={() => router.push("/alat-berat/rental")}
        >
          <p className="text-xs text-gray-500 mb-1">Total Rental Revenue</p>
          <p className="text-lg font-semibold text-green-600">
            {Number(ringkasan.total_rental).toLocaleString("id-ID")}
          </p>
        </div>

        <div
          className="cursor-pointer"
          onClick={() => router.push("/alat-berat/depreciation")}
        >
          <p className="text-xs text-gray-500 mb-1">Total Depreciation</p>
          <p className="text-lg font-semibold text-gray-700">
            {Number(ringkasan.total_depreciation).toLocaleString("id-ID")}
          </p>
        </div>
      </div>
    </Card>
  );
}
