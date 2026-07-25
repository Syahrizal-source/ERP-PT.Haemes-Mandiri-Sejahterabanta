"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import Card from "@/components/ui/Card";

interface Pph23 {
  jenis_jasa: string;
  pph23_terutang: number;
  tanggal_transaksi: string;
}

export default function DetailPph23Page() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Pph23 | null>(null);

  useEffect(() => {
    fetch(`/api/pph23/${params.id}`)
      .then((res) => res.json())
      .then(setData);
  }, []);

  if (!data) return null;

  return (
    <Card title="Detail PPh23">
      <p>Jenis Jasa: {data.jenis_jasa}</p>
      <p>Tanggal: {data.tanggal_transaksi}</p>
      <p>Nilai: {data.pph23_terutang.toLocaleString("id-ID")}</p>
    </Card>
  );
}
