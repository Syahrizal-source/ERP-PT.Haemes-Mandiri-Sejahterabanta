"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save } from "lucide-react";

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

export default function EditLeadPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [form, setForm] = useState<LeadForm>({
    sumber: "",
    status: "",
    minat: "",
    budget: 0,
    timeline: "",
  });

  useEffect(() => {
    fetch(`/api/crm/lead/${params.id}`)
      .then((res) => res.json())
      .then((data) =>
        setForm({
          sumber: data.sumber ?? "",
          status: data.status ?? "",
          minat: data.minat ?? "",
          budget: data.budget ?? 0,
          timeline: data.timeline ?? "",
        }),
      );
  }, []);

  async function handleSubmit(): Promise<void> {
    await fetch(`/api/crm/lead/${params.id}`, {
      method: "PUT",
      body: JSON.stringify(form),
    });

    router.push(`/crm/lead/${params.id}`);
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Edit Lead">
        <Input value={form.sumber} onChange={(e) => setForm({ ...form, sumber: e.target.value })} />
        <Input value={form.minat} onChange={(e) => setForm({ ...form, minat: e.target.value })} />

        <Button onClick={handleSubmit}>
          <Save className="w-4 h-4 mr-2" />
          Update
        </Button>
      </Card>
    </div>
  );
}