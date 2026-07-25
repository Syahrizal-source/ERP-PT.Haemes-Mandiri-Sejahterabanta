"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

/* =========================
   TYPE
========================= */
type DealForm = {
  nama_deal: string;
  nilai: number;
  tahap: string;
  probabilitas: number;
  closing_date: string;
};

/* =========================
   FORMAT
========================= */
function formatRupiah(value: number): string {
  return value.toLocaleString("id-ID");
}

function parseNumber(value: string): number {
  const clean = value.replace(/\D/g, "");
  return clean ? Number(clean) : 0;
}

/* ========================= */
export default function EditDealPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [form, setForm] = useState<DealForm>({
    nama_deal: "",
    nilai: 0,
    tahap: "OPEN",
    probabilitas: 0,
    closing_date: "",
  });

  const [displayNilai, setDisplayNilai] = useState<string>("");

  useEffect(() => {
    fetch(`/api/crm/deal/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setForm({
          nama_deal: data.nama_deal,
          nilai: data.nilai,
          tahap: data.tahap,
          probabilitas: data.probabilitas ?? 0,
          closing_date: data.closing_date ?? "",
        });

        setDisplayNilai(formatRupiah(data.nilai));
      });
  }, [params.id]);

  function handleNilaiChange(value: string): void {
    const number = parseNumber(value);
    setForm((prev) => ({ ...prev, nilai: number }));
    setDisplayNilai(formatRupiah(number));
  }

  function handleChange<K extends keyof DealForm>(
    field: K,
    value: DealForm[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(): Promise<void> {
    await fetch(`/api/crm/deal/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    router.push(`/crm/deal/${params.id}`);
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Edit Deal">
        <div className="grid grid-cols-2 gap-4">

          {/* NAMA DEAL */}
          <input
            className="border px-3 py-2"
            placeholder="Nama Deal"
            value={form.nama_deal}
            onChange={(e) =>
              handleChange("nama_deal", e.target.value)
            }
          />

          {/* NILAI */}
          <input
            className="border px-3 py-2"
            placeholder="Rp 1.000.000.000"
            value={displayNilai}
            onChange={(e) => handleNilaiChange(e.target.value)}
          />

          {/* TAHAP */}
          <select
            value={form.tahap}
            onChange={(e) =>
              handleChange("tahap", e.target.value)
            }
            className="border px-3 py-2"
          >
            <option value="OPEN">OPEN</option>
            <option value="NEGOTIATION">NEGOTIATION</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          {/* PROBABILITAS */}
          <div className="flex flex-col">
            <label className="text-sm mb-1">
              Probabilitas: {form.probabilitas}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={form.probabilitas}
              onChange={(e) =>
                handleChange(
                  "probabilitas",
                  Number(e.target.value),
                )
              }
            />
          </div>

          {/* CLOSING DATE */}
          <input
            type="date"
            className="border px-3 py-2"
            value={form.closing_date}
            onChange={(e) =>
              handleChange("closing_date", e.target.value)
            }
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() =>
              router.push(`/crm/deal/${params.id}`)
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