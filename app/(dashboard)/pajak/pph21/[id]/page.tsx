"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import Card from "@/components/ui/Card";

interface Pph21 {
  nama: string;
  nilai_pph21: number;
  tanggal: string;
}

export default function DetailPph21Page() {
  const params = useParams<{ id: string }>();

  const [data, setData] = useState<Pph21 | null>(null);

  useEffect(() => {
    fetch(`/api/pph21/${params.id}`)
      .then((res) => res.json())
      .then(setData);
  }, []);

  if (!data) return null;

  return (
    <Card title="Detail PPh21">
      <p>Nama: {data.nama}</p>
      <p>Tanggal: {data.tanggal}</p>
      <p>Nilai: {data.nilai_pph21.toLocaleString("id-ID")}</p>
    </Card>
  );
}
