"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type Lead = {
  id: string;
  sumber: string | null;
  status: string;
  minat: string | null;
  budget: number | null;
  timeline: string | null;
};

export default function DetailLeadPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [data, setData] = useState<Lead | null>(null);

  useEffect(() => {
    fetch(`/api/crm/lead/${params.id}`)
      .then((res) => res.json())
      .then((res) => setData(res));
  }, []);

  if (!data) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Detail Lead">
        <p>Status: {data.status}</p>
        <p>Sumber: {data.sumber}</p>
        <p>Minat: {data.minat}</p>
        <p>Budget: {data.budget}</p>
        <p>Timeline: {data.timeline}</p>

        <Button onClick={() => router.push("/crm/lead")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </Button>
      </Card>
    </div>
  );
}