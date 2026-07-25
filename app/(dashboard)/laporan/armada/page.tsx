"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Send, Loader2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface NeracaRow {
  tipe: string;
  saldo: number;
}

interface LabaRugiRow {
  tipe: string;
  saldo: number;
}

interface CashFlowRow {
  cash_in: number;
  cash_out: number;
  net_cash: number;
}

interface CostControlRow {
  tanggal: string;
  kode: string;
  nama: string;
  nominal: number;
}

export default function ArmadaReportPage() {
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");

  const [neraca, setNeraca] = useState<NeracaRow[]>([]);
  const [labaRugi, setLabaRugi] = useState<LabaRugiRow[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlowRow | null>(null);
  const [costControl, setCostControl] = useState<CostControlRow[]>([]);

  const [loading, setLoading] = useState<boolean>(false);

  async function fetchReports(): Promise<void> {
    setLoading(true);

    const query = `?start=${start}&end=${end}`;

    const neracaRes = await fetch(`/api/report/armada/neraca${query}`);
    const labaRes = await fetch(`/api/report/armada/laba-rugi${query}`);
    const cashRes = await fetch(`/api/report/armada/cash-flow${query}`);
    const costRes = await fetch(`/api/report/armada/cost-control${query}`);

    const neracaData: NeracaRow[] = await neracaRes.json();
    const labaData: LabaRugiRow[] = await labaRes.json();
    const cashData: CashFlowRow = await cashRes.json();
    const costData: CostControlRow[] = await costRes.json();

    setNeraca(neracaData);
    setLabaRugi(labaData);
    setCashFlow(cashData);
    setCostControl(costData);

    setLoading(false);
  }

  async function handleExport(type: string): Promise<void> {
    window.open(`/api/report/armada/${type}/export`, "_blank");
  }

  return (
    <div className="space-y-6">
      <Card title="Laporan Armada Profesional">
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
          <div className="flex items-end">
            <Button onClick={fetchReports} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* NERACA */}
      <Card title="Neraca">
        <div className="space-y-2">
          {neraca.map((row) => (
            <div key={row.tipe} className="flex justify-between border-b pb-1">
              <span>{row.tipe}</span>
              <span>{row.saldo.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Button onClick={() => handleExport("neraca")} className="gap-2">
            <Download className="w-4 h-4" />
            Export Excel
          </Button>
        </div>
      </Card>

      {/* LABA RUGI */}
      <Card title="Laba Rugi">
        <div className="space-y-2">
          {labaRugi.map((row) => (
            <div key={row.tipe} className="flex justify-between border-b pb-1">
              <span>{row.tipe}</span>
              <span>{row.saldo.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Button onClick={() => handleExport("laba-rugi")} className="gap-2">
            <Download className="w-4 h-4" />
            Export Excel
          </Button>
        </div>
      </Card>

      {/* CASH FLOW */}
      <Card title="Cash Flow">
        {cashFlow && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Cash In</span>
              <span>{cashFlow.cash_in.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Cash Out</span>
              <span>{cashFlow.cash_out.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Net Cash</span>
              <span>{cashFlow.net_cash.toLocaleString()}</span>
            </div>
          </div>
        )}
        <div className="mt-4">
          <Button onClick={() => handleExport("cash-flow")} className="gap-2">
            <Download className="w-4 h-4" />
            Export Excel
          </Button>
        </div>
      </Card>

      {/* COST CONTROL */}
      <Card title="Cost Control">
        <div className="space-y-2">
          {costControl.map((row, index) => (
            <div key={index} className="flex justify-between border-b pb-1">
              <span>{row.nama}</span>
              <span>{row.nominal.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Button
            onClick={() => handleExport("cost-control")}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </Button>
        </div>
      </Card>
    </div>
  );
}
