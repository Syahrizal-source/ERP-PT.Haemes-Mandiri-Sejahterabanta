"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import Card from "@/components/ui/Card";

interface Pph4 {
  jenis_objek: string;
  pph4_terutang: number;
  tanggal_transaksi: string;
}

export default function DetailPph4Page() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Pph4 | null>(null);

  useEffect(() => {
    fetch(`/api/pph4/${params.id}`)
      .then((res) => res.json())
      .then(setData);
  }, []);

  if (!data) return null;

  return (
    <Card title="Detail PPh4">
      <p>Jenis Objek: {data.jenis_objek}</p>
      <p>Tanggal: {data.tanggal_transaksi}</p>
      <p>Nilai: {data.pph4_terutang.toLocaleString("id-ID")}</p>
    </Card>
  );
}
