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
  ArrowLeft,
  Pencil,
  Loader2,
} from "lucide-react";

import Card from "@/components/ui/Card";

import Button from "@/components/ui/Button";

import { useToast } from "@/components/ui/toast-context";

import type {
  HutangLeasingInput,
} from "@/types/leasing";

/* =========================
   TYPES
========================= */

interface HutangLeasingItem
  extends HutangLeasingInput {
  id: number;

  created_at?: string;
}

/* =========================
   PAGE
========================= */

export default function HutangLeasingDetailPage() {
  const router = useRouter();

  const params =
    useParams();

  const { showToast } =
    useToast();

  const id = Number(
    params.id,
  );

  const [data, setData] =
    useState<HutangLeasingItem | null>(
      null,
    );

  const [loading, setLoading] =
    useState<boolean>(true);

  /* =========================
     FETCH DETAIL
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
            "Gagal mengambil detail leasing",
            "error",
          );

          setLoading(
            false,
          );

          return;
        }

        const result: HutangLeasingItem =
          await res.json();

        setData(
          result,
        );

        setLoading(
          false,
        );
      } catch (
      error: unknown
      ) {
        console.error(
          "DETAIL LEASING ERROR:",
          error,
        );

        showToast(
          "Terjadi kesalahan",
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
     DATA NOT FOUND
  ========================= */

  if (!data) {
    return (
      <div>
        Data leasing tidak ditemukan
      </div>
    );
  }

  /* =========================
     UI
  ========================= */

  return (
    <div className="max-w-6xl mx-auto">
      <Card title="Detail Hutang Leasing">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">
              Tanggal
            </p>

            <p>
              {
                data.tanggal
              }
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              No Kontrak
            </p>

            <p>
              {
                data.no_kontrak
              }
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Nama PT Leasing
            </p>

            <p>
              {
                data.nama_pt_leasing
              }
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Keterangan Unit
            </p>

            <p>
              {
                data.keterangan_unit
              }
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Jumlah Unit
            </p>

            <p>
              {data.jumlah_unit.toLocaleString(
                "id-ID",
              )}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Uang Muka
            </p>

            <p>
              {data.uang_muka.toLocaleString(
                "id-ID",
              )}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Hutang Pokok
            </p>

            <p>
              {data.hutang_pokok.toLocaleString(
                "id-ID",
              )}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Persentase Bunga
            </p>

            <p>
              {
                data.persentase_bunga
              }
              %
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Bunga
            </p>

            <p>
              {data.bunga.toLocaleString(
                "id-ID",
              )}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Hutang Pembiayaan
            </p>

            <p>
              {data.hutang_pembiayaan.toLocaleString(
                "id-ID",
              )}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Tenor Bulan
            </p>

            <p>
              {
                data.tenor_bulan
              }{" "}
              Bulan
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Angsuran Perbulan
            </p>

            <p>
              {data.angsuran_perbulan.toLocaleString(
                "id-ID",
              )}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Tanggal Mulai
            </p>

            <p>
              {
                data.tanggal_mulai
              }
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Tanggal Selesai
            </p>

            <p>
              {
                data.tanggal_selesai
              }
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Bulan Terbayar
            </p>

            <p>
              {
                data.bulan_terbayar
              }
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Total Sudah Dibayar
            </p>

            <p>
              {data.total_sudah_dibayar.toLocaleString(
                "id-ID",
              )}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Angsuran Tahun Berjalan
            </p>

            <p>
              {data.angsuran_tahun_berjalan.toLocaleString(
                "id-ID",
              )}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Tanggal Pembayaran
            </p>

            <p>
              Tanggal{" "}
              {
                data.tanggal_pembayaran
              }
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Sisa Hutang
            </p>

            <p>
              {data.sisa_hutang.toLocaleString(
                "id-ID",
              )}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Sisa Bulan
            </p>

            <p>
              {
                data.sisa_bulan
              }
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Hutang Jangka Pendek
            </p>

            <p>
              {data.hutang_jangka_pendek.toLocaleString(
                "id-ID",
              )}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Hutang Jangka Panjang
            </p>

            <p>
              {data.hutang_jangka_panjang.toLocaleString(
                "id-ID",
              )}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Status
            </p>

            <p>
              {
                data.status
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
                "/accounting/hutang-leasing",
              )
            }
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() =>
              router.push(
                `/accounting/hutang-leasing/${data.id}/edit`,
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