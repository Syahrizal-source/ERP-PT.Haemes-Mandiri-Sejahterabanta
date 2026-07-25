"use client";

import { useEffect, useState } from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  Save,
  ArrowLeft,
  Loader2,
} from "lucide-react";

import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

import { useToast } from "@/components/ui/toast-context";

import {
  jurnalKoreksiSchema,
  type JurnalKoreksiInput,
} from "@/lib/validators/jurnal-koreksi";

/* =========================
   TYPES
========================= */

interface EditForm {
  tanggal: string;

  no_bukti: string;

  keterangan: string;

  alasan: string;

  id_jurnal_asal: number;

  lines: {
    id_coa: number;
    debit: number;
    kredit: number;
  }[];
}

/* =========================
   PAGE
========================= */

export default function EditJurnalKoreksiPage() {
  const router =
    useRouter();

  const params =
    useParams();

  const { showToast } =
    useToast();

  const id = Number(
    params.id,
  );

  const [
    loading,
    setLoading,
  ] = useState<boolean>(
    true,
  );

  const [
    saving,
    setSaving,
  ] = useState<boolean>(
    false,
  );

  const [form, setForm] =
    useState<EditForm>({
      tanggal: "",

      no_bukti: "",

      keterangan: "",

      alasan: "",

      id_jurnal_asal: 0,

      lines: [],
    });

  /* =========================
     FETCH DETAIL
  ========================= */

  async function fetchDetail(): Promise<void> {
    try {
      setLoading(true);

      const res =
        await fetch(
          `/api/jurnal-koreksi/${id}`,
        );

      if (!res.ok) {
        showToast(
          "Gagal mengambil data jurnal koreksi",
          "error",
        );

        setLoading(false);

        return;
      }

      const result =
        (await res.json()) as {
          id: number;

          alasan: string;

          id_jurnal_asal: number;
        };

      setForm({
        tanggal: "",

        no_bukti: "",

        keterangan: "",

        alasan:
          result.alasan,

        id_jurnal_asal:
          result.id_jurnal_asal,

        lines: [],
      });
    } catch (
    error: unknown
    ) {
      console.error(
        "FETCH EDIT ERROR:",
        error,
      );

      Swal.fire({
        icon: "error",

        title:
          "Error",

        text:
          "Terjadi kesalahan sistem",
      });
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     LOAD
  ========================= */

  useEffect(() => {
    if (
      Number.isNaN(id)
    ) {
      return;
    }

    void fetchDetail();// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* =========================
     CHANGE
  ========================= */

  function handleChange<
    K extends keyof EditForm,
  >(
    field: K,
    value: EditForm[K],
  ): void {
    setForm(
      (
        prev,
      ): EditForm => ({
        ...prev,
        [field]:
          value,
      }),
    );
  }

  /* =========================
     SUBMIT
  ========================= */

  async function handleSubmit(): Promise<void> {
    try {
      setSaving(true);

      const payload: JurnalKoreksiInput =
      {
        tanggal:
          form.tanggal,

        no_bukti:
          form.no_bukti,

        keterangan:
          form.keterangan,

        alasan:
          form.alasan,

        id_jurnal_asal:
          form.id_jurnal_asal,

        lines:
          form.lines,
      };

      const parsed =
        jurnalKoreksiSchema.safeParse(
          payload,
        );

      if (
        !parsed.success
      ) {
        Swal.fire({
          icon: "error",

          title:
            "Validasi Gagal",

          text:
            "Periksa kembali data jurnal koreksi",
        });

        setSaving(false);

        return;
      }

      const res =
        await fetch(
          `/api/jurnal-koreksi/${id}`,
          {
            method:
              "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload,
              ),
          },
        );

      const result =
        (await res.json()) as {
          error?: string;

          message?: string;
        };

      setSaving(false);

      if (!res.ok) {
        Swal.fire({
          icon: "error",

          title:
            "Gagal",

          text:
            result.error ??
            "Gagal update jurnal koreksi",
        });

        return;
      }

      Swal.fire({
        icon: "success",

        title:
          "Berhasil",

        text:
          result.message ??
          "Jurnal koreksi berhasil diupdate",

        timer: 1500,

        showConfirmButton:
          false,
      }).then(() => {
        router.push(
          "/accounting/jurnal-koreksi",
        );

        router.refresh();
      });
    } catch (
    error: unknown
    ) {
      console.error(
        "UPDATE ERROR:",
        error,
      );

      showToast(
        "Terjadi kesalahan sistem",
        "error",
      );

      setSaving(false);
    }
  }

  /* =========================
     LOADING
  ========================= */

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
      <Card title="Edit Jurnal Koreksi">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tanggal"
            type="date"
            value={
              form.tanggal
            }
            onChange={(
              e,
            ) =>
              handleChange(
                "tanggal",
                e.target
                  .value,
              )
            }
          />

          <Input
            label="No Bukti"
            value={
              form.no_bukti
            }
            onChange={(
              e,
            ) =>
              handleChange(
                "no_bukti",
                e.target
                  .value,
              )
            }
          />

          <div className="col-span-2">
            <Input
              label="Keterangan"
              value={
                form.keterangan
              }
              onChange={(
                e,
              ) =>
                handleChange(
                  "keterangan",
                  e.target
                    .value,
                )
              }
            />
          </div>

          <div className="col-span-2">
            <Input
              label="Alasan Koreksi"
              value={
                form.alasan
              }
              onChange={(
                e,
              ) =>
                handleChange(
                  "alasan",
                  e.target
                    .value,
                )
              }
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() =>
              router.push(
                "/accounting/jurnal-koreksi",
              )
            }
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() =>
              void handleSubmit()
            }
            disabled={
              saving
            }
          >
            {saving ? (
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