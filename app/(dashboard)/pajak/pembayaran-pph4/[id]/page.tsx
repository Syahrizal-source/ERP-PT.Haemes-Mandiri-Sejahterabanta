"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import Swal from "sweetalert2";

import { ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

/* ============================================================
 * TYPE
 * ============================================================ */

interface PembayaranPph4 {
  id: number;
  tanggal: string;
  id_pph4: number;
  nominal: number;
  keterangan: string;
  id_coa_kas: number;
  id_jurnal: number | null;
  created_at: string;
}

interface CoaDetail {
  id_coa: number;
  kode: string;
  nama: string;
}

interface Pph4Detail {
  id: number;
  tanggal: string;
  nilai_transaksi: number;
  tarif_pph4: number;
  pph4_terutang: number;
}

interface JurnalDetail {
  id_coa: number;
  debit: number;
  kredit: number;
  coa: CoaDetail | null;
}

interface JurnalDetailResponse {
  id_jurnal: number;
  tanggal: string;
  no_bukti: string;
  keterangan: string;
  sumber: string;
  modul: string | null;
  is_posted: boolean;
  details: JurnalDetail[];
}

/* ============================================================
 * PAGE
 * ============================================================ */

export default function Page(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const id: string = typeof params?.id === "string" ? params.id : "";

  const [data, setData] = useState<PembayaranPph4 | null>(null);

  const [pph4, setPph4] = useState<Pph4Detail | null>(null);

  const [jurnal, setJurnal] = useState<JurnalDetailResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(true);

  /* ==========================================================
   * FETCH DATA
   * ========================================================== */

  useEffect(() => {
    let active = true;

    async function fetchData(): Promise<void> {
      if (!id) {
        return;
      }

      try {
        setLoading(true);

        const response = await fetch(
          `/api/pembayaran-pph4/${encodeURIComponent(id)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const result: unknown = await readJsonSafely(response);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(result, "Gagal mengambil detail pembayaran PPh4."),
          );
        }

        const normalized: PembayaranPph4 = normalizePembayaranPph4(result);

        let pph4Data: Pph4Detail | null = null;

        try {
          const pph4Response = await fetch(`/api/pph4/${normalized.id_pph4}`, {
            method: "GET",
            cache: "no-store",
          });

          if (pph4Response.ok) {
            const pph4Result: unknown = await readJsonSafely(pph4Response);

            pph4Data = normalizePph4Detail(pph4Result);
          }
        } catch (error: unknown) {
          console.warn("DETAIL PPH4 TIDAK DAPAT DIMUAT:", error);
        }

        let jurnalData: JurnalDetailResponse | null = null;

        if (normalized.id_jurnal !== null) {
          try {
            /*
             * Mengikuti pola endpoint jurnal yang umum:
             *
             * GET /api/jurnal/{id}
             *
             * Jika endpoint detail jurnal pada project Anda
             * mengembalikan struktur berbeda, data pembayaran
             * tetap dapat ditampilkan karena jurnal adalah
             * informasi tambahan.
             */
            const jurnalResponse = await fetch(
              `/api/jurnal/${normalized.id_jurnal}`,
              {
                method: "GET",
                cache: "no-store",
              },
            );

            if (jurnalResponse.ok) {
              const jurnalResult: unknown =
                await readJsonSafely(jurnalResponse);

              jurnalData = normalizeJurnalDetail(jurnalResult);
            }
          } catch (error: unknown) {
            console.warn("DETAIL JURNAL TIDAK DAPAT DIMUAT:", error);
          }
        }

        if (!active) {
          return;
        }

        setData(normalized);
        setPph4(pph4Data);
        setJurnal(jurnalData);
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        console.error("LOAD DETAIL PEMBAYARAN PPH4 ERROR:", error);

        await Swal.fire(
          "Error",
          getUnknownErrorMessage(
            error,
            "Gagal mengambil detail pembayaran PPh4.",
          ),
          "error",
        );

        router.back();
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void fetchData();

    return () => {
      active = false;
    };
  }, [id, router]);

  /* ==========================================================
   * LOADING
   * ========================================================== */

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card title="Detail Pembayaran PPh4">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />

            <span>Memuat detail pembayaran PPh4...</span>
          </div>
        </Card>
      </div>
    );
  }

  /* ==========================================================
   * EMPTY
   * ========================================================== */

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card title="Detail Pembayaran PPh4">
          <div className="py-8 text-center">
            <p className="text-sm">Data pembayaran PPh4 tidak ditemukan.</p>

            <div className="mt-6">
              <Button
                variant="secondary"
                type="button"
                onClick={() => router.push("/pajak/pembayaran-pph4")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  /* ==========================================================
   * RENDER
   * ========================================================== */

  return (
    <div className="mx-auto max-w-5xl">
      <Card title="Detail Pembayaran PPh4">
        {/* ====================================================
            INFORMASI PEMBAYARAN
            ==================================================== */}

        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <InfoItem label="ID Pembayaran" value={String(data.id)} />

          <InfoItem
            label="Tanggal Pembayaran"
            value={formatTanggal(data.tanggal)}
          />

          <InfoItem label="ID PPh4" value={`#${data.id_pph4}`} />

          <InfoItem
            label="Nominal Pembayaran"
            value={formatRupiah(data.nominal)}
          />

          <InfoItem
            label="COA Kas / Bank"
            value={data.id_coa_kas > 0 ? `ID COA ${data.id_coa_kas}` : "-"}
          />

          <InfoItem
            label="ID Jurnal"
            value={
              data.id_jurnal !== null
                ? String(data.id_jurnal)
                : "Belum terhubung"
            }
          />

          <div className="md:col-span-2">
            <InfoItem label="Keterangan" value={data.keterangan || "-"} />
          </div>
        </div>

        {/* ====================================================
            INFORMASI PPH4
            ==================================================== */}

        {pph4 ? (
          <div className="mt-6 rounded border p-4">
            <h3 className="font-semibold">Informasi PPh4</h3>

            <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <InfoItem
                label="Tanggal PPh4"
                value={formatTanggal(pph4.tanggal)}
              />

              <InfoItem
                label="Nilai Transaksi"
                value={formatRupiah(pph4.nilai_transaksi)}
              />

              <InfoItem label="Tarif PPh4" value={`${pph4.tarif_pph4}%`} />

              <InfoItem
                label="PPh4 Terutang"
                value={formatRupiah(pph4.pph4_terutang)}
              />
            </div>
          </div>
        ) : null}

        {/* ====================================================
            INFORMASI JURNAL
            ==================================================== */}

        <div className="mt-6 rounded border p-4">
          <h3 className="font-semibold">Jurnal Pembayaran PPh4</h3>

          {jurnal ? (
            <>
              <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <InfoItem label="No. Bukti" value={jurnal.no_bukti || "-"} />

                <InfoItem
                  label="Tanggal Jurnal"
                  value={formatTanggal(jurnal.tanggal)}
                />

                <InfoItem
                  label="Sumber"
                  value={jurnal.sumber || "PAJAK_PPH4"}
                />

                <InfoItem
                  label="Status"
                  value={jurnal.is_posted ? "Posted" : "Draft"}
                />

                <div className="md:col-span-2">
                  <InfoItem
                    label="Keterangan Jurnal"
                    value={jurnal.keterangan || "-"}
                  />
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left">COA</th>

                      <th className="px-3 py-2 text-right">Debit</th>

                      <th className="px-3 py-2 text-right">Kredit</th>
                    </tr>
                  </thead>

                  <tbody>
                    {jurnal.details.map((line: JurnalDetail, index: number) => (
                      <tr
                        key={`${line.id_coa}-${index}`}
                        className="border-b last:border-b-0"
                      >
                        <td className="px-3 py-2">
                          {line.coa
                            ? `${line.coa.kode} - ${line.coa.nama}`
                            : `ID COA ${line.id_coa}`}
                        </td>

                        <td className="px-3 py-2 text-right">
                          {line.debit > 0 ? formatRupiah(line.debit) : "-"}
                        </td>

                        <td className="px-3 py-2 text-right">
                          {line.kredit > 0 ? formatRupiah(line.kredit) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="mt-3 rounded border p-3 text-sm">
              <p>
                <strong>Debit:</strong> 2504 - 21304 Hutang Pajak PPh4
              </p>

              <p className="mt-1">
                <strong>Kredit:</strong> COA Kas / Bank DETAIL yang dipilih
              </p>

              <p className="mt-3 text-xs text-gray-500">
                Jurnal pembayaran direferensikan melalui id_jurnal pada
                pembayaran_pph4.
              </p>
            </div>
          )}
        </div>

        {/* ====================================================
            VALIDASI COA
            ==================================================== */}

        <div className="mt-6 rounded border p-4 text-sm">
          <h3 className="font-semibold">Struktur COA Pembayaran</h3>

          <div className="mt-3">
            <p>
              <strong>Debit:</strong> 2504 - 21304 Hutang Pajak PPh4
            </p>

            <p className="mt-1">
              <strong>Kredit:</strong> COA Kas / Bank DETAIL
            </p>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Pembayaran PPh4 tidak menggunakan COA 2265 Beban Pajak PPh4. COA
            2265 digunakan pada saat pembentukan beban, bukan saat pelunasan
            hutang PPh4.
          </p>

          <p className="mt-1 text-xs text-gray-500">
            COA 3 - 11100 Kas adalah COA HEADER sehingga tidak boleh digunakan
            sebagai kredit jurnal pembayaran.
          </p>
        </div>

        {/* ====================================================
            BUTTON
            ==================================================== */}

        <div className="mt-6">
          <Button
            variant="secondary"
            type="button"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
 * INFO ITEM
 * ============================================================ */

interface InfoItemProps {
  label: string;
  value: string;
}

function InfoItem({ label, value }: InfoItemProps): React.JSX.Element {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>

      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

/* ============================================================
 * NORMALIZE PAYMENT
 * ============================================================ */

function normalizePembayaranPph4(value: unknown): PembayaranPph4 {
  if (typeof value !== "object" || value === null) {
    throw new Error("Format detail pembayaran PPh4 tidak valid.");
  }

  const item: Record<string, unknown> = value as Record<string, unknown>;

  const id: number = Number(item.id);
  const idPph4: number = Number(item.id_pph4);
  const nominal: number = Number(item.nominal);
  const idCoaKas: number = Number(item.id_coa_kas);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("ID pembayaran PPh4 tidak valid.");
  }

  if (!Number.isInteger(idPph4) || idPph4 <= 0) {
    throw new Error("ID PPh4 tidak valid.");
  }

  if (!Number.isFinite(nominal) || nominal <= 0) {
    throw new Error("Nominal pembayaran PPh4 tidak valid.");
  }

  if (!Number.isInteger(idCoaKas) || idCoaKas <= 0) {
    throw new Error("COA kas/bank pembayaran PPh4 tidak valid.");
  }

  return {
    id,
    tanggal: String(item.tanggal ?? ""),
    id_pph4: idPph4,
    nominal,
    keterangan: String(item.keterangan ?? ""),
    id_coa_kas: idCoaKas,
    id_jurnal:
      item.id_jurnal === null || item.id_jurnal === undefined
        ? null
        : Number(item.id_jurnal),
    created_at: String(item.created_at ?? ""),
  };
}

/* ============================================================
 * NORMALIZE PPH4
 * ============================================================ */

function normalizePph4Detail(value: unknown): Pph4Detail {
  if (typeof value !== "object" || value === null) {
    throw new Error("Format detail PPh4 tidak valid.");
  }

  const item: Record<string, unknown> = value as Record<string, unknown>;

  return {
    id: Number(item.id),
    tanggal: String(item.tanggal ?? ""),
    nilai_transaksi: Number(item.nilai_transaksi ?? 0),
    tarif_pph4: Number(item.tarif_pph4 ?? 0),
    pph4_terutang: Number(item.pph4_terutang ?? 0),
  };
}

/* ============================================================
 * NORMALIZE JURNAL
 * ============================================================ */

function normalizeJurnalDetail(value: unknown): JurnalDetailResponse | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const item: Record<string, unknown> = value as Record<string, unknown>;

  const rawDetails: unknown =
    item.details ?? item.jurnal_detail ?? item.detail ?? [];

  const details: JurnalDetail[] = Array.isArray(rawDetails)
    ? rawDetails
        .filter(
          (detail: unknown): detail is Record<string, unknown> =>
            typeof detail === "object" && detail !== null,
        )
        .map((detail: Record<string, unknown>): JurnalDetail => {
          const rawCoa: unknown = detail.coa;

          let coa: CoaDetail | null = null;

          if (typeof rawCoa === "object" && rawCoa !== null) {
            const coaObject: Record<string, unknown> = rawCoa as Record<
              string,
              unknown
            >;

            coa = {
              id_coa: Number(coaObject.id_coa),
              kode: String(coaObject.kode ?? ""),
              nama: String(coaObject.nama ?? ""),
            };
          }

          return {
            id_coa: Number(detail.id_coa),
            debit: Number(detail.debit ?? 0),
            kredit: Number(detail.kredit ?? 0),
            coa,
          };
        })
    : [];

  return {
    id_jurnal: Number(item.id_jurnal ?? item.id ?? 0),
    tanggal: String(item.tanggal ?? ""),
    no_bukti: String(item.no_bukti ?? ""),
    keterangan: String(item.keterangan ?? ""),
    sumber: String(item.sumber ?? "PAJAK_PPH4"),
    modul:
      item.modul === null || item.modul === undefined
        ? null
        : String(item.modul),
    is_posted: item.is_posted === true,
    details,
  };
}

/* ============================================================
 * FORMAT TANGGAL
 * ============================================================ */

function formatTanggal(value: string): string {
  if (!value) {
    return "-";
  }

  const date: Date = new Date(`${value.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/* ============================================================
 * FORMAT RUPIAH
 * ============================================================ */

function formatRupiah(value: number): string {
  const amount: number = Number.isFinite(value) ? value : 0;

  return `Rp ${amount.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/* ============================================================
 * SAFE JSON
 * ============================================================ */

async function readJsonSafely(response: Response): Promise<unknown> {
  const contentType: string = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text: string = await response.text();

    throw new Error(
      `Server mengembalikan response bukan JSON (${response.status}). ` +
        `${text.slice(0, 200)}`,
    );
  }

  return response.json();
}

/* ============================================================
 * ERROR MESSAGE
 * ============================================================ */

function getErrorMessage(value: unknown, fallback: string): string {
  if (typeof value === "object" && value !== null && "error" in value) {
    const error: unknown = value.error;

    if (typeof error === "string" && error.trim()) {
      return error;
    }
  }

  return fallback;
}

/* ============================================================
 * UNKNOWN ERROR
 * ============================================================ */

function getUnknownErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
