"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from 'sweetalert2';

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
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

interface OperationResponse {
  id: string;
  equipment_id: string;
  tanggal: string;
  id_operator: string | null;
  id_proyek: string | null;
  hm_awal: number | null;
  hm_akhir: number | null;
  total_jam: number | null;
  keterangan: string | null;
}

interface OperationForm {
  equipment_id: string;
  tanggal: string;
  id_operator: string;
  id_proyek: string;
  hm_awal: number;
  hm_akhir: number;
  total_jam: number;
  keterangan: string;
}

export default function EditOperationPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [proyeks, setProyeks] = useState<Proyek[]>([]);

  const [form, setForm] = useState<OperationForm>({
    equipment_id: "",
    tanggal: "",
    id_operator: "",
    id_proyek: "",
    hm_awal: 0,
    hm_akhir: 0,
    total_jam: 0,
    keterangan: "",
  });

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const [opRes, eqRes, optrRes, prRes] = await Promise.all([
        fetch(`/api/alat-berat/operation/${id}`),
        fetch("/api/alat-berat/master"),
        fetch("/api/alat-berat/operator"),
        fetch("/api/proyek/master"),
      ]);

      if (!opRes.ok) {
        showToast("Gagal mengambil data operation", "error");
        setLoading(false);
        return;
      }

      const opData: OperationResponse = await opRes.json();
      const eqData: Equipment[] = await eqRes.json();
      const optrData: Operator[] = await optrRes.json();
      const prData: Proyek[] = await prRes.json();

      setEquipments(eqData);
      setOperators(optrData);
      setProyeks(prData);

      setForm({
        equipment_id: opData.equipment_id,
        tanggal: opData.tanggal,
        id_operator: opData.id_operator ?? "",
        id_proyek: opData.id_proyek ?? "",
        hm_awal: opData.hm_awal ?? 0,
        hm_akhir: opData.hm_akhir ?? 0,
        total_jam: opData.total_jam ?? 0,
        keterangan: opData.keterangan ?? "",
      });

      setLoading(false);
    }

    fetchData();
  }, [id, showToast]);

  function calculateTotal(hmAwal: number, hmAkhir: number): number {
    if (hmAkhir < hmAwal) return 0;
    return hmAkhir - hmAwal;
  }

  function handleChange<K extends keyof OperationForm>(
    field: K,
    value: OperationForm[K],
  ): void {
    const updated = { ...form, [field]: value };

    if (field === "hm_awal" || field === "hm_akhir") {
      updated.total_jam = calculateTotal(updated.hm_awal, updated.hm_akhir);
    }

    setForm(updated);
  }

  async function handleSubmit(): Promise<void> {
    if (form.hm_akhir < form.hm_awal) {
      showToast("HM akhir tidak boleh lebih kecil dari HM awal", "error");
      return;
    }

    setSaving(true);

    const res = await fetch(`/api/alat-berat/operation/${id}`, {
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
        text: "Gagal menyimpan operation",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Update Operation Berhasil",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push(`/alat-berat/operation/${id}`);
      router.refresh();
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Edit Equipment Operation">
        <div className="grid grid-cols-2 gap-4">

          <div>
            <label className="text-sm font-medium">Equipment</label>
            <select
              className="w-full border rounded p-2"
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
          </div>

          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <div>
            <label className="text-sm font-medium">Operator</label>
            <select
              className="w-full border rounded p-2"
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
          </div>

          <div>
            <label className="text-sm font-medium">Proyek</label>
            <select
              className="w-full border rounded p-2"
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
          </div>

          <Input
            label="HM Awal"
            type="number"
            value={form.hm_awal}
            onChange={(e) => handleChange("hm_awal", Number(e.target.value))}
          />

          <Input
            label="HM Akhir"
            type="number"
            value={form.hm_akhir}
            onChange={(e) => handleChange("hm_akhir", Number(e.target.value))}
          />

          <Input
            label="Total Jam"
            type="number"
            value={form.total_jam}
            disabled
            onChange={() => { }}
          />

          <Input
            label="Keterangan"
            value={form.keterangan}
            onChange={(e) => handleChange("keterangan", e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/alat-berat/operation/${id}`)}
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