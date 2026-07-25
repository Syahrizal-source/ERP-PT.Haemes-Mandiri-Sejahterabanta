"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
  useParams,
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
  hutangLeasingSchema,
} from "@/lib/validators/hutang-leasing";

import type {
  HutangLeasingInput,
} from "@/types/leasing";

/* =========================
   FORM TYPE
========================= */

type HutangLeasingForm =
  HutangLeasingInput;

/* =========================
   PAGE
========================= */

export default function EditHutangLeasingPage() {
  const router = useRouter();

  const params =
    useParams();

  const { showToast } =
    useToast();

  const id = Number(
    params.id,
  );

  const [loading, setLoading] =
    useState<boolean>(true);

  const [saving, setSaving] =
    useState<boolean>(false);

  const [form, setForm] =
    useState<HutangLeasingForm>({
      tanggal: "",

      no_kontrak: "",

      nama_pt_leasing: "",

      keterangan_unit: "",

      jumlah_unit: 1,

      uang_muka: 0,

      hutang_pokok: 0,

      persentase_bunga: 0,

      bunga: 0,

      hutang_pembiayaan: 0,

      tenor_bulan: 12,

      angsuran_perbulan: 0,

      tanggal_mulai: "",

      tanggal_selesai: "",

      bulan_terbayar: 0,

      total_sudah_dibayar: 0,

      angsuran_tahun_berjalan: 0,

      tanggal_pembayaran: 1,

      sisa_hutang: 0,

      sisa_bulan: 0,

      hutang_jangka_pendek: 0,

      hutang_jangka_panjang: 0,

      status: "OPEN",
    });

  /* =========================
     FETCH DATA
  ========================= */

  useEffect(() => {
    async function fetchData(): Promise<void> {
      try {
        const res =
          await fetch(
            `/api/hutang-leasing/${id}`,
          );

        if (!res.ok) {
          showToast(
            "Gagal mengambil data leasing",
            "error",
          );

          setLoading(
            false,
          );

          return;
        }

        const data: HutangLeasingForm =
          await res.json();

        setForm(
          data,
        );

        setLoading(
          false,
        );
      } catch (
      error: unknown
      ) {
        console.error(
          "FETCH EDIT LEASING ERROR:",
          error,
        );

        showToast(
          "Terjadi kesalahan sistem",
          "error",
        );

        setLoading(
          false,
        );
      }
    }

    if (
      Number.isInteger(
        id,
      )
    ) {
      fetchData();
    }
  }, [
    id,
    showToast,
  ]);

  /* =========================
     HANDLE CHANGE
  ========================= */

  function handleChange<
    K extends keyof HutangLeasingForm,
  >(
    field: K,
    value: HutangLeasingForm[K],
  ): void {
    setForm((prev) => ({
      ...prev,

      [field]: value,
    }));
  }

  /* =========================
     SUBMIT
  ========================= */

  async function handleSubmit(): Promise<void> {
    const parsed =
      hutangLeasingSchema.safeParse(
        form,
      );

    if (
      !parsed.success
    ) {
      Swal.fire({
        icon: "error",

        title:
          "Validasi Gagal",

        text:
          "Data leasing belum lengkap",
      });

      return;
    }

    try {
      setSaving(
        true,
      );

      const res =
        await fetch(
          `/api/hutang-leasing/${id}`,
          {
            method:
              "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              form,
            ),
          },
        );

      setSaving(
        false,
      );

      if (!res.ok) {
        const errorData:
          | {
            error?: string;
          }
          | undefined =
          await res.json();

        Swal.fire({
          icon: "error",

          title:
            "Gagal",

          text:
            errorData?.error ??
            "Gagal update leasing",
        });

        return;
      }

      const result:
        | {
          message?: string;
        }
        | undefined =
        await res.json();

      Swal.fire({
        position:
          "center",

        icon: "success",

        title:
          "Update Leasing Berhasil",

        text:
          result?.message ??
          "Berhasil diupdate",

        showConfirmButton: false,

        timer: 1500,
      }).then(() => {
        router.push(
          "/accounting/hutang-leasing",
        );

        router.refresh();
      });
    } catch (
    error: unknown
    ) {
      console.error(
        "UPDATE LEASING ERROR:",
        error,
      );

      setSaving(
        false,
      );

      showToast(
        "Terjadi kesalahan sistem",
        "error",
      );
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

  /* =========================
     UI
  ========================= */

  return (
    <div className="max-w-6xl mx-auto">
      <Card title="Edit Hutang Leasing">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tanggal"
            type="date"
            value={
              form.tanggal
            }
            onChange={(e) =>
              handleChange(
                "tanggal",
                e.target.value,
              )
            }
          />

          <Input
            label="No Kontrak"
            value={
              form.no_kontrak
            }
            onChange={(e) =>
              handleChange(
                "no_kontrak",
                e.target.value,
              )
            }
          />

          <Input
            label="Nama PT Leasing"
            value={
              form.nama_pt_leasing
            }
            onChange={(e) =>
              handleChange(
                "nama_pt_leasing",
                e.target.value,
              )
            }
          />

          <Input
            label="Keterangan Unit"
            value={
              form.keterangan_unit
            }
            onChange={(e) =>
              handleChange(
                "keterangan_unit",
                e.target.value,
              )
            }
          />

          <Input
            label="Jumlah Unit"
            type="number"
            value={
              form.jumlah_unit
            }
            onChange={(e) =>
              handleChange(
                "jumlah_unit",
                Number(
                  e.target.value,
                ),
              )
            }
          />

          <Input
            label="Uang Muka"
            type="number"
            value={
              form.uang_muka
            }
            onChange={(e) =>
              handleChange(
                "uang_muka",
                Number(
                  e.target.value,
                ),
              )
            }
          />

          <Input
            label="Hutang Pokok"
            type="number"
            value={
              form.hutang_pokok
            }
            onChange={(e) =>
              handleChange(
                "hutang_pokok",
                Number(
                  e.target.value,
                ),
              )
            }
          />

          <Input
            label="Persentase Bunga (%)"
            type="number"
            value={
              form.persentase_bunga
            }
            onChange={(e) =>
              handleChange(
                "persentase_bunga",
                Number(
                  e.target.value,
                ),
              )
            }
          />

          <Input
            label="Bunga"
            type="number"
            value={
              form.bunga
            }
            onChange={(e) =>
              handleChange(
                "bunga",
                Number(
                  e.target.value,
                ),
              )
            }
          />

          <Input
            label="Hutang Pembiayaan"
            type="number"
            value={
              form.hutang_pembiayaan
            }
            onChange={(e) =>
              handleChange(
                "hutang_pembiayaan",
                Number(
                  e.target.value,
                ),
              )
            }
          />

          <Input
            label="Tenor (Bulan)"
            type="number"
            value={
              form.tenor_bulan
            }
            onChange={(e) =>
              handleChange(
                "tenor_bulan",
                Number(
                  e.target.value,
                ),
              )
            }
          />

          <Input
            label="Angsuran Perbulan"
            type="number"
            value={
              form.angsuran_perbulan
            }
            onChange={(e) =>
              handleChange(
                "angsuran_perbulan",
                Number(
                  e.target.value,
                ),
              )
            }
          />

          <Input
            label="Tanggal Mulai"
            type="date"
            value={
              form.tanggal_mulai
            }
            onChange={(e) =>
              handleChange(
                "tanggal_mulai",
                e.target.value,
              )
            }
          />

          <Input
            label="Tanggal Selesai"
            type="date"
            value={
              form.tanggal_selesai
            }
            onChange={(e) =>
              handleChange(
                "tanggal_selesai",
                e.target.value,
              )
            }
          />

          <Input
            label="Bulan Terbayar"
            type="number"
            value={
              form.bulan_terbayar
            }
            onChange={(e) =>
              handleChange(
                "bulan_terbayar",
                Number(
                  e.target.value,
                ),
              )
            }
          />

          <Input
            label="Total Sudah Dibayar"
            type="number"
            value={
              form.total_sudah_dibayar
            }
            onChange={(e) =>
              handleChange(
                "total_sudah_dibayar",
                Number(
                  e.target.value,
                ),
              )
            }
          />

          <Input
            label="Angsuran Tahun Berjalan"
            type="number"
            value={
              form.angsuran_tahun_berjalan
            }
            onChange={(e) =>
              handleChange(
                "angsuran_tahun_berjalan",
                Number(
                  e.target.value,
                ),
              )
            }
          />

          <Input
            label="Tanggal Pembayaran"
            type="number"
            value={
              form.tanggal_pembayaran
            }
            onChange={(e) =>
              handleChange(
                "tanggal_pembayaran",
                Number(
                  e.target.value,
                ),
              )
            }
          />

          <Input
            label="Sisa Hutang"
            type="number"
            value={
              form.sisa_hutang
            }
            onChange={(e) =>
              handleChange(
                "sisa_hutang",
                Number(
                  e.target.value,
                ),
              )
            }
          />

          <Input
            label="Sisa Bulan"
            type="number"
            value={
              form.sisa_bulan
            }
            onChange={(e) =>
              handleChange(
                "sisa_bulan",
                Number(
                  e.target.value,
                ),
              )
            }
          />

          <Input
            label="Hutang Jangka Pendek"
            type="number"
            value={
              form.hutang_jangka_pendek
            }
            onChange={(e) =>
              handleChange(
                "hutang_jangka_pendek",
                Number(
                  e.target.value,
                ),
              )
            }
          />

          <Input
            label="Hutang Jangka Panjang"
            type="number"
            value={
              form.hutang_jangka_panjang
            }
            onChange={(e) =>
              handleChange(
                "hutang_jangka_panjang",
                Number(
                  e.target.value,
                ),
              )
            }
          />

          <div>
            <label className="text-sm font-medium">
              Status
            </label>

            <select
              className="w-full border rounded p-2"
              value={
                form.status
              }
              onChange={(e) =>
                handleChange(
                  "status",
                  e.target
                    .value as HutangLeasingForm["status"],
                )
              }
            >
              <option value="OPEN">
                OPEN
              </option>

              <option value="ACTIVE">
                ACTIVE
              </option>

              <option value="LUNAS">
                LUNAS
              </option>

              <option value="CLOSED">
                CLOSED
              </option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() =>
              router.push(
                "/accounting/hutang-leasing",
              )
            }
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={
              handleSubmit
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
                Update
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}