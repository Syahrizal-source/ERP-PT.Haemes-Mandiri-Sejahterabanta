"use client";

import { useEffect, useState } from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  ArrowLeft,
  Pencil,
  Loader2,
} from "lucide-react";

import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
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

  created_at: string;
}

/* =========================
   PAGE
========================= */

export default function JurnalKoreksiDetailPage() {
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
    data,
    setData,
  ] =
    useState<JurnalKoreksiDetail | null>(
      null,
    );

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
          "Gagal mengambil detail jurnal koreksi",
          "error",
        );

        setLoading(false);

        return;
      }

      const result:
        JurnalKoreksiDetail =
        await res.json();

      setData(result);
    } catch (
    error: unknown
    ) {
      console.error(
        "FETCH DETAIL ERROR:",
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
     NO DATA
  ========================= */

  if (!data) {
    return (
      <div>
        Data jurnal koreksi tidak ditemukan
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Detail Jurnal Koreksi">
        {/* =========================
            DETAIL
        ========================= */}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">
              ID Koreksi
            </p>

            <p className="font-medium">
              {data.id}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Jurnal Asal
            </p>

            <p className="font-medium">
              {
                data.id_jurnal_asal
              }
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Jurnal Koreksi
            </p>

            <p className="font-medium">
              {
                data.id_jurnal_koreksi
              }
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Tanggal Dibuat
            </p>

            <p className="font-medium">
              {new Date(
                data.created_at,
              ).toLocaleDateString(
                "id-ID",
              )}
            </p>
          </div>

          <div className="col-span-2">
            <p className="text-sm text-gray-500">
              Alasan Koreksi
            </p>

            <p className="font-medium">
              {
                data.alasan
              }
            </p>
          </div>
        </div>

        {/* =========================
            ACTION
        ========================= */}

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
              router.push(
                `/accounting/jurnal-koreksi/${data.id}/edit`,
              )
            }
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </Card>
    </div>
  );
}