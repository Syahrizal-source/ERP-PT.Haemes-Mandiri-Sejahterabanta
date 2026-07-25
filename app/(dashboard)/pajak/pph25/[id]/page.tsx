"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import Card from "@/components/ui/Card";

interface Pph25 {
  tahun: number;
  bulan: number;
  nilai_angsuran: number;
  tanggal_transaksi: string;
  keterangan: string | null;
}

export default function DetailPph25Page() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Pph25 | null>(null);

  useEffect(() => {
    fetch(`/api/pph25/${params.id}`)
      .then((res) => res.json())
      .then(setData);
  }, []);

  if (!data) return null;

  return (
    <Card title="Detail PPh25">
      <p>
        Periode: {data.bulan}/{data.tahun}
      </p>
      <p>Nilai: {data.nilai_angsuran.toLocaleString("id-ID")}</p>
      <p>Tanggal: {data.tanggal_transaksi}</p>
      <p>Keterangan: {data.keterangan ?? "-"}</p>
    </Card>
  );
}
