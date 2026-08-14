"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, RefreshCw, X } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type SumberTagihan =
  | "MATERIAL"
  | "ALAT_BERAT"
  | "TENAGA_KERJA"
  | "OPERASIONAL"
  | "REALISASI"
  | "SUBKON"
  | "PROGRESS";

type TagihanStatus =
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";

type TagihanHeader = {
  id: string;
  id_proyek: string;
  nomor_invoice?: string;
  tanggal?: string;
  nilai?: number;
  nilai_ppn?: number;
  nilai_pph?: number;
  grand_total?: number;
  status?: TagihanStatus;
  no_bukti?: string | null;
  periode?: string | null;
  id_jurnal: number | null;
};

type DetailItem = {
  id: string;
  id_tagihan: string;
  sumber: SumberTagihan;
  id_referensi: string;
  no_bukti: string | null;
  uraian: string | null;
  qty: number | null;
  satuan: string | null;
  harga: number | null;
  total: number | null;
  id_jurnal: number | null;
  created_at: string;
};

type DetailResponse = {
  tagihan: TagihanHeader;
  details: DetailItem[];
};

type ApiError = {
  error?: string;
};

type SourceItem = {
  id: string;
  id_proyek: string;
  no_bukti: string | null;
  tanggal: string | null;
  uraian: string | null;
  qty: number | null;
  satuan: string | null;
  harga: number | null;
  total: number | null;
  id_jurnal: number | null;
};

type SourceRaw = Record<string, unknown>;

const sumberOptions: {
  value: SumberTagihan;
  label: string;
}[] = [
  {
    value: "MATERIAL",
    label: "Material",
  },
  {
    value: "ALAT_BERAT",
    label: "Alat Berat",
  },
  {
    value: "TENAGA_KERJA",
    label: "Tenaga Kerja",
  },
  {
    value: "OPERASIONAL",
    label: "Operasional",
  },
  {
    value: "REALISASI",
    label: "Realisasi",
  },
  {
    value: "SUBKON",
    label: "Subkon",
  },
  {
    value: "PROGRESS",
    label: "Progress",
  },
];

const sourceEndpoint: Record<SumberTagihan, string> = {
  MATERIAL: "/api/proyek/material",
  ALAT_BERAT: "/api/proyek/alat-berat-konstruksi",
  TENAGA_KERJA: "/api/proyek/tenaga-kerja",
  OPERASIONAL: "/api/proyek/operasional",
  REALISASI: "/api/proyek/realisasi",
  SUBKON: "/api/proyek/subkon",
  PROGRESS: "/api/proyek/progress",
};

function getSourceEndpoint(source: SumberTagihan, proyekId: string): string {
  const query = new URLSearchParams({
    id_proyek: proyekId,
  });

  return `${sourceEndpoint[source]}?${query.toString()}`;
}

function getString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeSource(row: SourceRaw): SourceItem | null {
  const id = getString(row.id);
  const idProyek = getString(row.id_proyek);

  if (!id || !idProyek) {
    return null;
  }

  const total = getNumber(row.total);

  const qty =
    getNumber(row.qty) ??
    getNumber(row.volume) ??
    getNumber(row.target_volume) ??
    getNumber(row.realisasi_volume);

  const harga =
    getNumber(row.harga) ??
    getNumber(row.harga_satuan) ??
    getNumber(row.tarif_sewa_internal) ??
    getNumber(row.upah) ??
    (qty !== null && qty > 0 && total !== null ? total / qty : null);

  const noBukti = getString(row.no_bukti) ?? getString(row.nomor_invoice);

  const tanggal = getString(row.tanggal) ?? getString(row.tanggal_mulai);

  const uraian =
    getString(row.uraian) ??
    getString(row.pekerjaan) ??
    getString(row.keterangan) ??
    getString(row.nama);

  const satuan = getString(row.satuan);

  const idJurnal = getNumber(row.id_jurnal);

  return {
    id,
    id_proyek: idProyek,
    no_bukti: noBukti,
    tanggal,
    uraian,
    qty,
    satuan,
    harga,
    total,
    id_jurnal: idJurnal,
  };
}

function extractSourceRows(value: unknown): SourceRaw[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is SourceRaw =>
        typeof item === "object" && item !== null && !Array.isArray(item),
    );
  }

  if (typeof value === "object" && value !== null && "data" in value) {
    const data = value.data;

    if (Array.isArray(data)) {
      return data.filter(
        (item): item is SourceRaw =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      );
    }
  }

  return [];
}

function formatRupiah(value: number | null | undefined): string {
  return `Rp ${Number(value ?? 0).toLocaleString("id-ID")}`;
}

function getApiError(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }

  return "Terjadi kesalahan.";
}

