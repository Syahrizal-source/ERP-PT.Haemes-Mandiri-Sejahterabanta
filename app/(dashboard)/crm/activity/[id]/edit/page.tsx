"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

/* =========================
   TYPE
========================= */
type ActivityForm = {
  id_lead: string;
  id_customer: string;
  tipe: string;
  catatan: string;
  tanggal: string;
  follow_up_date: string;
  status: string;
  assigned_to: string;
};

export default function EditActivityPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [form, setForm] = useState<ActivityForm>({
    id_lead: "",
    id_customer: "",
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
    fetch(`/api/crm/activity/${params.id}`)
      .then((res) => res.json())
      .then((data) =>
        setForm({
          id_lead: data.id_lead ?? "",
          id_customer: data.id_customer ?? "",
          tipe: data.tipe ?? "",
          catatan: data.catatan ?? "",
          tanggal: data.tanggal ? data.tanggal.substring(0, 10) : "",
          follow_up_date: data.follow_up_date
            ? data.follow_up_date.substring(0, 10)
            : "",
          status: data.status ?? "OPEN",
          assigned_to: data.assigned_to ?? "",
        }),
      );
  }, [params.id]);

  function handleChange<K extends keyof ActivityForm>(
    field: K,
    value: ActivityForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  /* =========================
     SUBMIT
  ========================= */
  async function handleSubmit(): Promise<void> {
    await fetch(`/api/crm/activity/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_lead: form.id_lead || null,
        id_customer: form.id_customer || null,
        tipe: form.tipe,
        catatan: form.catatan,
        tanggal: form.tanggal || null,
        follow_up_date: form.follow_up_date || null,
        status: form.status,
        assigned_to: form.assigned_to || null,
      }),
    });

    router.push(`/crm/activity/${params.id}`);
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Edit Activity">
        <div className="grid grid-cols-2 gap-4">
          <Input
            placeholder="ID Lead"
            value={form.id_lead}
            onChange={(e) => handleChange("id_lead", e.target.value)}
          />

          <Input
            placeholder="ID Customer"
            value={form.id_customer}
            onChange={(e) => handleChange("id_customer", e.target.value)}
          />

          <Input
            placeholder="Tipe"
            value={form.tipe}
            onChange={(e) => handleChange("tipe", e.target.value)}
          />

          <Input
            placeholder="Catatan"
            value={form.catatan}
            onChange={(e) => handleChange("catatan", e.target.value)}
          />

          <Input
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            type="date"
            value={form.follow_up_date}
            onChange={(e) =>
              handleChange("follow_up_date", e.target.value)
            }
          />

          <Input
            placeholder="Assigned To"
            value={form.assigned_to}
            onChange={(e) =>
              handleChange("assigned_to", e.target.value)
            }
          />

          <select
            value={form.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="border px-2 py-2"
          >
            <option value="OPEN">OPEN</option>
            <option value="DONE">DONE</option>
          </select>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() =>
              router.push(`/crm/activity/${params.id}`)
            }
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit}>
            <Save className="w-4 h-4 mr-2" />
            Update
          </Button>
        </div>
      </Card>
    </div>
  );
}