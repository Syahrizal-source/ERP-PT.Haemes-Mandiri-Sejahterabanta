"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type KasbonDireksiInput = {
  tanggal: string;
  no_voucher: string;
  deskripsi: string;
  nominal: number;
};

export default function EditKasbonDireksiPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const id = params.id as string;

  const [loading, setLoading] = useState<boolean>(false);

  const [form, setForm] = useState<KasbonDireksiInput>({
    tanggal: "",
    no_voucher: "",
    deskripsi: "",
    nominal: 0,
  });

  async function fetchData(): Promise<void> {
    const res = await fetch(`/api/kasbon-direksi/${id}`);

    if (!res.ok) {
      showToast("Gagal mengambil data kasbon direksi", "error");
      return;
    }

    const result: KasbonDireksiInput = await res.json();
    setForm({
      tanggal: result.tanggal,
      no_voucher: result.no_voucher,
      deskripsi: result.deskripsi,
      nominal: result.nominal,
    });
  }

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  function handleChange(field: keyof KasbonDireksiInput, value: string): void {
    setForm((prev) => ({
      ...prev,
      [field]: field === "nominal" ? Number(value) : value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    setLoading(true);

    const res = await fetch(`/api/kasbon-direksi/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...form, kredit: 0 }),
    });

    setLoading(false);

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal menyimpan kasbon direksi",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      icon: "success",
      title: "Update Kasbon Direksi Berhasil",
      text: result.message,
      confirmButtonText: "OK",
    }).then(() => {
      router.push("/accounting/kasbon-direksi");
      router.refresh();
    });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card title="Edit Kasbon Direksi">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal ?? ""}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            label="No Voucher"
            value={form.no_voucher ?? ""}
            onChange={(e) => handleChange("no_voucher", e.target.value)}
          />

          <Input
            label="Deskripsi"
            value={form.deskripsi ?? ""}
            onChange={(e) => handleChange("deskripsi", e.target.value)}
          />

          <Input
            label="Nilai"
            type="number"
            value={form.nominal ?? ""}
            onChange={(e) => handleChange("nominal", e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/accounting/kasbon-direksi")}
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
                Update
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
