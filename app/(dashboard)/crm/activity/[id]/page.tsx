"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type Activity = {
  id: string;
  catatan: string | null;
  tipe: string | null;
  status: string;
  tanggal: string | null;
  follow_up_date: string | null;
  assigned_to: string | null;
};

export default function DetailActivityPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [data, setData] = useState<Activity | null>(null);

  useEffect(() => {
    fetch(`/api/crm/activity/${params.id}`)
      .then((res) => res.json())
      .then((res) => setData(res));
  }, []);

  if (!data) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Detail Activity">
        <p>Tipe: {data.tipe}</p>
        <p>Status: {data.status}</p>
        <p>Catatan: {data.catatan}</p>
        <p>Tanggal: {data.tanggal}</p>
        <p>Follow Up: {data.follow_up_date}</p>
        <p>Assigned: {data.assigned_to}</p>

        <div className="flex gap-3 mt-6">
          <Button onClick={() => router.push("/crm/activity")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={() => router.push(`/crm/activity/${params.id}/edit`)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </Card>
    </div>
  );
}