"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type StatusTagihan =
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";

type FormState = {
  id_proyek: string;
  nomor_invoice: string;
  tanggal: string;
  no_bukti: string;
  periode: string;
  status: StatusTagihan;
  nilai_ppn: number;
  nilai_pph: number;
};

type TagihanResponse = {
  id: string;
  id_proyek: string;
  nomor_invoice: string;
  tanggal: string;
  nilai: number;
  status: StatusTagihan;
  no_bukti: string | null;
  periode: string | null;

  total_material: number | null;
  total_alat_berat: number | null;
  total_tenaga_kerja: number | null;
  total_operasional: number | null;
  total_realisasi: number | null;
  total_subkon: number | null;
  total_progress: number | null;

  nilai_ppn: number | null;
  nilai_pph: number | null;
  grand_total: number | null;

  id_jurnal: number | null;
};

type ApiErrorResponse = {
  error?: string;
};

const INITIAL_FORM: FormState = {
  id_proyek: "",
  nomor_invoice: "",
  tanggal: "",
  no_bukti: "",
  periode: "",
  status: "Unpaid (Menunggu Pembayaran)",
  nilai_ppn: 0,
  nilai_pph: 0,
};

function toNumber(value: number | null): number {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export default function EditTagihanPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;
  const tagihanId = params.tagihanId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const [summary, setSummary] = useState({
    nilai: 0,
    total_material: 0,
    total_alat_berat: 0,
    total_tenaga_kerja: 0,
    total_operasional: 0,
    total_realisasi: 0,
    total_subkon: 0,
    total_progress: 0,
    grand_total: 0,
  });

  const [idJurnal, setIdJurnal] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      try {
        setLoading(true);

        const res = await fetch(
          `/api/proyek/tagihan?id_proyek=${encodeURIComponent(proyekId)}`,
        );

        const result: unknown = await res.json();

        if (!res.ok) {
          const errorResult = result as ApiErrorResponse;

          showToast(
            errorResult.error ?? "Gagal mengambil data tagihan.",
            "error",
          );

          return;
        }

        const data = result as TagihanResponse[];

        const current = data.find((item) => item.id === tagihanId);

        if (!current) {
          showToast("Data tagihan tidak ditemukan.", "error");

          router.push(`/proyek/${proyekId}/tagihan`);

          return;
        }

        if (current.id_proyek !== proyekId) {
          showToast("Tagihan tidak sesuai dengan proyek.", "error");

          router.push(`/proyek/${proyekId}/tagihan`);

          return;
        }

        setForm({
          id_proyek: current.id_proyek,
          nomor_invoice: current.nomor_invoice ?? "",
          tanggal: current.tanggal ?? "",
          no_bukti: current.no_bukti ?? "",
          periode: current.periode ?? "",
          status: current.status,
          nilai_ppn: toNumber(current.nilai_ppn),
          nilai_pph: toNumber(current.nilai_pph),
        });

        setSummary({
          nilai: toNumber(current.nilai),
          total_material: toNumber(current.total_material),
          total_alat_berat: toNumber(current.total_alat_berat),
          total_tenaga_kerja: toNumber(current.total_tenaga_kerja),
          total_operasional: toNumber(current.total_operasional),
          total_realisasi: toNumber(current.total_realisasi),
          total_subkon: toNumber(current.total_subkon),
          total_progress: toNumber(current.total_progress),
          grand_total: toNumber(current.grand_total),
        });

        setIdJurnal(current.id_jurnal);
      } catch (error: unknown) {
        console.error("FETCH TAGIHAN ERROR:", error);

        showToast("Gagal mengambil data tagihan.", "error");
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, [proyekId, tagihanId, router, showToast]);

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    if (!form.nomor_invoice.trim()) {
      showToast("Nomor invoice wajib diisi.", "error");
      return;
    }

    if (!form.tanggal) {
      showToast("Tanggal wajib diisi.", "error");
      return;
    }

    if (form.nilai_ppn < 0) {
      showToast("Nilai PPN tidak boleh minus.", "error");
      return;
    }

    if (form.nilai_pph < 0) {
      showToast("Nilai PPh tidak boleh minus.", "error");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        id_proyek: proyekId,
        nomor_invoice: form.nomor_invoice.trim(),
        tanggal: form.tanggal,
        no_bukti: form.no_bukti.trim() || null,
        periode: form.periode.trim() || null,
        status: form.status,
        nilai_ppn: form.nilai_ppn,
        nilai_pph: form.nilai_pph,
      };

      const res = await fetch(`/api/proyek/tagihan/${tagihanId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result: unknown = await res.json();

      if (!res.ok) {
        const errorResult = result as ApiErrorResponse;

        showToast(errorResult.error ?? "Gagal update tagihan.", "error");

        return;
      }

      showToast("Tagihan berhasil diupdate.", "success");

      router.push(`/proyek/${proyekId}/tagihan`);

      router.refresh();
    } catch (error: unknown) {
      console.error("UPDATE TAGIHAN ERROR:", error);

      showToast("Terjadi kesalahan saat update tagihan.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6">
        <Loader2 className="h-5 w-5 animate-spin" />
        Memuat data tagihan...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Card title="Edit Tagihan Proyek">
        <div className="mb-6">
          <p className="text-sm text-gray-500">
            Perubahan hanya dilakukan pada informasi header tagihan. Detail
            sumber biaya tetap mengikuti transaksi proyek.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Nomor Invoice"
            value={form.nomor_invoice}
            onChange={(e) => handleChange("nomor_invoice", e.target.value)}
          />

          <Input
            label="Nomor Bukti"
            value={form.no_bukti}
            onChange={(e) => handleChange("no_bukti", e.target.value)}
          />

          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            label="Periode"
            value={form.periode}
            onChange={(e) => handleChange("periode", e.target.value)}
          />

          <div>
            <label className="mb-1 block text-sm font-medium">Status</label>

            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) =>
                handleChange("status", e.target.value as StatusTagihan)
              }
            >
              <option value="Unpaid (Menunggu Pembayaran)">
                Unpaid (Menunggu Pembayaran)
              </option>

              <option value="Partial (Pembayaran Sebagian)">
                Partial (Pembayaran Sebagian)
              </option>

              <option value="Paid (Pembayaran Penuh/ Lunas)">
                Paid (Pembayaran Penuh/ Lunas)
              </option>
            </select>
          </div>

          <Input
            label="Nilai PPN"
            type="number"
            min={0}
            value={form.nilai_ppn}
            onChange={(e) =>
              handleChange(
                "nilai_ppn",
                Number.isFinite(Number(e.target.value))
                  ? Number(e.target.value)
                  : 0,
              )
            }
          />

          <Input
            label="Nilai PPh"
            type="number"
            min={0}
            value={form.nilai_pph}
            onChange={(e) =>
              handleChange(
                "nilai_pph",
                Number.isFinite(Number(e.target.value))
                  ? Number(e.target.value)
                  : 0,
              )
            }
          />
        </div>

        {/* =====================================================
            RINGKASAN DETAIL TAGIHAN
        ===================================================== */}

        <div className="mt-8">
          <h2 className="mb-3 text-base font-semibold">
            Ringkasan Detail Tagihan
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <tbody>
                <tr>
                  <td className="border px-3 py-2">Material</td>
                  <td className="border px-3 py-2 text-right">
                    Rp {summary.total_material.toLocaleString("id-ID")}
                  </td>
                </tr>

                <tr>
                  <td className="border px-3 py-2">Alat Berat</td>
                  <td className="border px-3 py-2 text-right">
                    Rp {summary.total_alat_berat.toLocaleString("id-ID")}
                  </td>
                </tr>

                <tr>
                  <td className="border px-3 py-2">Tenaga Kerja</td>
                  <td className="border px-3 py-2 text-right">
                    Rp {summary.total_tenaga_kerja.toLocaleString("id-ID")}
                  </td>
                </tr>

                <tr>
                  <td className="border px-3 py-2">Operasional</td>
                  <td className="border px-3 py-2 text-right">
                    Rp {summary.total_operasional.toLocaleString("id-ID")}
                  </td>
                </tr>

                <tr>
                  <td className="border px-3 py-2">Realisasi</td>
                  <td className="border px-3 py-2 text-right">
                    Rp {summary.total_realisasi.toLocaleString("id-ID")}
                  </td>
                </tr>

                <tr>
                  <td className="border px-3 py-2">Subkon</td>
                  <td className="border px-3 py-2 text-right">
                    Rp {summary.total_subkon.toLocaleString("id-ID")}
                  </td>
                </tr>

                <tr>
                  <td className="border px-3 py-2">Progress</td>
                  <td className="border px-3 py-2 text-right">
                    Rp {summary.total_progress.toLocaleString("id-ID")}
                  </td>
                </tr>

                <tr className="font-semibold">
                  <td className="border px-3 py-2">Nilai Tagihan</td>
                  <td className="border px-3 py-2 text-right">
                    Rp {summary.nilai.toLocaleString("id-ID")}
                  </td>
                </tr>

                <tr>
                  <td className="border px-3 py-2">PPN</td>
                  <td className="border px-3 py-2 text-right">
                    Rp {form.nilai_ppn.toLocaleString("id-ID")}
                  </td>
                </tr>

                <tr>
                  <td className="border px-3 py-2">PPh</td>
                  <td className="border px-3 py-2 text-right">
                    Rp {form.nilai_pph.toLocaleString("id-ID")}
                  </td>
                </tr>

                <tr className="font-bold">
                  <td className="border px-3 py-2">Grand Total</td>
                  <td className="border px-3 py-2 text-right">
                    Rp {summary.grand_total.toLocaleString("id-ID")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* =====================================================
            STATUS JURNAL
        ===================================================== */}

        <div className="mt-5 rounded-md border bg-gray-50 p-3 text-sm">
          <span className="font-medium">Status Jurnal:</span>{" "}
          {idJurnal !== null ? (
            <span className="font-semibold text-green-600">
              Posted — Jurnal #{idJurnal}
            </span>
          ) : (
            <span className="font-semibold text-yellow-600">
              Belum diposting
            </span>
          )}
        </div>

        {/* =====================================================
            ACTION
        ===================================================== */}

        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => router.push(`/proyek/${proyekId}/tagihan`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>

          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Update
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
