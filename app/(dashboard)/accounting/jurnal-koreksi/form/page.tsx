"use client";

import { JSX, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { ArrowLeft, Loader2, Save, RotateCcw } from "lucide-react";

import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

import { useToast } from "@/components/ui/toast-context";

import {
  jurnalKoreksiSchema,
  type JurnalKoreksiInput,
  type JurnalKoreksiLineInput,
} from "@/lib/validators/jurnal-koreksi";

/* =========================================================
   TYPES
========================================================= */

interface CoaItem {
  id_coa: number;
  kode: string;
  nama: string;
}

interface JurnalDetailItem {
  id_detail: number;
  id_coa: number;
  debit: number;
  kredit: number;
}

interface JurnalPostedItem {
  id_jurnal: number;
  no_bukti: string;
  keterangan: string;
  tanggal: string;
  sumber: string;
  id_periode: number;
  is_posted: boolean;
  jurnal_detail: JurnalDetailItem[];
}

interface PeriodeStatusResponse {
  id_periode: number;
  status: "OPEN" | "CLOSED";
}

interface SelectedSource {
  id_detail: number;
  id_coa: number;
  debit: number;
  kredit: number;
}

/* =========================================================
   DEFAULT
========================================================= */

const emptyLine: JurnalKoreksiLineInput = {
  id_coa: 0,
  debit: 0,
  kredit: 0,
};

/* =========================================================
   PAGE
========================================================= */

export default function CreateJurnalKoreksiPage(): JSX.Element {
  const router = useRouter();

  const { showToast } = useToast();

  const [loading, setLoading] = useState<boolean>(false);

  const [loadingJurnal, setLoadingJurnal] = useState<boolean>(false);

  const [coaList, setCoaList] = useState<CoaItem[]>([]);

  const [jurnalList, setJurnalList] = useState<JurnalPostedItem[]>([]);

  const [periodeStatusMap, setPeriodeStatusMap] = useState<
    Map<number, "OPEN" | "CLOSED">
  >(new Map());

  const [selectedSource, setSelectedSource] = useState<SelectedSource | null>(
    null,
  );

  const [form, setForm] = useState<JurnalKoreksiInput>({
    tanggal: new Date().toISOString().slice(0, 10),

    no_bukti: "",

    keterangan: "",

    alasan: "",

    id_jurnal_asal: 0,

    id_detail_asal: 0,

    nilai_koreksi: 0,

    id_coa_tujuan: 0,

    lines: [
      {
        ...emptyLine,
      },
      {
        ...emptyLine,
      },
    ],
  });

  /* =======================================================
     COA TUJUAN
  ======================================================= */

  const coaTujuanList = useMemo(
    (): CoaItem[] =>
      coaList.filter(
        (coa: CoaItem): boolean => coa.id_coa !== selectedSource?.id_coa,
      ),
    [coaList, selectedSource],
  );

  /* =======================================================
     FETCH COA
  ======================================================= */

  async function fetchCoa(): Promise<void> {
    try {
      const response = await fetch("/api/coa", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Gagal mengambil daftar COA.");
      }

      const result = (await response.json()) as CoaItem[];

      setCoaList(result);
    } catch (error: unknown) {
      console.error("FETCH COA ERROR:", error);

      showToast(
        error instanceof Error ? error.message : "Gagal mengambil daftar COA.",
        "error",
      );
    }
  }

  /* =======================================================
     FETCH JURNAL
  ======================================================= */

  async function fetchJurnal(): Promise<void> {
    try {
      setLoadingJurnal(true);

      const response = await fetch("/api/jurnal?semua_periode=true", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Gagal mengambil daftar jurnal.");
      }

      const result = (await response.json()) as JurnalPostedItem[];

      const posted = result.filter(
        (item: JurnalPostedItem): boolean => item.is_posted === true,
      );

      const periodeIds = Array.from(
        new Set(
          posted.map((item: JurnalPostedItem): number => item.id_periode),
        ),
      );

      const statusMap = new Map<number, "OPEN" | "CLOSED">();

      await Promise.all(
        periodeIds.map(async (idPeriode: number): Promise<void> => {
          try {
            const periodeResponse = await fetch(
              `/api/periode?id_periode=${idPeriode}`,
              {
                cache: "no-store",
              },
            );

            if (!periodeResponse.ok) {
              return;
            }

            const periodeData = (await periodeResponse.json()) as
              | PeriodeStatusResponse
              | PeriodeStatusResponse[];

            const periode = Array.isArray(periodeData)
              ? periodeData.find(
                  (item: PeriodeStatusResponse): boolean =>
                    item.id_periode === idPeriode,
                )
              : periodeData;

            if (periode) {
              statusMap.set(idPeriode, periode.status);
            }
          } catch (error: unknown) {
            console.error("FETCH PERIODE STATUS ERROR:", error);
          }
        }),
      );

      setPeriodeStatusMap(statusMap);

      setJurnalList(
        posted.sort(
          (a: JurnalPostedItem, b: JurnalPostedItem): number =>
            new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime(),
        ),
      );
    } catch (error: unknown) {
      console.error("FETCH JURNAL ERROR:", error);

      await Swal.fire({
        icon: "error",
        title: "Gagal Memuat Jurnal",
        text:
          error instanceof Error
            ? error.message
            : "Gagal mengambil daftar jurnal.",
        confirmButtonText: "OK",
      });
    } finally {
      setLoadingJurnal(false);
    }
  }

  /* =======================================================
     LOAD
  ======================================================= */

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchCoa();
    void fetchJurnal();
  }, []);

  /* =======================================================
     SELECT JURNAL
  ======================================================= */

  function handleJurnalChange(idJurnal: number): void {
    const jurnal = jurnalList.find(
      (item: JurnalPostedItem): boolean => item.id_jurnal === idJurnal,
    );

    if (!jurnal) {
      setSelectedSource(null);

      setForm(
        (previous): JurnalKoreksiInput => ({
          ...previous,
          id_jurnal_asal: 0,
          id_detail_asal: 0,
          nilai_koreksi: 0,
          id_coa_tujuan: 0,
          lines: [
            {
              ...emptyLine,
            },
            {
              ...emptyLine,
            },
          ],
        }),
      );

      return;
    }

    setSelectedSource(null);

    setForm(
      (previous): JurnalKoreksiInput => ({
        ...previous,
        id_jurnal_asal: jurnal.id_jurnal,
        id_detail_asal: 0,
        nilai_koreksi: 0,
        id_coa_tujuan: 0,
        lines: [
          {
            ...emptyLine,
          },
          {
            ...emptyLine,
          },
        ],
      }),
    );
  }

  /* =======================================================
     SELECT DETAIL ASAL
  ======================================================= */

  function handleSourceDetailChange(idDetail: number): void {
    const jurnal = jurnalList.find(
      (item: JurnalPostedItem): boolean =>
        item.id_jurnal === form.id_jurnal_asal,
    );

    if (!jurnal) {
      return;
    }

    const detail = jurnal.jurnal_detail.find(
      (item: JurnalDetailItem): boolean => item.id_detail === idDetail,
    );

    if (!detail) {
      return;
    }

    const debit = Number(detail.debit);

    const kredit = Number(detail.kredit);

    const nilaiAsal = debit > 0 ? debit : kredit;

    setSelectedSource({
      id_detail: detail.id_detail,
      id_coa: detail.id_coa,
      debit,
      kredit,
    });

    setForm(
      (previous): JurnalKoreksiInput => ({
        ...previous,
        id_detail_asal: detail.id_detail,
        nilai_koreksi: nilaiAsal,
        id_coa_tujuan: 0,
        lines: [
          {
            ...emptyLine,
          },
          {
            ...emptyLine,
          },
        ],
      }),
    );
  }

  /* =======================================================
     VALUE CHANGE
  ======================================================= */

  function handleNilaiKoreksiChange(value: number): void {
    const numericValue = Number.isFinite(value) ? Math.max(0, value) : 0;

    setForm(
      (previous): JurnalKoreksiInput => ({
        ...previous,
        nilai_koreksi: numericValue,
      }),
    );
  }

  /* =======================================================
     TARGET COA CHANGE
  ======================================================= */

  function handleCoaTujuanChange(idCoa: number): void {
    setForm(
      (previous): JurnalKoreksiInput => ({
        ...previous,
        id_coa_tujuan: idCoa,
      }),
    );
  }

  /* =======================================================
     BUILD PREVIEW LINES
  ======================================================= */

  function buildPreviewLines(): JurnalKoreksiLineInput[] {
    if (!selectedSource) {
      return [
        {
          ...emptyLine,
        },
        {
          ...emptyLine,
        },
      ];
    }

    const nilai = Number(form.nilai_koreksi);

    if (nilai <= 0 || form.id_coa_tujuan <= 0) {
      return [
        {
          ...emptyLine,
        },
        {
          ...emptyLine,
        },
      ];
    }

    if (selectedSource.debit > 0) {
      return [
        {
          id_coa: form.id_coa_tujuan,
          debit: nilai,
          kredit: 0,
        },
        {
          id_coa: selectedSource.id_coa,
          debit: 0,
          kredit: nilai,
        },
      ];
    }

    return [
      {
        id_coa: selectedSource.id_coa,
        debit: nilai,
        kredit: 0,
      },
      {
        id_coa: form.id_coa_tujuan,
        debit: 0,
        kredit: nilai,
      },
    ];
  }

  const previewLines = buildPreviewLines();

  /* =======================================================
     TOTAL
  ======================================================= */

  const totalDebit = previewLines.reduce(
    (sum: number, line: JurnalKoreksiLineInput): number =>
      sum + Number(line.debit),
    0,
  );

  const totalKredit = previewLines.reduce(
    (sum: number, line: JurnalKoreksiLineInput): number =>
      sum + Number(line.kredit),
    0,
  );

  /* =======================================================
     COA LOOKUP
  ======================================================= */

  function getCoaLabel(idCoa: number): string {
    const coa = coaList.find((item: CoaItem): boolean => item.id_coa === idCoa);

    if (!coa) {
      return "-";
    }

    return `${coa.kode} - ${coa.nama}`;
  }

  /* =======================================================
     RESET DETAIL
  ======================================================= */

  function resetCorrection(): void {
    if (!selectedSource) {
      return;
    }

    const nilaiAsal =
      selectedSource.debit > 0 ? selectedSource.debit : selectedSource.kredit;

    setForm(
      (previous): JurnalKoreksiInput => ({
        ...previous,
        nilai_koreksi: nilaiAsal,
        id_coa_tujuan: 0,
        lines: [
          {
            ...emptyLine,
          },
          {
            ...emptyLine,
          },
        ],
      }),
    );
  }

  /* =======================================================
     SUBMIT
  ======================================================= */

  async function handleSubmit(): Promise<void> {
    if (!selectedSource) {
      await Swal.fire({
        icon: "warning",
        title: "Detail Jurnal Belum Dipilih",
        text: "Pilih detail COA asal yang akan dikoreksi.",
      });

      return;
    }

    if (form.id_coa_tujuan <= 0) {
      await Swal.fire({
        icon: "warning",
        title: "COA Tujuan Belum Dipilih",
        text: "Pilih COA tujuan koreksi.",
      });

      return;
    }

    const nilaiAsal =
      selectedSource.debit > 0 ? selectedSource.debit : selectedSource.kredit;

    if (form.nilai_koreksi <= 0) {
      await Swal.fire({
        icon: "warning",
        title: "Nilai Koreksi Tidak Valid",
        text: "Nilai koreksi harus lebih besar dari 0.",
      });

      return;
    }

    if (form.nilai_koreksi > nilaiAsal) {
      await Swal.fire({
        icon: "warning",
        title: "Nilai Koreksi Melebihi Nilai Asal",
        text: `Nilai maksimal yang dapat dikoreksi adalah Rp${nilaiAsal.toLocaleString(
          "id-ID",
        )}.`,
      });

      return;
    }

    const lines = buildPreviewLines();

    const payload: JurnalKoreksiInput = {
      ...form,
      lines,
    };

    const parsed = jurnalKoreksiSchema.safeParse(payload);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];

      await Swal.fire({
        icon: "error",
        title: "Validasi Gagal",
        text: firstIssue?.message ?? "Periksa kembali input jurnal koreksi.",
      });

      return;
    }

    if (totalDebit !== totalKredit) {
      await Swal.fire({
        icon: "error",
        title: "Jurnal Tidak Balance",
        text: "Total debit dan kredit harus sama.",
      });

      return;
    }

    const confirm = await Swal.fire({
      icon: "question",
      title: "Simpan Jurnal Koreksi?",
      html: `
          <div style="text-align:left">
            <p><b>COA Asal:</b> ${getCoaLabel(selectedSource.id_coa)}</p>
            <p><b>Nilai Asal:</b> Rp${nilaiAsal.toLocaleString("id-ID")}</p>
            <p><b>Nilai Koreksi:</b> Rp${form.nilai_koreksi.toLocaleString(
              "id-ID",
            )}</p>
            <p><b>COA Tujuan:</b> ${getCoaLabel(form.id_coa_tujuan)}</p>
          </div>
        `,
      showCancelButton: true,
      confirmButtonText: "Ya, Simpan",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/jurnal-koreksi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        error?: string;
        message?: string;
        jurnal_id?: number;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Gagal membuat jurnal koreksi.");
      }

      await Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: result.message ?? "Jurnal koreksi berhasil dibuat.",
        timer: 1600,
        showConfirmButton: false,
      });

      router.push("/accounting/jurnal-koreksi");

      router.refresh();
    } catch (error: unknown) {
      console.error("SUBMIT JURNAL KOREKSI ERROR:", error);

      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text:
          error instanceof Error
            ? error.message
            : "Gagal membuat jurnal koreksi.",
      });
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     SELECTED JOURNAL
  ======================================================= */

  const selectedJournal = jurnalList.find(
    (item: JurnalPostedItem): boolean => item.id_jurnal === form.id_jurnal_asal,
  );

  const selectedPeriodStatus = selectedJournal
    ? (periodeStatusMap.get(selectedJournal.id_periode) ?? "CLOSED")
    : null;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="max-w-7xl mx-auto">
      <Card title="Tambah Jurnal Koreksi">
        <div className="mb-5 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
          <p className="font-semibold">Koreksi jurnal aman dan otomatis</p>

          <p className="mt-1">
            Jurnal asal OPEN maupun CLOSED dapat dipilih. Jurnal asal tidak akan
            diubah. Jurnal koreksi baru akan diposting melalui periode OPEN.
          </p>
        </div>

        {/* ===================================================
            HEADER
        =================================================== */}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) =>
              setForm(
                (previous): JurnalKoreksiInput => ({
                  ...previous,
                  tanggal: e.target.value,
                }),
              )
            }
          />

          <Input
            label="No Bukti"
            value={form.no_bukti}
            onChange={(e) =>
              setForm(
                (previous): JurnalKoreksiInput => ({
                  ...previous,
                  no_bukti: e.target.value,
                }),
              )
            }
          />

          <div>
            <label className="mb-1 block text-sm font-medium">
              Jurnal Asal
            </label>

            <select
              className="w-full rounded border p-2"
              value={form.id_jurnal_asal}
              onChange={(e) => handleJurnalChange(Number(e.target.value))}
              disabled={loadingJurnal || loading}
            >
              <option value={0}>
                {loadingJurnal ? "Memuat jurnal..." : "Pilih Jurnal Asal"}
              </option>

              {jurnalList.map((item: JurnalPostedItem) => {
                const status =
                  periodeStatusMap.get(item.id_periode) ?? "CLOSED";

                return (
                  <option key={item.id_jurnal} value={item.id_jurnal}>
                    [{status}] {item.no_bukti} - {item.keterangan} -{" "}
                    {new Date(item.tanggal).toLocaleDateString("id-ID")}
                  </option>
                );
              })}
            </select>
          </div>

          <Input
            label="Alasan Koreksi"
            value={form.alasan}
            onChange={(e) =>
              setForm(
                (previous): JurnalKoreksiInput => ({
                  ...previous,
                  alasan: e.target.value,
                }),
              )
            }
          />

          <div className="md:col-span-2">
            <Input
              label="Keterangan"
              value={form.keterangan}
              onChange={(e) =>
                setForm(
                  (previous): JurnalKoreksiInput => ({
                    ...previous,
                    keterangan: e.target.value,
                  }),
                )
              }
            />
          </div>
        </div>

        {/* ===================================================
            DETAIL JURNAL ASAL
        =================================================== */}

        {selectedJournal && (
          <div className="mt-6">
            <div className="mb-3">
              <h2 className="font-semibold">Detail Jurnal Asal</h2>

              <p className="mt-1 text-sm text-gray-600">
                Pilih satu detail COA yang akan dikoreksi.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-3 py-2">Pilih</th>

                    <th className="border px-3 py-2 text-left">COA</th>

                    <th className="border px-3 py-2 text-right">Debit</th>

                    <th className="border px-3 py-2 text-right">Kredit</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedJournal.jurnal_detail.map(
                    (detail: JurnalDetailItem) => {
                      const debit = Number(detail.debit);

                      const kredit = Number(detail.kredit);

                      const selectable =
                        (debit > 0 && kredit === 0) ||
                        (kredit > 0 && debit === 0);

                      return (
                        <tr
                          key={detail.id_detail}
                          className={
                            form.id_detail_asal === detail.id_detail
                              ? "bg-blue-50"
                              : ""
                          }
                        >
                          <td className="border px-3 py-2 text-center">
                            <input
                              type="radio"
                              name="detail-asal"
                              checked={form.id_detail_asal === detail.id_detail}
                              disabled={!selectable || loading}
                              onChange={() =>
                                handleSourceDetailChange(detail.id_detail)
                              }
                            />
                          </td>

                          <td className="border px-3 py-2">
                            {getCoaLabel(detail.id_coa)}
                          </td>

                          <td className="border px-3 py-2 text-right">
                            {debit.toLocaleString("id-ID")}
                          </td>

                          <td className="border px-3 py-2 text-right">
                            {kredit.toLocaleString("id-ID")}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3 rounded border bg-gray-50 p-3 text-sm">
              <div>
                <b>No Bukti:</b> {selectedJournal.no_bukti}
              </div>

              <div>
                <b>Tanggal:</b>{" "}
                {new Date(selectedJournal.tanggal).toLocaleDateString("id-ID")}
              </div>

              <div>
                <b>Sumber:</b> {selectedJournal.sumber}
              </div>

              <div>
                <b>Periode:</b> {selectedJournal.id_periode}{" "}
                <span className="font-semibold">[{selectedPeriodStatus}]</span>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            PERBAIKI NILAI
        =================================================== */}

        {selectedSource && (
          <div className="mt-6 rounded-lg border p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Perbaiki Nilai Jurnal</h2>

              <Button
                variant="secondary"
                onClick={resetCorrection}
                disabled={loading}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  COA Asal
                </label>

                <div className="rounded border bg-gray-100 p-2">
                  {getCoaLabel(selectedSource.id_coa)}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Nilai Asal
                </label>

                <div className="rounded border bg-gray-100 p-2 font-semibold">
                  Rp
                  {(selectedSource.debit > 0
                    ? selectedSource.debit
                    : selectedSource.kredit
                  ).toLocaleString("id-ID")}
                </div>
              </div>

              <div>
                <Input
                  label="Nilai yang Dikoreksi"
                  type="number"
                  min={0}
                  value={form.nilai_koreksi}
                  onChange={(e) =>
                    handleNilaiKoreksiChange(Number(e.target.value))
                  }
                  disabled={loading}
                />

                <p className="mt-1 text-xs text-gray-500">
                  Maksimal sesuai nilai detail jurnal asal.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  COA Tujuan Koreksi
                </label>

                <select
                  className="w-full rounded border p-2"
                  value={form.id_coa_tujuan}
                  onChange={(e) =>
                    handleCoaTujuanChange(Number(e.target.value))
                  }
                  disabled={loading}
                >
                  <option value={0}>Pilih COA Tujuan</option>

                  {coaTujuanList.map((coa: CoaItem) => (
                    <option key={coa.id_coa} value={coa.id_coa}>
                      {coa.kode} - {coa.nama}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* =================================================
                SISA
            ================================================= */}

            <div className="mt-4 rounded border bg-blue-50 p-4">
              <div className="text-sm font-medium">
                Sisa Nilai Setelah Koreksi
              </div>

              <div className="mt-1 text-xl font-bold">
                Rp
                {Math.max(
                  0,
                  (selectedSource.debit > 0
                    ? selectedSource.debit
                    : selectedSource.kredit) - form.nilai_koreksi,
                ).toLocaleString("id-ID")}
              </div>
            </div>

            {/* =================================================
                PREVIEW
            ================================================= */}

            <div className="mt-6">
              <h3 className="mb-3 font-semibold">Bentuk Jurnal Koreksi</h3>

              <div className="rounded border bg-gray-50 p-4 text-sm">
                {selectedSource.debit > 0 ? (
                  <p>
                    Karena COA asal berada di sisi <b>Debit</b>, sistem otomatis
                    membuat:
                  </p>
                ) : (
                  <p>
                    Karena COA asal berada di sisi <b>Kredit</b>, sistem
                    otomatis membuat:
                  </p>
                )}

                <table className="mt-3 w-full border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-3 py-2 text-left">COA</th>

                      <th className="border px-3 py-2 text-right">Debit</th>

                      <th className="border px-3 py-2 text-right">Kredit</th>
                    </tr>
                  </thead>

                  <tbody>
                    {previewLines.map(
                      (line: JurnalKoreksiLineInput, index: number) => (
                        <tr key={`${line.id_coa}-${index}`}>
                          <td className="border px-3 py-2">
                            {getCoaLabel(line.id_coa)}
                          </td>

                          <td className="border px-3 py-2 text-right">
                            {line.debit > 0
                              ? line.debit.toLocaleString("id-ID")
                              : "-"}
                          </td>

                          <td className="border px-3 py-2 text-right">
                            {line.kredit > 0
                              ? line.kredit.toLocaleString("id-ID")
                              : "-"}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>

                  <tfoot>
                    <tr className="font-semibold">
                      <td className="border px-3 py-2 text-right">TOTAL</td>

                      <td className="border px-3 py-2 text-right">
                        {totalDebit.toLocaleString("id-ID")}
                      </td>

                      <td className="border px-3 py-2 text-right">
                        {totalKredit.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            ACTION
        =================================================== */}

        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push("/accounting/jurnal-koreksi")}
            disabled={loading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>

          <Button
            onClick={() => void handleSubmit()}
            disabled={
              loading ||
              !selectedSource ||
              form.id_coa_tujuan <= 0 ||
              form.nilai_koreksi <= 0
            }
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Simpan Jurnal Koreksi
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
