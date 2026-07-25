"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Rental {
  id: string;
  equipment_id: string | null;
  tanggal: string;
  id_proyek: string | null;
  customer: string | null;
  jam: number | null;
  harga_jam: number | null;
  subtotal: number | null;
  ppn: number | null;
  pph23: number | null;
  total: number | null;
  created_at: string;
}

export default function RentalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [rental, setRental] = useState<Rental | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch(`/api/alat-berat/rental/${id}`);

      if (!res.ok) {
        showToast("Gagal mengambil data rental", "error");
        setLoading(false);
        return;
      }

      const data: Rental = await res.json();

      setRental(data);
      setLoading(false);
    }

    fetchData();
  }, [id, showToast]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  if (!rental) return null;

  const subtotal = rental.subtotal ?? 0;
  const total = rental.total ?? 0;

  const profit = total - subtotal;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <Card title="Detail Rental">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">Tanggal</p>
              <p>{rental.tanggal}</p>
            </div>

            <div>
              <p className="font-semibold">Customer</p>
              <p>{rental.customer ?? "-"}</p>
            </div>

            <div>
              <p className="font-semibold">Jam</p>
              <p>{rental.jam ?? "-"}</p>
            </div>

            <div>
              <p className="font-semibold">Harga / Jam</p>
              <p>{rental.harga_jam ?? "-"}</p>
            </div>

            <div>
              <p className="font-semibold">Subtotal</p>
              <p>{subtotal}</p>
            </div>

            <div>
              <p className="font-semibold">PPN</p>
              <p>{rental.ppn ?? "-"}</p>
            </div>

            <div>
              <p className="font-semibold">PPh23</p>
              <p>{rental.pph23 ?? "-"}</p>
            </div>

            <div>
              <p className="font-semibold">Total</p>
              <p>{total}</p>
            </div>

            <div>
              <p className="font-semibold">Profit Rental</p>
              <p className="text-green-600 font-semibold">{profit}</p>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <Button
              variant="secondary"
              onClick={() => router.push("/alat-berat/rental")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>

            <Button
              onClick={() => router.push(`/alat-berat/rental/${rental.id}/edit`)}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
