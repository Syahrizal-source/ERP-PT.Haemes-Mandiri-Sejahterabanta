"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface Division {
  id: string;
  name: string;
}

interface BlockForm {
  division_id: string;
  code: string;
  planting_year: number;
  area_ha: number;
  palm_population: number;
  status: "TBM" | "TM" | "TUA";
  seed_type: string;
}

export default function CreateBlockPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState<boolean>(false);
  const [divisions, setDivisions] = useState<Division[]>([]);

  const [form, setForm] = useState<BlockForm>({
    division_id: "",
    code: "",
    planting_year: new Date().getFullYear(),
    area_ha: 0,
    palm_population: 0,
    status: "TM",
    seed_type: "",
  });

  useEffect(() => {
    async function fetchDivision(): Promise<void> {
      const res = await fetch("/api/kebun-sawit/divisions");
      const data: Division[] = await res.json();
      setDivisions(data);
    }

    fetchDivision();
  }, []);

  function handleChange<K extends keyof BlockForm>(
    field: K,
    value: BlockForm[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(): Promise<void> {
    if (form.area_ha < 0 || form.palm_population < 0) {
      showToast("Nilai tidak boleh negatif", "error");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/kebun-sawit/blocks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan blocks",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Blocks Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/kebun-sawit/blocks");
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Tambah Block">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Division</label>
            <select
              className="w-full border rounded p-2"
              value={form.division_id}
              onChange={(e) => handleChange("division_id", e.target.value)}
            >
              <option value="">-- Pilih Division --</option>

              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Kode Block"
            value={form.code}
            onChange={(e) => handleChange("code", e.target.value)}
          />

          <Input
            label="Tahun Tanam"
            type="number"
            value={form.planting_year}
            onChange={(e) =>
              handleChange("planting_year", Number(e.target.value))
            }
          />

          <Input
            label="Luas (Ha)"
            type="number"
            value={form.area_ha}
            onChange={(e) => handleChange("area_ha", Number(e.target.value))}
          />

          <Input
            label="Populasi Sawit"
            type="number"
            value={form.palm_population}
            onChange={(e) =>
              handleChange("palm_population", Number(e.target.value))
            }
          />

          <Input
            label="Jenis Bibit"
            value={form.seed_type}
            onChange={(e) => handleChange("seed_type", e.target.value)}
          />

          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              className="w-full border rounded p-2"
              value={form.status}
              onChange={(e) =>
                handleChange("status", e.target.value as BlockForm["status"])
              }
            >
              <option value="TBM">TBM</option>
              <option value="TM">TM</option>
              <option value="TUA">TUA</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/kebun-sawit/blocks")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Simpan
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
