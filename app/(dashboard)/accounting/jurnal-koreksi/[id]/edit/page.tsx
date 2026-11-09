"use client";

import { useCallback, useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

import { useToast } from "@/components/ui/toast-context";

/* =========================
   TYPES
========================= */

interface JurnalKoreksiDetail {
  id: number;
  id_jurnal_asal: number;
  id_jurnal_koreksi: number;
  alasan: string;
  created_at: string | null;
}

interface EditForm {
  alasan: string;
}

interface ApiErrorResponse {
  error?:
    | string
    | {
        formErrors?: string[];
        fieldErrors?: Record<string, string[] | undefined>;
      };
  message?: string;
}

interface ApiSuccessResponse {
  success: boolean;
  message?: string;
}

/* =========================
   PAGE
========================= */

export default function EditJurnalKoreksiPage() {
  const router = useRouter();

  const params = useParams<{ id: string }>();

  const { showToast } = useToast();

  const id = Number(params.id);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [detail, setDetail] = useState<JurnalKoreksiDetail | null>(null);

  const [form, setForm] = useState<EditForm>({
    alasan: "",
  });

  /* =========================
     FETCH DETAIL
  ========================= */

  const fetchDetail = useCallback(async (): Promise<void> => {
    if (!Number.isSafeInteger(id) || id <= 0) {
      showToast("ID jurnal koreksi tidak valid", "error");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`/api/jurnal-koreksi/${id}`, {
        method: "GET",
        cache: "no-store",
      });

      const result: unknown = await res.json();

      if (!res.ok) {
        const errorResult = result as ApiErrorResponse;

        const message =
          typeof errorResult.error === "string"
            ? errorResult.error
            : "Gagal mengambil data jurnal koreksi";

        showToast(message, "error");
        setDetail(null);
        return;
      }

      const data = result as JurnalKoreksiDetail;

      setDetail(data);

      setForm({
        alasan: data.alasan,
      });
    } catch (error: unknown) {
      console.error("FETCH EDIT JURNAL KOREKSI ERROR:", error);

      Swal.fire({
        icon: "error",
        title: "Gagal Memuat Data",
        text: "Terjadi kesalahan saat mengambil data jurnal koreksi.",
      });

      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  /* =========================
     LOAD
  ========================= */

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchDetail();
  }, [fetchDetail]);

  /* =========================
     CHANGE
  ========================= */

  function handleAlasanChange(value: string): void {
    setForm((previous) => ({
      ...previous,
      alasan: value,
    }));
  }

  /* =========================
     SUBMIT
  ========================= */

  async function handleSubmit(): Promise<void> {
    if (!detail) {
      showToast("Data jurnal koreksi belum tersedia", "error");
      return;
    }

    const alasan = form.alasan.trim();

    if (alasan.length < 3) {
      Swal.fire({
        icon: "warning",
        title: "Validasi Gagal",
        text: "Alasan koreksi minimal 3 karakter.",
      });

      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`/api/jurnal-koreksi/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          alasan,
        }),
      });

      const result: unknown = await res.json();

      if (!res.ok) {
        const errorResult = result as ApiErrorResponse;

        const message =
          typeof errorResult.error === "string"
            ? errorResult.error
            : "Gagal memperbarui alasan jurnal koreksi";

        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: message,
        });

        return;
      }

      const successResult = result as ApiSuccessResponse;

      await Swal.fire({
        icon: "success",
        title: "Berhasil",
        text:
          successResult.message ?? "Alasan jurnal koreksi berhasil diperbarui.",
        timer: 1500,
        showConfirmButton: false,
      });

      router.push("/accounting/jurnal-koreksi");
      router.refresh();
    } catch (error: unknown) {
      console.error("UPDATE JURNAL KOREKSI ERROR:", error);

      showToast("Terjadi kesalahan sistem saat menyimpan data", "error");
    } finally {
      setSaving(false);
    }
  }

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Memuat data jurnal koreksi...
      </div>
    );
  }

  /* =========================
     NOT FOUND
  ========================= */

  if (!detail) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card title="Edit Jurnal Koreksi">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Data jurnal koreksi tidak ditemukan atau tidak dapat dimuat.
            </p>

            <Button
              variant="secondary"
              onClick={() => router.push("/accounting/jurnal-koreksi")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="mx-auto max-w-4xl">
      <Card title="Edit Jurnal Koreksi">
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                ID Relasi Koreksi
              </label>

              <Input
                value={String(detail.id)}
                disabled
                onChange={() => undefined}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                ID Jurnal Asal
              </label>

              <Input
                value={String(detail.id_jurnal_asal)}
                disabled
                onChange={() => undefined}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                ID Jurnal Koreksi
              </label>

              <Input
                value={String(detail.id_jurnal_koreksi)}
                disabled
                onChange={() => undefined}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Dibuat Pada
              </label>

              <Input
                value={
                  detail.created_at
                    ? new Date(detail.created_at).toLocaleString("id-ID")
                    : "-"
                }
                disabled
                onChange={() => undefined}
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="Alasan Koreksi"
                value={form.alasan}
                onChange={(event) => handleAlasanChange(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t pt-5">
            <Button
              variant="secondary"
              onClick={() => router.push("/accounting/jurnal-koreksi")}
              disabled={saving}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>

            <Button
              onClick={() => void handleSubmit()}
              disabled={saving || form.alasan.trim().length < 3}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Simpan Perubahan
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
