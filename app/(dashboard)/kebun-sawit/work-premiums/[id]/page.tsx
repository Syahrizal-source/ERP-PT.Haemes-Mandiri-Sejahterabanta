"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface WorkPremium {
  id: string;
  employee_id: string;
  block_id: string | null;
  work_date: string;
  work_type: string;
  work_result: number;
  rate: number;
  total_premium: number;
  pph21_rate: number;
  pph21_amount: number;
  total_after_tax: number;
}

interface Employee {
  id: string;
  name: string;
}

interface Block {
  id: string;
  code: string;
  division_id: string;
}

interface Division {
  id: string;
  name: string;
  estate_id: string;
}

interface Estate {
  id: string;
  name: string;
  region_id: string;
}

interface Region {
  id: string;
  name: string;
}

export default function WorkPremiumDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [data, setData] = useState<WorkPremium | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [block, setBlock] = useState<Block | null>(null);
  const [division, setDivision] = useState<Division | null>(null);
  const [estate, setEstate] = useState<Estate | null>(null);
  const [region, setRegion] = useState<Region | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      const res = await fetch(`/api/kebun-sawit/work-premiums/${id}`);

      if (!res.ok) return;

      const wp: WorkPremium = await res.json();
      setData(wp);

      const empRes = await fetch("/api/kebun-sawit/employees");
      if (empRes.ok) {
        const empList: Employee[] = await empRes.json();
        const found = empList.find((e) => e.id === wp.employee_id) ?? null;
        setEmployee(found);
      }

      if (!wp.block_id) return;

      const blockRes = await fetch("/api/kebun-sawit/blocks");
      if (!blockRes.ok) return;

      const blocks: Block[] = await blockRes.json();
      const blk = blocks.find((b) => b.id === wp.block_id) ?? null;

      if (!blk) return;

      setBlock(blk);

      const divRes = await fetch("/api/kebun-sawit/divisions");
      if (!divRes.ok) return;

      const divs: Division[] = await divRes.json();
      const div = divs.find((d) => d.id === blk.division_id) ?? null;

      if (!div) return;

      setDivision(div);

      const estRes = await fetch("/api/kebun-sawit/estate");
      if (!estRes.ok) return;

      const estates: Estate[] = await estRes.json();
      const est = estates.find((e) => e.id === div.estate_id) ?? null;

      if (!est) return;

      setEstate(est);

      const regRes = await fetch("/api/kebun-sawit/master");
      if (!regRes.ok) return;

      const regions: Region[] = await regRes.json();
      const reg = regions.find((r) => r.id === est.region_id) ?? null;

      setRegion(reg);
    }

    load();
  }, [id]);

  if (!data) return <div className="p-6">Memuat...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Detail Work Premium">
        <div className="grid grid-cols-2 gap-4">
          <div>Tanggal</div>
          <div>{data.work_date}</div>

          <div>Employee</div>
          <div>{employee?.name ?? "-"}</div>

          <div>Region</div>
          <div>{region?.name ?? "-"}</div>

          <div>Estate</div>
          <div>{estate?.name ?? "-"}</div>

          <div>Division</div>
          <div>{division?.name ?? "-"}</div>

          <div>Block</div>
          <div>{block?.code ?? "-"}</div>

          <div>Jenis Kerja</div>
          <div>{data.work_type}</div>

          <div>Hasil Kerja</div>
          <div>{data.work_result.toLocaleString("id-ID")}</div>

          <div>Rate</div>
          <div>{data.rate.toLocaleString("id-ID")}</div>

          <div>Total Premium</div>
          <div>{data.total_premium.toLocaleString("id-ID")}</div>

          <div>PPh21</div>
          <div>{data.pph21_amount.toLocaleString("id-ID")}</div>

          <div>Total Setelah Pajak</div>
          <div>{data.total_after_tax.toLocaleString("id-ID")}</div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/kebun-sawit/work-premiums")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() =>
              router.push(`/kebun-sawit/work-premiums/${data.id}/edit`)
            }
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </Card>
    </div>
  );
}
