"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

/* =========================
   TYPES
========================= */
type Customer = {
  id: string;
  nama: string;
};

type Lead = {
  id: string;
  minat: string | null;
};

type ActivityForm = {
  id_customer: string;
  id_lead: string;
  tipe: string;
  catatan: string;
  tanggal: string;
  follow_up_date: string;
  status: string;
  assigned_to: string;
};

export default function CreateActivityPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  const [form, setForm] = useState<ActivityForm>({
    id_customer: "",
    id_lead: "",
    tipe: "",
    catatan: "",
    tanggal: "",
    follow_up_date: "",
    status: "OPEN",
    assigned_to: "",
  });

  /* =========================
     FETCH DATA
  ========================= */
  useEffect(() => {
    fetch("/api/crm/customer")
      .then((res) => res.json())
      .then((res: Customer[]) => setCustomers(res));

    fetch("/api/crm/lead")
      .then((res) => res.json())
      .then((res: Lead[]) => setLeads(res));
  }, []);

  function handleChange<K extends keyof ActivityForm>(
    field: K,
    value: ActivityForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    await fetch("/api/crm/activity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    router.push("/crm/activity");
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Activity">
        <div className="grid grid-cols-2 gap-4">

          {/* CUSTOMER */}
          <select
            value={form.id_customer}
            onChange={(e) => handleChange("id_customer", e.target.value)}
            className="border px-3 py-2"
          >
            <option value="">Pilih Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nama}
              </option>
            ))}
          </select>

          {/* LEAD */}
          <select
            value={form.id_lead}
            onChange={(e) => handleChange("id_lead", e.target.value)}
            className="border px-3 py-2"
          >
            <option value="">Pilih Lead</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.minat ?? "Lead"}
              </option>
            ))}
          </select>

          <Input
            className="border px-3 py-2"
            placeholder="Tipe"
            value={form.tipe}
            onChange={(e) => handleChange("tipe", e.target.value)}
          />

          <Input
            className="border px-3 py-2"
            placeholder="Catatan"
            value={form.catatan}
            onChange={(e) => handleChange("catatan", e.target.value)}
          />

          <Input
            type="date"
            className="border px-3 py-2"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            type="date"
            className="border px-3 py-2"
            value={form.follow_up_date}
            onChange={(e) =>
              handleChange("follow_up_date", e.target.value)
            }
          />

          <Input
            className="border px-3 py-2"
            placeholder="Assigned To"
            value={form.assigned_to}
            onChange={(e) =>
              handleChange("assigned_to", e.target.value)
            }
          />

          <select
            value={form.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="border px-3 py-2"
          >
            <option value="OPEN">OPEN</option>
            <option value="DONE">DONE</option>
          </select>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/crm/activity")}
          >
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