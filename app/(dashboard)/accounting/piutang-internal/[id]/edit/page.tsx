"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

interface PiutangInternalInput {
  tanggal: string;
  pihak: string;
  keterangan: string;
  nominal: number;
}

export default function EditPiutangInternalPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [loading, setLoading] = useState<boolean>(false);
  const [form, setForm] = useState<PiutangInternalInput>({
    tanggal: "",
    pihak: "",
    keterangan: "",
    nominal: 0,
  });

  async function fetchData(): Promise<void> {
    const res = await fetch(`/api/piutang-internal/${params.id}`);

    if (!res.ok) {
      showToast("Gagal mengambil data piutang internal", "error");
      return;
    }

    const data: PiutangInternalInput = await res.json();
    setForm(data);
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(
    field: keyof PiutangInternalInput,
    value: string,
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: field === "nominal" ? Number(value) : value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    setLoading(true);

    const res = await fetch(`/api/piutang-internal/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);
    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal menyimpan Piutang Internal",
      });
      return;
    }
    const result = await res.json();

    Swal.fire({
      icon: "success",
      title: "Update Piutang Internal Berhasil",
      text: result.message,
      confirmButtonText: "OK",
    }).then(() => {
      router.push("/accounting/piutang-internal");
      router.refresh();
    });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card title="Edit Piutang Internal">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            label="Pihak"
            value={form.pihak}
            onChange={(e) => handleChange("pihak", e.target.value)}
          />

          <Input
            label="Nominal"
            type="number"
            value={form.nominal}
            onChange={(e) => handleChange("nominal", e.target.value)}
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
            onClick={() => router.push("/accounting/piutang-internal")}
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
