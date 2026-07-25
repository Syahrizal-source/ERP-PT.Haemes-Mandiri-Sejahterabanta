"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type LeadForm = {
  sumber: string;
  status: string;
  minat: string;
  budget: number;
  timeline: string;
};

export default function CreateLeadPage() {
  const router = useRouter();

  const [form, setForm] = useState<LeadForm>({
    sumber: "",
    status: "NEW",
    minat: "",
    budget: 0,
    timeline: "",
  });

  function handleChange<K extends keyof LeadForm>(
    field: K,
    value: LeadForm[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(): Promise<void> {
    await fetch("/api/crm/lead", {
      method: "POST",
      body: JSON.stringify(form),
    });

    router.push("/crm/lead");
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Lead">
        <div className="grid grid-cols-2 gap-4">
          <Input placeholder="Sumber" value={form.sumber} onChange={(e) => handleChange("sumber", e.target.value)} />
          <Input placeholder="Minat" value={form.minat} onChange={(e) => handleChange("minat", e.target.value)} />
          <Input type="number" placeholder="Budget" value={form.budget} onChange={(e) => handleChange("budget", Number(e.target.value))} />
          <Input placeholder="Timeline" value={form.timeline} onChange={(e) => handleChange("timeline", e.target.value)} />

          <select
            value={form.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="border p-2"
          >
            <option value="NEW">NEW</option>
            <option value="FOLLOW_UP">FOLLOW UP</option>
            <option value="QUALIFIED">QUALIFIED</option>
          </select>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={() => router.push("/crm/lead")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit}>
            <Save className="w-4 h-4 mr-2" />
            Simpan
          </Button>
        </div>
      </Card>
    </div>
  );
}