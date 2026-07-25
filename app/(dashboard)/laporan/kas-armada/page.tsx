"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface CashFlow {
  cash_in: number;
  cash_out: number;
  net_cash: number;
}

export default function LaporanKasArmadaPage() {
  const [data, setData] = useState<CashFlow | null>(null);

  async function fetchData(): Promise<void> {
    const res = await fetch("/api/report/kas-armada/cash-flow");
    const json: CashFlow = await res.json();
    setData(json);
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (!data) {
    return <p>Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <Card title="Cash Flow Kas Armada">
        <div className="space-y-2 text-sm">
          <p>Cash In: {data.cash_in}</p>
          <p>Cash Out: {data.cash_out}</p>
          <p>Net Cash: {data.net_cash}</p>
        </div>

        <div className="mt-4">
          <Button
            onClick={() =>
              window.open("/api/report/kas-armada/cash-flow/export", "_blank")
            }
          >
            Export Excel + QR
          </Button>
        </div>
      </Card>
    </div>
  );
}
