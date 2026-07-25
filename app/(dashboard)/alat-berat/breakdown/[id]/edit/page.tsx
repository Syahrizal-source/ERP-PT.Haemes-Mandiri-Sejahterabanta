"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Equipment {
  id: string;
  asset_number: string;
}

interface Operator {
  id: string;
  nama: string;
}

interface Proyek {
  id: string;
  nama: string;
}

interface BreakdownResponse {
  id: string;
  equipment_id: string | null;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  penyebab: string | null;
  tindakan: string | null;
  durasi_jam: number | null;
  id_operator: string | null;
  id_proyek: string | null;
}

interface BreakdownForm {
  equipment_id: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  penyebab: string;
  tindakan: string;
  durasi_jam: number;
  id_operator: string;
  id_proyek: string;
}

function normalizeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];

  if (
    typeof data === "object" &&
    data !== null &&
    "data" in data &&
    Array.isArray((data as { data: unknown }).data)
  ) {
    return (data as { data: T[] }).data;
  }

  return [];
}

export default function EditBreakdownPage() {

  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [proyeks, setProyeks] = useState<Proyek[]>([]);

  const [form, setForm] = useState<BreakdownForm>({
    equipment_id: "",
    tanggal_mulai: "",
    tanggal_selesai: "",
    penyebab: "",
    tindakan: "",
    durasi_jam: 0,
    id_operator: "",
    id_proyek: "",
  });

  function calculateDurasi(start: string, end: string): number {
    if (!start || !end) return 0;

    const startDate = new Date(start);
    const endDate = new Date(end);

    const diff = endDate.getTime() - startDate.getTime();

    return Number((diff / 3600000).toFixed(2));
  }

  function handleChange<K extends keyof BreakdownForm>(
    field: K,
    value: BreakdownForm[K]
  ): void {
    const updated = { ...form, [field]: value };

    if (field === "tanggal_mulai" || field === "tanggal_selesai") {
      updated.durasi_jam = calculateDurasi(
        updated.tanggal_mulai,
        updated.tanggal_selesai
      );
    }

    setForm(updated);
  }

  useEffect(() => {
    async function fetchData(): Promise<void> {

      const [breakdownRes, eqRes, opRes, prRes] = await Promise.all([
        fetch(`/api/alat-berat/breakdown/${id}`),
        fetch("/api/alat-berat/master"),
        fetch("/api/alat-berat/operator"),
        fetch("/api/proyek/master"),
      ]);

      const breakdown: BreakdownResponse = await breakdownRes.json();

      const eqJson = await eqRes.json();
      const opJson = await opRes.json();
      const prJson = await prRes.json();

      setEquipments(normalizeArray<Equipment>(eqJson));
      setOperators(normalizeArray<Operator>(opJson));
      setProyeks(normalizeArray<Proyek>(prJson));

      setForm({
        equipment_id: breakdown.equipment_id ?? "",
        tanggal_mulai: breakdown.tanggal_mulai,
        tanggal_selesai: breakdown.tanggal_selesai ?? "",
        penyebab: breakdown.penyebab ?? "",
        tindakan: breakdown.tindakan ?? "",
        durasi_jam: breakdown.durasi_jam ?? 0,
        id_operator: breakdown.id_operator ?? "",
        id_proyek: breakdown.id_proyek ?? "",
      });

      setLoading(false);

    }

    fetchData();
  }, [id]);

  async function handleSubmit(): Promise<void> {

    setSaving(true);

    const res = await fetch(`/api/alat-berat/breakdown/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    setSaving(false);
    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan breakdown",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Update Breakdown Berhasil",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push(`/alat-berat/breakdown/${id}`);
      router.refresh();
    });
  }

  if (loading) {
    return (
      <div className="flex gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">

      <Card title="Edit Breakdown">

        <div className="grid grid-cols-2 gap-4">

          <select
            className="border rounded p-2"
            value={form.equipment_id}
            onChange={(e) => handleChange("equipment_id", e.target.value)}
          >
            <option value="">-- Pilih Equipment --</option>

            {equipments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.asset_number}
              </option>
            ))}
          </select>

          <select
            className="border rounded p-2"
            value={form.id_operator}
            onChange={(e) => handleChange("id_operator", e.target.value)}
          >
            <option value="">-- Pilih Operator --</option>

            {operators.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nama}
              </option>
            ))}
          </select>

          <input
            type="datetime-local"
            className="border rounded p-2"
            value={form.tanggal_mulai}
            onChange={(e) => handleChange("tanggal_mulai", e.target.value)}
          />

          <input
            type="datetime-local"
            className="border rounded p-2"
            value={form.tanggal_selesai}
            onChange={(e) => handleChange("tanggal_selesai", e.target.value)}
          />

          <input
            className="border rounded p-2"
            value={form.durasi_jam}
            readOnly
          />

          <select
            className="border rounded p-2"
            value={form.id_proyek}
            onChange={(e) => handleChange("id_proyek", e.target.value)}
          >
            <option value="">-- Pilih Proyek --</option>

            {proyeks.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nama}
              </option>
            ))}
          </select>

          <input
            className="border rounded p-2"
            placeholder="Penyebab"
            value={form.penyebab}
            onChange={(e) => handleChange("penyebab", e.target.value)}
          />

          <input
            className="border rounded p-2"
            placeholder="Tindakan"
            value={form.tindakan}
            onChange={(e) => handleChange("tindakan", e.target.value)}
          />

        </div>

        <div className="flex gap-3 mt-6">

          <Button
            variant="secondary"
            onClick={() => router.push(`/alat-berat/breakdown/${id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Update
              </>
            )}
          </Button>

        </div>

      </Card>

    </div>
  );
}