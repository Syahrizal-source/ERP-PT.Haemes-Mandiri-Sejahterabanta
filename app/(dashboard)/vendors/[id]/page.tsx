"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import {
  ArrowLeft,
  Pencil,
  Loader2,
} from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Vendor {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
  kategori_vendor: string | null;
  npwp: string | null;
  nama_npwp: string | null;
  alamat_npwp: string | null;
  telepon: string | null;
  email: string | null;
  alamat: string | null;
  status: boolean | null;
  created_at: string;
  updated_at: string | null;
  pkp: boolean | null;
  jenis_pajak: string | null;
  id_coa: number | null;
  kode_coa: string | null;
  nama_coa: string | null;
}

interface VendorRekening {
  id: number;
  vendor_id: number;
  nama_bank: string;
  nomor_rekening: string;
  nama_rekening: string;
}

interface VendorPajak {
  id: number;
  vendor_id: number;
  npwp: string | null;
  nama_npwp: string | null;
  alamat_npwp: string | null;
  pkp: boolean | null;
}

interface VendorDetailResponse {
  vendor: Vendor;
  rekening: VendorRekening[];
  pajak: VendorPajak[];
}

interface ApiErrorResponse {
  error?: string;
}

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();

  const idParam = params.id;
  const id =
    typeof idParam === "string"
      ? idParam
      : Array.isArray(idParam)
        ? idParam[0]
        : "";

  const [data, setData] = useState<Vendor | null>(null);
  const [rekening, setRekening] = useState<VendorRekening[]>([]);
  const [pajak, setPajak] = useState<VendorPajak[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (id === "") {
      setErrorMessage("ID vendor tidak valid");
      setLoading(false);
      return;
    }

    async function load(): Promise<void> {
      try {
        setLoading(true);
        setErrorMessage(null);

        const res = await fetch(
          `/api/vendors/${id}/detail`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const result:
          | VendorDetailResponse
          | ApiErrorResponse = await res.json();

        if (!res.ok) {
          const errorResult = result as ApiErrorResponse;

          setErrorMessage(
            errorResult.error ??
              "Gagal mengambil detail vendor",
          );

          return;
        }

        const detail =
          result as VendorDetailResponse;

        setData(detail.vendor);
        setRekening(detail.rekening);
        setPajak(detail.pajak);
      } catch (error: unknown) {
        console.error(
          "GET VENDOR DETAIL ERROR:",
          error,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Gagal mengambil detail vendor",
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <Card title="Detail Vendor">
          <div className="flex items-center gap-2 py-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            Memuat detail vendor...
          </div>
        </Card>
      </div>
    );
  }

  if (errorMessage !== null) {
    return (
      <div className="max-w-5xl mx-auto">
        <Card title="Detail Vendor">
          <div className="py-6">
            <div className="text-sm text-red-600 mb-4">
              {errorMessage}
            </div>

            <Button
              variant="secondary"
              onClick={() => router.push("/vendors")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="max-w-5xl mx-auto">
        <Card title="Detail Vendor">
          <div className="py-6">
            <div className="text-sm text-gray-500 mb-4">
              Data vendor tidak ditemukan.
            </div>

            <Button
              variant="secondary"
              onClick={() => router.push("/vendors")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card title="Detail Vendor">
        <div className="space-y-8">
          {/* ======================================================
              DATA UTAMA VENDOR
          ====================================================== */}

          <section>
            <h3 className="font-semibold text-lg mb-4">
              Data Vendor
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <div className="text-sm text-gray-500">
                  Kode Vendor
                </div>
                <div className="font-medium">
                  {data.kode_vendor ?? "-"}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">
                  Nama Vendor
                </div>
                <div className="font-medium">
                  {data.nama_vendor}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">
                  Kategori
                </div>
                <div>
                  {data.kategori_vendor ?? "-"}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">
                  Telepon
                </div>
                <div>
                  {data.telepon ?? "-"}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">
                  Email
                </div>
                <div>
                  {data.email ?? "-"}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">
                  Alamat
                </div>
                <div>
                  {data.alamat ?? "-"}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">
                  Status
                </div>

                <div className="mt-1">
                  {data.status === true ? (
                    <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                      Aktif
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                      Nonaktif
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ======================================================
              COA
          ====================================================== */}

          <section>
            <h3 className="font-semibold text-lg mb-4">
              Akun COA
            </h3>

            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-500">
                    ID COA
                  </div>

                  <div className="font-medium">
                    {data.id_coa ?? "-"}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500">
                    Kode COA
                  </div>

                  <div className="font-medium">
                    {data.kode_coa ?? "-"}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500">
                    Nama COA
                  </div>

                  <div className="font-medium">
                    {data.nama_coa ?? "-"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ======================================================
              DATA PAJAK MASTER
          ====================================================== */}

          <section>
            <h3 className="font-semibold text-lg mb-4">
              Data Pajak Vendor
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <div className="text-sm text-gray-500">
                  NPWP
                </div>

                <div className="font-medium">
                  {data.npwp ?? "-"}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">
                  Nama NPWP
                </div>

                <div>
                  {data.nama_npwp ?? "-"}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">
                  Alamat NPWP
                </div>

                <div>
                  {data.alamat_npwp ?? "-"}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">
                  Jenis Pajak
                </div>

                <div>
                  {data.jenis_pajak ?? "-"}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">
                  PKP
                </div>

                <div>
                  {data.pkp === true
                    ? "Ya"
                    : "Tidak"}
                </div>
              </div>
            </div>
          </section>

          {/* ======================================================
              DETAIL VENDOR PAJAK
          ====================================================== */}

          <section>
            <h3 className="font-semibold text-lg mb-4">
              Detail Pajak
            </h3>

            {pajak.length === 0 ? (
              <div className="text-sm text-gray-500 border rounded-lg p-4">
                Belum ada data pajak vendor.
              </div>
            ) : (
              <div className="space-y-3">
                {pajak.map((item) => (
                  <div
                    key={item.id}
                    className="border rounded-lg p-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">
                          NPWP
                        </div>

                        <div>
                          {item.npwp ?? "-"}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-500">
                          Nama NPWP
                        </div>

                        <div>
                          {item.nama_npwp ?? "-"}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-500">
                          Alamat NPWP
                        </div>

                        <div>
                          {item.alamat_npwp ?? "-"}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-500">
                          PKP
                        </div>

                        <div>
                          {item.pkp === true
                            ? "Ya"
                            : "Tidak"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ======================================================
              REKENING VENDOR
          ====================================================== */}

          <section>
            <h3 className="font-semibold text-lg mb-4">
              Rekening Vendor
            </h3>

            {rekening.length === 0 ? (
              <div className="text-sm text-gray-500 border rounded-lg p-4">
                Belum ada rekening vendor.
              </div>
            ) : (
              <div className="space-y-3">
                {rekening.map((item) => (
                  <div
                    key={item.id}
                    className="border rounded-lg p-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">
                          Nama Bank
                        </div>

                        <div className="font-medium">
                          {item.nama_bank}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-500">
                          Nomor Rekening
                        </div>

                        <div className="font-medium">
                          {item.nomor_rekening}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-500">
                          Nama Rekening
                        </div>

                        <div>
                          {item.nama_rekening}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ======================================================
              TIMESTAMP
          ====================================================== */}

          <section className="border-t pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">
                  Dibuat
                </div>

                <div>
                  {new Date(
                    data.created_at,
                  ).toLocaleString("id-ID")}
                </div>
              </div>

              <div>
                <div className="text-gray-500">
                  Terakhir diperbarui
                </div>

                <div>
                  {data.updated_at !== null
                    ? new Date(
                        data.updated_at,
                      ).toLocaleString("id-ID")
                    : "-"}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ========================================================
            BUTTON
        ======================================================== */}

        <div className="flex gap-3 mt-8">
          <Button
            variant="secondary"
            onClick={() => router.push("/vendors")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() =>
              router.push(
                `/vendors/${data.id}/edit`,
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