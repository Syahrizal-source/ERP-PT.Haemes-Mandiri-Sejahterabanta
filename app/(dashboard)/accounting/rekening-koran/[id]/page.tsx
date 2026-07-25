"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Card from "@/components/ui/Card";

interface Data {
  tanggal: string;
  deskripsi: string;
  debit: number;
  kredit: number;
  saldo: number;
  jenis: string;
}

export default function DetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetch(`/api/rekening-koran/${params.id}`)
      .then((res) => res.json())
      .then(setData);
  }, []); // eslint-disable-next-line react-hooks/exhaustive-deps

  if (!data) return null;

  return (
    <Card title="Detail Rekening Koran">
      <p>Tanggal: {data.tanggal}</p>
      <p>Deskripsi: {data.deskripsi}</p>
      <p>Debit: {data.debit.toLocaleString("id-ID")}</p>
      <p>Kredit: {data.kredit.toLocaleString("id-ID")}</p>
      <p>Saldo: {data.saldo.toLocaleString("id-ID")}</p>
      <p>Jenis: {data.jenis}</p>
    </Card>
  );
}