export default function TagihanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const proyekId = params.id as string;
  const tagihanId = params.tagihanId as string;

  const [loading, setLoading] = useState(true);

  const [loadingSource, setLoadingSource] = useState(false);

  const [saving, setSaving] = useState(false);

  const [tagihan, setTagihan] = useState<TagihanHeader | null>(null);

  const [details, setDetails] = useState<DetailItem[]>([]);

  const [sumber, setSumber] = useState<SumberTagihan>("MATERIAL");

  const [sources, setSources] = useState<SourceItem[]>([]);

  const [selectedSourceId, setSelectedSourceId] = useState<string>("");

  async function loadDetail(): Promise<void> {
    try {
      setLoading(true);

      const response = await fetch(`/api/proyek/tagihan/${tagihanId}/detail`);

      const result: unknown = await response.json();

      if (!response.ok) {
        throw new Error(getApiError(result));
      }

      const data = result as DetailResponse;

      setTagihan(data.tagihan);
      setDetails(data.details);
    } catch (error: unknown) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal mengambil detail tagihan.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadSources(selectedSumber: SumberTagihan): Promise<void> {
    try {
      setLoadingSource(true);
      setSources([]);
      setSelectedSourceId("");

      const endpoint = getSourceEndpoint(selectedSumber, proyekId);

      const response = await fetch(endpoint);

      const result: unknown = await response.json();

      if (!response.ok) {
        throw new Error(getApiError(result));
      }

      const rows = extractSourceRows(result);

      const normalized = rows
        .map(normalizeSource)
        .filter(
          (item): item is SourceItem =>
            item !== null && item.id_proyek === proyekId,
        );

      setSources(normalized);
    } catch (error: unknown) {
      console.error("LOAD SOURCE ERROR:", error);

      showToast(
        error instanceof Error
          ? error.message
          : `Gagal mengambil data ${selectedSumber}.`,
        "error",
      );
    } finally {
      setLoadingSource(false);
    }
  }
  useEffect(() => {
    void loadDetail();
  }, [tagihanId]);

  useEffect(() => {
    void loadSources(sumber);
  }, [sumber, proyekId]);

  const selectedSource =
    sources.find((item) => item.id === selectedSourceId) ?? null;

  const existingReferences = useMemo(
    () =>
      new Set(
        details
          .filter((item) => item.sumber === sumber)
          .map((item) => item.id_referensi),
      ),
    [details, sumber],
  );

  const availableSources = sources.filter(
    (item) => !existingReferences.has(item.id),
  );

  const totalDetails = details.reduce(
    (sum, item) => sum + Number(item.total ?? 0),
    0,
  );

  const totalBySource = (source: SumberTagihan): number =>
    details
      .filter((item) => item.sumber === source)
      .reduce((sum, item) => sum + Number(item.total ?? 0), 0);

  async function handleAddDetail(): Promise<void> {
    if (!selectedSource) {
      showToast("Pilih transaksi terlebih dahulu.", "error");
      return;
    }

    if (selectedSource.total === null || selectedSource.total < 0) {
      showToast("Total transaksi sumber tidak valid.", "error");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`/api/proyek/tagihan/${tagihanId}/detail`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sumber,
          id_referensi: selectedSource.id,
          no_bukti: selectedSource.no_bukti,
          uraian: selectedSource.uraian,
          qty: selectedSource.qty,
          satuan: selectedSource.satuan,
          harga: selectedSource.harga,
          total: selectedSource.total,
          id_jurnal: selectedSource.id_jurnal,
        }),
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        throw new Error(getApiError(result));
      }

      showToast("Detail tagihan berhasil ditambahkan.", "success");

      setSelectedSourceId("");

      await loadDetail();
    } catch (error: unknown) {
      console.error("ADD DETAIL ERROR:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Gagal menambahkan detail tagihan.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6">
        <Loader2 className="h-5 w-5 animate-spin" />
        Memuat detail tagihan...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Detail Tagihan Proyek">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mt-1 text-sm text-gray-500">
              Hubungkan transaksi sumber biaya ke tagihan proyek.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => router.push(`/proyek/${proyekId}/tagihan`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>

            <Button variant="secondary" onClick={() => void loadDetail()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* =================================================
            INFO TAGIHAN
        ================================================= */}

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <InfoBox label="No Invoice" value={tagihan?.nomor_invoice ?? "-"} />

          <InfoBox label="Tanggal" value={tagihan?.tanggal ?? "-"} />

          <InfoBox label="Nilai Tagihan" value={formatRupiah(tagihan?.nilai)} />

          <InfoBox
            label="Status Jurnal"
            value={tagihan?.id_jurnal !== null ? "Posted" : "Draft"}
          />
        </div>
      </Card>

      {/* =================================================
          RINGKASAN SUMBER
      ================================================= */}

      <Card title="Ringkasan">
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sumberOptions.map((item) => (
            <div key={item.value} className="rounded-lg border p-4">
              <div className="text-xs text-gray-500">{item.label}</div>

              <div className="mt-2 text-lg font-semibold">
                {formatRupiah(totalBySource(item.value))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg bg-gray-50 p-4">
          <div className="text-sm text-gray-500">Total Detail</div>

          <div className="mt-1 text-2xl font-bold">
            {formatRupiah(totalDetails)}
          </div>
        </div>
      </Card>

      {/* =================================================
          PILIH SUMBER
      ================================================= */}

      <Card title="Tambah Sumber Biaya">
        <p className="mt-1 text-sm text-gray-500">
          Pilih transaksi yang sudah tercatat pada proyek ini.
        </p>

        <div className="mt-5">
          <label className="mb-1 block text-sm font-medium">Sumber</label>

          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={sumber}
            onChange={(event) => setSumber(event.target.value as SumberTagihan)}
            disabled={saving}
          >
            {sumberOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-medium">
              Transaksi {sumber}
            </label>

            {loadingSource && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>

          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={selectedSourceId}
            onChange={(event) => setSelectedSourceId(event.target.value)}
            disabled={loadingSource || saving}
          >
            <option value="">-- Pilih transaksi --</option>

            {availableSources.map((item) => (
              <option key={item.id} value={item.id}>
                {item.no_bukti ?? item.id} - {item.uraian ?? "Tanpa uraian"} -{" "}
                {formatRupiah(item.total)}
              </option>
            ))}
          </select>
        </div>

        {/* =================================================
            PREVIEW SUMBER
        ================================================= */}

        {selectedSource && (
          <div className="mt-5 rounded-lg border bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Preview Transaksi</h3>

              <button
                type="button"
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setSelectedSourceId("")}
                disabled={saving}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <InfoBox
                label="No Bukti"
                value={selectedSource.no_bukti ?? "-"}
              />

              <InfoBox label="Tanggal" value={selectedSource.tanggal ?? "-"} />

              <InfoBox
                label="Total"
                value={formatRupiah(selectedSource.total)}
              />

              <InfoBox
                label="Qty"
                value={
                  selectedSource.qty !== null
                    ? selectedSource.qty.toLocaleString("id-ID")
                    : "-"
                }
              />

              <InfoBox label="Satuan" value={selectedSource.satuan ?? "-"} />

              <InfoBox
                label="Harga"
                value={formatRupiah(selectedSource.harga)}
              />
            </div>

            <div className="mt-4">
              <div className="text-xs text-gray-500">Uraian</div>

              <div className="mt-1 text-sm">{selectedSource.uraian ?? "-"}</div>
            </div>

            <div className="mt-5">
              <Button onClick={() => void handleAddDetail()} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menambahkan...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Tambahkan ke Tagihan
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* =================================================
          DETAIL YANG SUDAH DITAMBAHKAN
      ================================================= */}

      <Card title="Detail Tagihan ">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">
              Transaksi yang sudah terhubung dengan tagihan.
            </p>
          </div>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs">
            {details.length} detail
          </span>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2 text-left">No</th>
                <th className="border px-3 py-2 text-left">Sumber</th>
                <th className="border px-3 py-2 text-left">No Bukti</th>
                <th className="border px-3 py-2 text-left">Uraian</th>
                <th className="border px-3 py-2 text-right">Qty</th>
                <th className="border px-3 py-2">Satuan</th>
                <th className="border px-3 py-2 text-right">Harga</th>
                <th className="border px-3 py-2 text-right">Total</th>
                <th className="border px-3 py-2">Jurnal</th>
              </tr>
            </thead>

            <tbody>
              {details.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="border px-3 py-8 text-center text-gray-500"
                  >
                    Belum ada sumber biaya yang dihubungkan.
                  </td>
                </tr>
              ) : (
                details.map((item, index) => (
                  <tr key={item.id}>
                    <td className="border px-3 py-2">{index + 1}</td>

                    <td className="border px-3 py-2 font-medium">
                      {item.sumber}
                    </td>

                    <td className="border px-3 py-2">{item.no_bukti ?? "-"}</td>

                    <td className="border px-3 py-2">{item.uraian ?? "-"}</td>

                    <td className="border px-3 py-2 text-right">
                      {item.qty !== null
                        ? item.qty.toLocaleString("id-ID")
                        : "-"}
                    </td>

                    <td className="border px-3 py-2">{item.satuan ?? "-"}</td>

                    <td className="border px-3 py-2 text-right">
                      {formatRupiah(item.harga)}
                    </td>

                    <td className="border px-3 py-2 text-right font-semibold">
                      {formatRupiah(item.total)}
                    </td>

                    <td className="border px-3 py-2">
                      {item.id_jurnal !== null ? "Posted" : "Belum Posted"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-gray-500">{label}</div>

      <div className="mt-1 break-words text-sm font-semibold">{value}</div>
    </div>
  );
}
