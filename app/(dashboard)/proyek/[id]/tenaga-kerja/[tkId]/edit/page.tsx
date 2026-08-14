"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2, Trash2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";

type FormState = {
  nama: string;
  jabatan: string;
  tipe:
    | "MANAJEMEN_PROYEK"
    | "TENAGA_AHLI"
    | "TEKNISI_ANALIS"
    | "OPERATOR_ALAT_BERAT"
    | "OPERATOR_ANGKUTAN"
    | "PEKERJA_LAPANGAN"
    | "ADMINISTRASI";
  upah: number;
  periode: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: "AKTIF" | "SELESAI" | "DIBATALKAN";
  keterangan: string;
};

export default function EditTenagaKerjaPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;
  const tkId = params.tkId as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [openDelete, setOpenDelete] = useState<boolean>(false);

  const [form, setForm] = useState<FormState>({
    nama: "",
    jabatan: "",
    tipe: "OPERATOR_ALAT_BERAT",
    upah: 0,
    periode: "",
    tanggal_mulai: "",
    tanggal_selesai: "",
    status: "AKTIF",
    keterangan: "",
  });
  useEffect(() => {
    async function fetchData(): Promise<void> {
      const res = await fetch(`/api/proyek/tenaga-kerja?id_proyek=${proyekId}`);

      if (!res.ok) {
        showToast("Gagal mengambil data", "error");
        setLoading(false);
        return;
      }

      const data: (FormState & { id: string })[] = await res.json();
      const current = data.find((d) => d.id === tkId);

      if (!current) {
        showToast("Data tidak ditemukan", "error");
        router.push(`/proyek/${proyekId}/tenaga-kerja`);
        return;
      }

      setForm(current);
      setLoading(false);
    }

    fetchData();
  }, [proyekId, tkId, router, showToast]);

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(): Promise<void> {
    if (form.upah < 0) {
      showToast("Upah tidak boleh negatif", "error");
      return;
    }

    setSaving(true);

    const res = await fetch(`/api/proyek/tenaga-kerja/${tkId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nama: form.nama,
        jabatan: form.jabatan || null,
        tipe: form.tipe,
        upah: form.upah,
        periode: form.periode || null,
        tanggal_mulai: form.tanggal_mulai,
        tanggal_selesai: form.tanggal_selesai || null,
        status: form.status,
        keterangan: form.keterangan || null,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error ?? "Gagal update data", "error");
      return;
    }

    showToast("Tenaga kerja berhasil diupdate", "success");
    router.push(`/proyek/${proyekId}/tenaga-kerja`);
    router.refresh();
  }

  async function handleDelete(): Promise<void> {
    const res = await fetch(`/api/proyek/tenaga-kerja/${tkId}`, {
      method: "DELETE",
    });

    if (form.tanggal_selesai && form.tanggal_selesai < form.tanggal_mulai) {
      showToast("Tanggal selesai tidak boleh lebih kecil", "error");
      return;
    }

    if (!res.ok) {
      showToast("Gagal menghapus tenaga kerja", "error");
      return;
    }

    showToast("Tenaga kerja berhasil dihapus", "success");
    router.push(`/proyek/${proyekId}/tenaga-kerja`);
    router.refresh();
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
    <div className="max-w-4xl mx-auto">
      <Card title="Edit Tenaga Kerja">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nama"
            value={form.nama}
            onChange={(e) => handleChange("nama", e.target.value)}
          />

          <Input
            label="Jabatan"
            value={form.jabatan}
            onChange={(e) => handleChange("jabatan", e.target.value)}
          />

          <div>
            <label className="text-sm font-medium">Tipe</label>
            <select
              className="w-full border rounded p-2"
              value={form.tipe}
              onChange={(e) =>
                handleChange("tipe", e.target.value as FormState["tipe"])
              }
            >
              <option value="MANAJEMEN_PROYEK">Manajemen Proyek</option>
              <option value="TENAGA_AHLI">Tenaga Ahli</option>
              <option value="TEKNISI_ANALIS">Teknisi / Analis</option>
              <option value="OPERATOR_ALAT_BERAT">Operator Alat Berat</option>
              <option value="OPERATOR_ANGKUTAN">Operator Angkutan</option>
              <option value="PEKERJA_LAPANGAN">Pekerja Lapangan</option>
              <option value="ADMINISTRASI">Administrasi</option>
            </select>
          </div>

          <Input
            label="Upah"
            type="number"
            value={form.upah}
            onChange={(e) => handleChange("upah", Number(e.target.value))}
          />

          <Input
            label="Periode"
            value={form.periode}
            onChange={(e) => handleChange("periode", e.target.value)}
          />

          <div>
            <label>Status</label>

            <select
              className="w-full border rounded p-2"
              value={form.status}
              onChange={(e) =>
                handleChange("status", e.target.value as FormState["status"])
              }
            >
              <option value="AKTIF">AKTIF</option>
              <option value="SELESAI">SELESAI</option>
              <option value="DIBATALKAN">DIBATALKAN</option>
            </select>
          </div>

          <Input
            label="Tanggal Mulai"
            type="date"
            value={form.tanggal_mulai}
            onChange={(e) => handleChange("tanggal_mulai", e.target.value)}
          />

          <Input
            label="Tanggal Selesai"
            type="date"
            value={form.tanggal_selesai}
            onChange={(e) => handleChange("tanggal_selesai", e.target.value)}
          />

          <Input
            label="Keterangan"
            value={form.keterangan}
            onChange={(e) => handleChange("keterangan", e.target.value)}
          />
        </div>

        <div className="flex justify-between mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${proyekId}/tenaga-kerja`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <div className="flex gap-2">
            <Button variant="destructive" onClick={() => setOpenDelete(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Hapus
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
        </div>
      </Card>

      <ConfirmModal
        open={openDelete}
        title="Konfirmasi Hapus"
        description="Yakin ingin menghapus tenaga kerja ini?"
        onConfirm={handleDelete}
        onCancel={() => setOpenDelete(false)}
      />
    </div>
  );
}
