import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import QRCode from "qrcode";
import { db } from "@/lib/supabase/server";
import { generateQRCodeValue } from "@/lib/helpers/qrcode";

/* =========================================================
   TYPES
========================================================= */

interface LabaRugiDetailRow {
  id_jurnal: number;
  tanggal: string;
  no_bukti: string;
  keterangan: string;
  sumber: string | null;
  modul: string | null;
  ref_id: string | null;
  id_detail: number;
  id_coa: number;
  debit: number | string | null;
  kredit: number | string | null;
  kode_coa: string;
  nama_coa: string;
  tipe_coa: string;
  normal_balance: string | null;
  kategori_laporan: string | null;
  sub_kategori: string | null;
  kelompok_utama: string | null;
  kelompok_detail: string | null;
  level_coa: number | null;
  parent_id: number | null;
}

interface JournalDetailProjectRow {
  id_detail: number;
  id_proyek: string | null;
}

interface ProjectRow {
  id: string;
  kode_proyek: string;
  nama_proyek: string;
  customer: string | null;
}

interface JurnalReportRow {
  id_jurnal: number;
  tanggal: string;
  no_bukti: string;
  keterangan: string;
  sumber: string | null;
  modul: string | null;
  ref_id: string | null;
  id_periode: number;
}

interface RevenueLedgerViewRow {
  id_jurnal: number | string;
  id_detail: number | string;
  id_coa: number | string;
  id_periode?: number | string | null;
  tanggal: string;
  no_bukti: string | null;
  keterangan: string | null;
  sumber: string | null;
  status?: string | null;
  is_posted?: boolean | null;
  kode_coa: string | null;
  nama_coa: string | null;
  tipe_coa?: string | null;
  debit: number | string | null;
  kredit: number | string | null;
  saldo_berjalan?: number | string | null;
}

interface PeriodeReportRow {
  id_periode: number;
  nama_periode: string;
  status: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  is_closed: boolean;
}

interface LabaRugiViewRow {
  id_jurnal: number;
  tanggal: string;
  no_bukti: string;
  sumber: string | null;
  modul: string | null;
  ref_id: string | null;
  id_detail: number;
  id_coa: number;
  kode_coa: string;
  nama_coa: string;
  tipe_coa: string;
  kategori_laporan: string | null;
  sub_kategori: string | null;
  kelompok_utama: string | null;
  kelompok_detail: string | null;
  debit: number | string | null;
  kredit: number | string | null;
  nilai_laba_rugi: number | string | null;
  kelompok_laba_rugi: string;
}

interface AggregatedCoa {
  id_coa: number;
  kode_coa: string;
  nama_coa: string;
  tipe_coa: string;
  kategori_laporan: string | null;
  sub_kategori: string | null;
  kelompok_utama: string | null;
  kelompok_detail: string | null;
  kelompok_laba_rugi: string;
  total_debit: number;
  total_kredit: number;
  nilai_laba_rugi: number;
}

interface ReportLine {
  id_coa: number;
  kode: string;
  nama: string;
  tipe: string;
  saldo: number;
  kategori_laporan: string | null;
  sub_kategori: string | null;
  kelompok_utama: string | null;
  kelompok_detail: string | null;
  urutan: number;
}

interface ReportSection {
  title: string;
  rows: ReportLine[];
  total: number;
}

interface ReportTotals {
  pendapatanOperasionalJurnal: number;
  biayaPenjualan: number;
  labaKotor: number;
  penghasilanLain: number;
  bebanAdministratif: number;
  bebanLain: number;
  bebanPajakPenghasilan: number;
  labaSebelumPajak: number;
  labaBersih: number;
}

interface PendapatanProyekSourceRow {
  id: number;
  id_proyek: string;
  tanggal: string;
  no_bukti: string;
  jenis_transaksi: string;
  keterangan: string | null;
  nilai_pendapatan: number | string | null;
  jenis_pajak: string | null;
  tarif_pajak: number | string | null;
  nilai_pajak: number | string | null;
  nilai_bersih: number | string | null;
  id_jurnal: number | null;
}

interface PendapatanProyekRow {
  tanggal: string;
  id_jurnal: number;
  no_bukti: string;
  keterangan: string;
  id_detail: number;
  id_proyek: string | null;
  kode_proyek: string | null;
  nama_proyek: string | null;
  customer: string | null;
  debit: number;
  kredit: number;
  pendapatan: number;
  nilai_pajak: number;
  pendapatan_bersih: number;
}

interface AsetReportRow {
  kategori_aset: string | null;
  nilai_perolehan: number | string | null;
  akumulasi_depresiasi: number | string | null;
  depresiasi_bulanan: number | string | null;
  nilai_buku: number | string | null;
}

interface AsetReportSummary {
  jumlahAset: number;
  nilaiPerolehan: number;
  akumulasiDepresiasi: number;
  depresiasiBulanan: number;
  nilaiBuku: number;
}

/* =========================================================
   CONSTANT
========================================================= */

/**
 * Data lama tidak dipakai.
 *
 * Cut-off data baru yang sudah divalidasi:
 * 11-08-2026
 */
/**
 * Rentang default mengikuti periode OPEN dari tabel periode.
 * Parameter tanggal_mulai/tanggal_selesai dapat mengubah rentang
 * jika memang dikirim secara eksplisit.
 */

const COMPANY_NAME = "PT. Haemes Mandiri Sejahterabanta";

const REPORT_SECTION = "JASA CUT & FILL DAN PENGURUGAN TANAH";

const ACCOUNTING_FORMAT = '"Rp" #,##0;[Red]("Rp" #,##0)';

/* =========================================================
   BASIC HELPERS
========================================================= */

function toNumber(value: number | string | null | undefined): number {
  const result = Number(value ?? 0);

  return Number.isFinite(result) ? result : 0;
}

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function sanitizeSheetName(name: string): string {
  const sanitized = name.replace(/[\\/*?:[\]]/g, "").trim();

  return sanitized.substring(0, 31) || "Detail";
}

function formatSheetName(kode: string, nama: string, idCoa: number): string {
  return sanitizeSheetName(`${kode}-${nama}-${idCoa}`);
}

function formatDateIndonesia(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatPrintDate(): string {
  // Tanggal cetak mengikuti tanggal aktual saat laporan dibuat,
  // bukan tanggal periode akuntansi.
  return new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/* =========================================================
   DATE RANGE
========================================================= */

function getReportDateRange(
  searchParams: URLSearchParams,
  periodeOpen: PeriodeReportRow,
): {
  tanggalMulai: string;
  tanggalSelesai: string;
} {
  const tanggalMulaiParam = searchParams.get("tanggal_mulai")?.trim();
  const tanggalSelesaiParam = searchParams.get("tanggal_selesai")?.trim();

  const tanggalMulai =
    tanggalMulaiParam && /^\d{4}-\d{2}-\d{2}$/.test(tanggalMulaiParam)
      ? tanggalMulaiParam
      : periodeOpen.tanggal_mulai;

  const tanggalSelesai =
    tanggalSelesaiParam && /^\d{4}-\d{2}-\d{2}$/.test(tanggalSelesaiParam)
      ? tanggalSelesaiParam
      : periodeOpen.tanggal_selesai;

  return { tanggalMulai, tanggalSelesai };
}

/** Menghasilkan batas akhir eksklusif agar seluruh transaksi pada tanggal akhir ikut terambil. */
function getNextDate(dateValue: string): string {
  const date = new Date(`${dateValue}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Tanggal laporan tidak valid: ${dateValue}`);
  }

  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/* =========================================================
   EXCEL STYLE
========================================================= */

function applyHeaderStyle(cell: ExcelJS.Cell): void {
  cell.font = {
    bold: true,
    color: {
      argb: "000000",
    },
  };

  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "F4CCCC",
    },
  };

  cell.border = {
    top: {
      style: "thin",
    },
    left: {
      style: "thin",
    },
    bottom: {
      style: "thin",
    },
    right: {
      style: "thin",
    },
  };
}

function applySectionStyle(cell: ExcelJS.Cell): void {
  cell.font = {
    bold: true,
  };

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "D9EAD3",
    },
  };
}

function applyTotalStyle(cell: ExcelJS.Cell): void {
  cell.font = {
    bold: true,
  };

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "D9D9D9",
    },
  };

  cell.border = {
    top: {
      style: "thin",
    },
    bottom: {
      style: "double",
    },
  };
}

/* =========================================================
   TITLE
========================================================= */

function createTitle(
  sheet: ExcelJS.Worksheet,
  companyTitle: string,
  section: string,
  reportTitle: string,
  periode: string,
  printDate: string,
): void {
  sheet.mergeCells("A1:J1");

  sheet.getCell("A1").value = reportTitle;

  sheet.getCell("A1").font = {
    bold: true,
    size: 18,
  };

  sheet.getCell("A1").alignment = {
    horizontal: "center",
  };

  sheet.mergeCells("A2:J2");

  sheet.getCell("A2").value = companyTitle;

  sheet.getCell("A2").font = {
    bold: true,
    size: 15,
  };

  sheet.getCell("A2").alignment = {
    horizontal: "center",
  };

  sheet.mergeCells("A3:J3");

  sheet.getCell("A3").value = section;

  sheet.getCell("A3").alignment = {
    horizontal: "center",
  };

  sheet.getCell("A5").value = `PERIODE : ${periode}`;

  sheet.getCell("A6").value = `TANGGAL CETAK : ${printDate}`;

  sheet.getCell("A7").value = "MATA UANG : Rupiah (IDR)";

  sheet.mergeCells("A8:J8");

  const divider = sheet.getCell("A8");

  divider.border = {
    bottom: {
      style: "medium",
    },
  };

  divider.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "EDEDED",
    },
  };
}

/* =========================================================
   SIGNATURE
========================================================= */

function addSignature(sheet: ExcelJS.Worksheet, row: number): void {
  sheet.getCell(`B${row}`).value = "Direksi";

  sheet.getCell(`H${row}`).value = "Manager";

  sheet.getCell(`B${row}`).font = {
    bold: true,
  };

  sheet.getCell(`H${row}`).font = {
    bold: true,
  };

  sheet.getCell(`B${row + 4}`).value = "(_________________)";

  sheet.getCell(`H${row + 4}`).value = "(_________________)";

  sheet.getCell(`B${row + 5}`).value = COMPANY_NAME;

  sheet.getCell(`H${row + 5}`).value = "Finance Manager";
}

/* =========================================================
   INTERNAL EXCEL HYPERLINK
========================================================= */

function setInternalHyperlink(
  cell: ExcelJS.Cell,
  text: string,
  targetSheet: string,
): void {
  const safeSheet = sanitizeSheetName(targetSheet);

  cell.value = {
    text,
    hyperlink: `#'${safeSheet}'!A1`,
  };

  cell.font = {
    color: {
      argb: "0000FF",
    },
    underline: true,
  };
}

/* =========================================================
   AGGREGATE PERIOD COA
   Sumber klasifikasi dan nilai laba rugi:
   public.v_laba_rugi_report_detail
========================================================= */

function aggregateCoaRows(detailRows: LabaRugiViewRow[]): AggregatedCoa[] {
  const map = new Map<number, AggregatedCoa>();

  for (const item of detailRows) {
    const idCoa = Number(item.id_coa);

    if (!Number.isInteger(idCoa) || idCoa <= 0) {
      continue;
    }

    const debit = toNumber(item.debit);
    const kredit = toNumber(item.kredit);
    const nilaiLabaRugi = toNumber(item.nilai_laba_rugi);

    const existing = map.get(idCoa);

    if (existing) {
      existing.total_debit += debit;
      existing.total_kredit += kredit;
      existing.nilai_laba_rugi += nilaiLabaRugi;
      continue;
    }

    map.set(idCoa, {
      id_coa: idCoa,
      kode_coa: item.kode_coa,
      nama_coa: item.nama_coa,
      tipe_coa: item.tipe_coa,
      kategori_laporan: item.kategori_laporan,
      sub_kategori: item.sub_kategori,
      kelompok_utama: item.kelompok_utama,
      kelompok_detail: item.kelompok_detail,
      kelompok_laba_rugi: item.kelompok_laba_rugi,
      total_debit: debit,
      total_kredit: kredit,
      nilai_laba_rugi: nilaiLabaRugi,
    });
  }

  return Array.from(map.values()).sort((a, b): number => a.id_coa - b.id_coa);
}

/* =========================================================
   BUILD REPORT LINE
========================================================= */

function toReportLine(row: AggregatedCoa): ReportLine {
  return {
    id_coa: row.id_coa,
    kode: row.kode_coa,
    nama: row.nama_coa,
    tipe: row.tipe_coa,
    saldo: row.nilai_laba_rugi,
    kategori_laporan: row.kategori_laporan,
    sub_kategori: row.sub_kategori,
    kelompok_utama: row.kelompok_utama,
    kelompok_detail: row.kelompok_detail,
    urutan: row.id_coa,
  };
}

/* =========================================================
   BUILD REPORT SECTIONS
   Klasifikasi sepenuhnya mengikuti:
   public.v_laba_rugi_report_detail.kelompok_laba_rugi
========================================================= */

function buildReportSections(coaRows: AggregatedCoa[]): {
  pendapatanProyek: ReportSection;
  penghasilanLain: ReportSection;
  biayaPenjualan: ReportSection;
  bebanAdministratif: ReportSection;
  bebanLain: ReportSection;
  pajakPenghasilan: ReportSection;
} {
  const onlyNonZero = (rows: ReportLine[]): ReportLine[] =>
    rows.filter((row): boolean => Math.abs(row.saldo) > 0.000001);

  const rowsByGroup = (kelompok: string): ReportLine[] =>
    onlyNonZero(
      coaRows
        .filter(
          (row): boolean => normalizeText(row.kelompok_laba_rugi) === kelompok,
        )
        .map(toReportLine),
    ).sort((a, b): number => a.urutan - b.urutan);

  const sumRows = (rows: ReportLine[]): number =>
    rows.reduce((total, row): number => total + row.saldo, 0);

  const pendapatanProyekRows = rowsByGroup("PENDAPATAN_OPERASIONAL");

  const penghasilanLainRows = rowsByGroup("PENGHASILAN_LAIN");

  const biayaPenjualanRows = rowsByGroup("BIAYA_PENJUALAN");

  const bebanAdministratifRows = rowsByGroup("BEBAN_ADMINISTRATIF");

  const bebanLainRows = rowsByGroup("BEBAN_LAIN");

  const pajakPenghasilanRows = rowsByGroup("BEBAN_PAJAK_PENGHASILAN");

  return {
    pendapatanProyek: {
      title: "Pendapatan Proyek",
      rows: pendapatanProyekRows,
      total: sumRows(pendapatanProyekRows),
    },

    penghasilanLain: {
      title: "Penghasilan Lain",
      rows: penghasilanLainRows,
      total: sumRows(penghasilanLainRows),
    },

    biayaPenjualan: {
      title: "Biaya Penjualan",
      rows: biayaPenjualanRows,
      total: sumRows(biayaPenjualanRows),
    },

    bebanAdministratif: {
      title: "Beban Administratif",
      rows: bebanAdministratifRows,
      total: sumRows(bebanAdministratifRows),
    },

    bebanLain: {
      title: "Beban Lain",
      rows: bebanLainRows,
      total: sumRows(bebanLainRows),
    },

    pajakPenghasilan: {
      title: "Beban Pajak Penghasilan",
      rows: pajakPenghasilanRows,
      total: sumRows(pajakPenghasilanRows),
    },
  };
}

/* =========================================================
   PROJECT RELATION
========================================================= */

async function getProjectRelations(detailRows: LabaRugiDetailRow[]): Promise<{
  projectLinks: Map<number, string | null>;
  projects: ProjectRow[];
}> {
  const revenueDetailIds = detailRows
    .filter(
      (item): boolean =>
        normalizeText(item.tipe_coa) === "PENDAPATAN" &&
        normalizeText(item.kelompok_utama) === "PENDAPATAN_OPERASIONAL",
    )
    .map((item): number => Number(item.id_detail))
    .filter((id): boolean => Number.isInteger(id) && id > 0);

  const uniqueDetailIds = Array.from(new Set(revenueDetailIds));

  const projectLinks = new Map<number, string | null>();

  const projects: ProjectRow[] = [];

  if (uniqueDetailIds.length === 0) {
    return {
      projectLinks,
      projects,
    };
  }

  const { data: journalDetailData, error: journalDetailError } = await db
    .from("jurnal_detail")
    .select(
      `
        id_detail,
        id_proyek
      `,
    )
    .in("id_detail", uniqueDetailIds);

  if (journalDetailError) {
    throw new Error(
      `Gagal mengambil relasi proyek jurnal_detail: ${journalDetailError.message}`,
    );
  }

  const journalProjectRows = (journalDetailData ??
    []) as JournalDetailProjectRow[];

  for (const row of journalProjectRows) {
    projectLinks.set(Number(row.id_detail), row.id_proyek);
  }

  const projectIds = Array.from(
    new Set(
      journalProjectRows
        .map((row): string | null => row.id_proyek)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );

  if (projectIds.length === 0) {
    return {
      projectLinks,
      projects,
    };
  }

  const { data: projectData, error: projectError } = await db
    .from("proyek_master")
    .select(
      `
        id,
        kode_proyek,
        nama_proyek,
        customer
      `,
    )
    .in("id", projectIds);

  if (projectError) {
    throw new Error(`Gagal mengambil proyek_master: ${projectError.message}`);
  }

  projects.push(...((projectData ?? []) as ProjectRow[]));

  return {
    projectLinks,
    projects,
  };
}

/* =========================================================
   BUILD PROJECT REVENUE ROWS
========================================================= */

async function getPendapatanProyekSource(
  detailRows: LabaRugiDetailRow[],
  projectLinks: Map<number, string | null>,
): Promise<Map<number, PendapatanProyekSourceRow>> {
  const revenueRows = detailRows.filter(
    (item): boolean =>
      normalizeText(item.tipe_coa) === "PENDAPATAN" &&
      normalizeText(item.kelompok_utama) === "PENDAPATAN_OPERASIONAL",
  );

  const revenueJournalIds = Array.from(
    new Set(
      revenueRows
        .map((item): number => Number(item.id_jurnal))
        .filter((id): boolean => Number.isInteger(id) && id > 0),
    ),
  );

  const sourceMap = new Map<number, PendapatanProyekSourceRow>();

  if (revenueJournalIds.length === 0) {
    return sourceMap;
  }

  /*
   * Jangan hanya mencari berdasarkan id_jurnal.
   * Data historis yang sudah diposting bisa memiliki id_jurnal yang
   * berbeda/null pada public.pendapatan_proyek, sementara voucher,
   * proyek, tanggal, dan nilai transaksi tetap merupakan referensi
   * yang valid untuk mencocokkan sumber Pendapatan Bersih.
   */
  const { data, error } = await db
    .from("pendapatan_proyek")
    .select(
      `
        id,
        id_proyek,
        tanggal,
        no_bukti,
        jenis_transaksi,
        keterangan,
        nilai_pendapatan,
        jenis_pajak,
        tarif_pajak,
        nilai_pajak,
        nilai_bersih,
        id_jurnal
      `,
    )
    .order("tanggal", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(
      `Gagal mengambil sumber pendapatan proyek dari public.pendapatan_proyek: ${error.message}`,
    );
  }

  const sourceRows = (data ?? []) as PendapatanProyekSourceRow[];

  const sourceByJournalId = new Map<number, PendapatanProyekSourceRow>();
  const sourceByVoucher = new Map<string, PendapatanProyekSourceRow[]>();

  for (const row of sourceRows) {
    if (row.id_jurnal !== null && Number.isInteger(Number(row.id_jurnal))) {
      sourceByJournalId.set(Number(row.id_jurnal), row);
    }

    const voucher = normalizeText(row.no_bukti);

    if (voucher.length > 0) {
      const existing = sourceByVoucher.get(voucher) ?? [];
      existing.push(row);
      sourceByVoucher.set(voucher, existing);
    }
  }

  for (const item of revenueRows) {
    const idJurnal = Number(item.id_jurnal);

    if (!Number.isInteger(idJurnal) || idJurnal <= 0) {
      continue;
    }

    /* 1. Prioritas pertama: relasi id_jurnal langsung. */
    const directSource = sourceByJournalId.get(idJurnal);

    if (directSource) {
      sourceMap.set(idJurnal, directSource);
      continue;
    }

    /* 2. Prioritas kedua: voucher/no_bukti. */
    const voucherCandidates =
      sourceByVoucher.get(normalizeText(item.no_bukti)) ?? [];

    if (voucherCandidates.length === 1) {
      sourceMap.set(idJurnal, voucherCandidates[0]);
      continue;
    }

    /*
     * 3. Prioritas ketiga: proyek + nilai bruto.
     *
     * Jangan mensyaratkan tanggal sama. Data historis yang sudah diposting
     * dapat memiliki tanggal jurnal berbeda dengan tanggal record pada
     * public.pendapatan_proyek.
     *
     * Contoh data yang diberikan:
     * - jurnal 611: 11/08/2026, PRJ-008, bruto 60.000.000
     * - pendapatan_proyek: 23/09/2026, INV-PRJ008-002, PRJ-008,
     *   bruto 60.000.000, bersih 58.410.000
     *
     * Keduanya tetap dipasangkan karena proyek + nilai bruto identik.
     */
    const idProyekJurnal = projectLinks.get(Number(item.id_detail)) ?? null;
    const jurnalBruto = Math.abs(toNumber(item.kredit) - toNumber(item.debit));

    const projectCandidates = sourceRows.filter((row): boolean => {
      const sameProject =
        idProyekJurnal !== null && row.id_proyek === idProyekJurnal;

      const sourceBruto = toNumber(row.nilai_pendapatan);
      const sameAmount = Math.abs(sourceBruto - jurnalBruto) <= 0.000001;

      return sameProject && sameAmount;
    });

    if (projectCandidates.length === 1) {
      sourceMap.set(idJurnal, projectCandidates[0]);
      continue;
    }

    /* Jika kandidat lebih dari satu, gunakan tanggal jurnal sebagai
       tie-breaker. Jika masih ambigu, jangan menebak nilai bersih. */
    if (projectCandidates.length > 1) {
      const sameJournalDateCandidates = projectCandidates.filter(
        (row): boolean => row.tanggal === item.tanggal,
      );

      if (sameJournalDateCandidates.length === 1) {
        sourceMap.set(idJurnal, sameJournalDateCandidates[0]);
      }
    }
  }

  return sourceMap;
}

/* =========================================================
   BUILD PROJECT REVENUE ROWS
========================================================= */

function buildPendapatanProyekRows(
  detailRows: LabaRugiDetailRow[],
  projectLinks: Map<number, string | null>,
  projects: ProjectRow[],
  pendapatanSourceMap: Map<number, PendapatanProyekSourceRow>,
): PendapatanProyekRow[] {
  const projectMap = new Map<string, ProjectRow>();

  for (const project of projects) {
    projectMap.set(project.id, project);
  }

  return detailRows
    .filter(
      (item): boolean =>
        normalizeText(item.tipe_coa) === "PENDAPATAN" &&
        normalizeText(item.kelompok_utama) === "PENDAPATAN_OPERASIONAL",
    )
    .flatMap((item): PendapatanProyekRow[] => {
      const idJurnal = Number(item.id_jurnal);
      const source = pendapatanSourceMap.get(idJurnal);

      /*
       * Jurnal posted tanpa pasangan sumber pada public.pendapatan_proyek
       * tidak boleh membuat API 500 dan tidak boleh dipaksa menjadi
       * Pendapatan Bersih. Nilai net hanya boleh berasal dari
       * public.pendapatan_proyek.nilai_bersih.
       */
      if (!source) {
        console.warn(
          "LABA RUGI: sumber Pendapatan Bersih tidak ditemukan untuk jurnal posted. Baris ini tidak dimasukkan ke Pendapatan Bersih.",
          {
            id_jurnal: idJurnal,
            no_bukti: item.no_bukti,
          },
        );
        return [];
      }

      const idProyekJurnal = projectLinks.get(Number(item.id_detail)) ?? null;

      const idProyekSource =
        typeof source.id_proyek === "string" && source.id_proyek.length > 0
          ? source.id_proyek
          : null;

      if (
        idProyekJurnal !== null &&
        idProyekSource !== null &&
        idProyekJurnal !== idProyekSource
      ) {
        throw new Error(
          `Relasi proyek tidak cocok untuk voucher ${item.no_bukti}. Jurnal: ${idProyekJurnal}, pendapatan_proyek: ${idProyekSource}.`,
        );
      }

      const idProyek = idProyekSource ?? idProyekJurnal;
      const project = idProyek !== null ? projectMap.get(idProyek) : undefined;

      if (project === undefined) {
        console.warn(
          "LABA RUGI: master proyek tidak ditemukan untuk sumber Pendapatan Bersih. Baris tidak dimasukkan.",
          {
            no_bukti: source.no_bukti,
            id_proyek: idProyek,
          },
        );
        return [];
      }

      const debit = toNumber(item.debit);
      const kredit = toNumber(item.kredit);
      const pendapatan = toNumber(source.nilai_pendapatan);
      const nilaiPajak = toNumber(source.nilai_pajak);
      const pendapatanBersih = toNumber(source.nilai_bersih);

      if (!Number.isFinite(pendapatanBersih) || pendapatanBersih < 0) {
        throw new Error(
          `Nilai Bersih tidak valid untuk voucher ${source.no_bukti}.`,
        );
      }

      return [
        {
          // Periode Laba Rugi mengikuti tanggal jurnal posted.
          // Tanggal public.pendapatan_proyek hanya menjadi metadata sumber.
          tanggal: item.tanggal,
          id_jurnal: idJurnal,
          no_bukti: source.no_bukti,
          keterangan: source.keterangan ?? item.keterangan,
          id_detail: Number(item.id_detail),
          id_proyek: idProyek,
          kode_proyek: project.kode_proyek,
          nama_proyek: project.nama_proyek,
          customer: project.customer,
          debit,
          kredit,
          pendapatan,
          nilai_pajak: nilaiPajak,
          pendapatan_bersih: pendapatanBersih,
        },
      ];
    })
    .sort((a, b): number => {
      const dateA = new Date(a.tanggal).getTime();
      const dateB = new Date(b.tanggal).getTime();

      if (dateA !== dateB) {
        return dateA - dateB;
      }

      return a.id_jurnal - b.id_jurnal;
    });
}

/* =========================================================
   DATA ASET
========================================================= */

/*
 * public.aset adalah sumber data master aset.
 *
 * Penting:
 * - Data aset dipakai sebagai data pendukung dan rekonsiliasi.
 * - Laba Rugi tetap mengambil nilai beban dari jurnal posted.
 * - depresiasi_bulanan tidak langsung ditambahkan ke Laba Rugi.
 *   Jika jurnal penyusutan sudah diposting, menambahkan depresiasi_bulanan
 *   lagi akan menghasilkan double counting.
 */
async function getAssetData(): Promise<AsetReportRow[]> {
  const { data, error } = await db
    .from("aset")
    .select(
      `
        kategori_aset,
        nilai_perolehan,
        akumulasi_depresiasi,
        depresiasi_bulanan,
        nilai_buku
      `,
    )
    .order("kategori_aset", { ascending: true });

  if (error) {
    throw new Error(`Gagal mengambil data aset: ${error.message}`);
  }

  return (data ?? []) as AsetReportRow[];
}

function summarizeAssetData(rows: AsetReportRow[]): AsetReportSummary {
  return rows.reduce(
    (summary, row): AsetReportSummary => ({
      jumlahAset: summary.jumlahAset + 1,
      nilaiPerolehan: summary.nilaiPerolehan + toNumber(row.nilai_perolehan),
      akumulasiDepresiasi:
        summary.akumulasiDepresiasi + toNumber(row.akumulasi_depresiasi),
      depresiasiBulanan:
        summary.depresiasiBulanan + toNumber(row.depresiasi_bulanan),
      nilaiBuku: summary.nilaiBuku + toNumber(row.nilai_buku),
    }),
    {
      jumlahAset: 0,
      nilaiPerolehan: 0,
      akumulasiDepresiasi: 0,
      depresiasiBulanan: 0,
      nilaiBuku: 0,
    },
  );
}

function createAssetSummarySheet(
  workbook: ExcelJS.Workbook,
  rows: AsetReportRow[],
  summary: AsetReportSummary,
  periode: string,
  printDate: string,
): void {
  const sheet = workbook.addWorksheet("Data Aset");

  createTitle(
    sheet,
    COMPANY_NAME,
    REPORT_SECTION,
    "DATA ASET & DEPRESIASI",
    periode,
    printDate,
  );

  sheet.columns = [
    { width: 24 },
    { width: 24 },
    { width: 24 },
    { width: 24 },
    { width: 24 },
  ];

  sheet.getRow(10).values = [
    "Kategori Aset",
    "Nilai Perolehan",
    "Akumulasi Depresiasi",
    "Depresiasi Bulanan",
    "Nilai Buku",
  ];

  for (let col = 1; col <= 5; col++) {
    applyHeaderStyle(sheet.getCell(10, col));
  }

  let currentRow = 11;

  for (const row of rows) {
    sheet.getCell(currentRow, 1).value = row.kategori_aset ?? "-";
    sheet.getCell(currentRow, 2).value = toNumber(row.nilai_perolehan);
    sheet.getCell(currentRow, 3).value = toNumber(row.akumulasi_depresiasi);
    sheet.getCell(currentRow, 4).value = toNumber(row.depresiasi_bulanan);
    sheet.getCell(currentRow, 5).value = toNumber(row.nilai_buku);

    for (let col = 2; col <= 5; col++) {
      sheet.getCell(currentRow, col).numFmt = ACCOUNTING_FORMAT;
    }

    currentRow++;
  }

  sheet.getCell(currentRow, 1).value =
    `TOTAL ASET (${summary.jumlahAset} UNIT)`;
  sheet.getCell(currentRow, 2).value = summary.nilaiPerolehan;
  sheet.getCell(currentRow, 3).value = summary.akumulasiDepresiasi;
  sheet.getCell(currentRow, 4).value = summary.depresiasiBulanan;
  sheet.getCell(currentRow, 5).value = summary.nilaiBuku;

  for (let col = 1; col <= 5; col++) {
    applyTotalStyle(sheet.getCell(currentRow, col));
  }

  for (let col = 2; col <= 5; col++) {
    sheet.getCell(currentRow, col).numFmt = ACCOUNTING_FORMAT;
  }

  currentRow += 2;

  sheet.getCell(currentRow, 1).value = "CATATAN REKONSILIASI";
  applySectionStyle(sheet.getCell(currentRow, 1));

  currentRow++;

  sheet.mergeCells(`A${currentRow}:E${currentRow}`);
  sheet.getCell(currentRow, 1).value =
    "Data depresiasi aset di atas adalah data master aset. Nilai Beban Penyusutan yang masuk ke Laba Rugi tetap hanya berasal dari jurnal posted pada periode laporan.";
  sheet.getCell(currentRow, 1).alignment = {
    wrapText: true,
    vertical: "top",
  };

  currentRow += 2;

  sheet.mergeCells(`A${currentRow}:E${currentRow}`);
  sheet.getCell(currentRow, 1).value =
    "Depresiasi bulanan aset tidak otomatis dijumlahkan ke Laba Rugi. Hal ini menjaga laporan tetap sama dengan jurnal posted dan mencegah double counting.";
  sheet.getCell(currentRow, 1).alignment = {
    wrapText: true,
    vertical: "top",
  };

  addSignature(sheet, currentRow + 3);
}

function writeMainAssetSection(
  sheet: ExcelJS.Worksheet,
  currentRow: number,
  rows: AsetReportRow[],
  summary: AsetReportSummary,
): number {
  sheet.mergeCells(`A${currentRow}:E${currentRow}`);

  sheet.getCell(`A${currentRow}`).value =
    "DATA ASET DAN DEPRESIASI (SUMBER: PUBLIC.ASET)";

  applySectionStyle(sheet.getCell(`A${currentRow}`));

  currentRow++;

  sheet.mergeCells(`A${currentRow}:E${currentRow}`);

  sheet.getCell(`A${currentRow}`).value =
    "Data aset diambil langsung dari kolom yang tersedia pada public.aset. Nilai Laba Rugi tetap berasal dari jurnal posted.";

  sheet.getCell(`A${currentRow}`).alignment = {
    wrapText: true,
    vertical: "top",
  };

  currentRow += 2;

  const headers = [
    "Kategori Aset",
    "Nilai Perolehan",
    "Akumulasi Depresiasi",
    "Depresiasi Bulanan",
    "Nilai Buku",
  ];

  for (let col = 1; col <= headers.length; col++) {
    sheet.getCell(currentRow, col).value = headers[col - 1];
    applyHeaderStyle(sheet.getCell(currentRow, col));
  }

  currentRow++;

  for (const asset of rows) {
    sheet.getCell(currentRow, 1).value = asset.kategori_aset ?? "-";
    sheet.getCell(currentRow, 2).value = toNumber(asset.nilai_perolehan);
    sheet.getCell(currentRow, 3).value = toNumber(asset.akumulasi_depresiasi);
    sheet.getCell(currentRow, 4).value = toNumber(asset.depresiasi_bulanan);
    sheet.getCell(currentRow, 5).value = toNumber(asset.nilai_buku);

    for (let col = 2; col <= 5; col++) {
      sheet.getCell(currentRow, col).numFmt = ACCOUNTING_FORMAT;
    }

    currentRow++;
  }

  sheet.getCell(currentRow, 1).value =
    `TOTAL ASET (${summary.jumlahAset} BARIS DATA)`;

  sheet.getCell(currentRow, 2).value = summary.nilaiPerolehan;
  sheet.getCell(currentRow, 3).value = summary.akumulasiDepresiasi;
  sheet.getCell(currentRow, 4).value = summary.depresiasiBulanan;
  sheet.getCell(currentRow, 5).value = summary.nilaiBuku;

  for (let col = 1; col <= 5; col++) {
    applyTotalStyle(sheet.getCell(currentRow, col));
  }

  for (let col = 2; col <= 5; col++) {
    sheet.getCell(currentRow, col).numFmt = ACCOUNTING_FORMAT;
  }

  currentRow += 2;

  sheet.getCell(currentRow, 1).value = "REKONSILIASI ASET";

  applySectionStyle(sheet.getCell(currentRow, 1));

  currentRow++;

  sheet.getCell(currentRow, 1).value = "Jumlah Data Aset";
  sheet.getCell(currentRow, 2).value = summary.jumlahAset;

  currentRow++;

  sheet.getCell(currentRow, 1).value = "Nilai Perolehan Aset";
  sheet.getCell(currentRow, 2).value = summary.nilaiPerolehan;
  sheet.getCell(currentRow, 2).numFmt = ACCOUNTING_FORMAT;

  currentRow++;

  sheet.getCell(currentRow, 1).value = "Akumulasi Depresiasi";
  sheet.getCell(currentRow, 2).value = summary.akumulasiDepresiasi;
  sheet.getCell(currentRow, 2).numFmt = ACCOUNTING_FORMAT;

  currentRow++;

  sheet.getCell(currentRow, 1).value = "Depresiasi Bulanan Master Aset";
  sheet.getCell(currentRow, 2).value = summary.depresiasiBulanan;
  sheet.getCell(currentRow, 2).numFmt = ACCOUNTING_FORMAT;

  currentRow++;

  sheet.getCell(currentRow, 1).value = "Nilai Buku Aset";
  sheet.getCell(currentRow, 2).value = summary.nilaiBuku;
  sheet.getCell(currentRow, 2).numFmt = ACCOUNTING_FORMAT;

  currentRow += 2;

  sheet.mergeCells(`A${currentRow}:E${currentRow}`);

  sheet.getCell(currentRow, 1).value =
    "CATATAN: Data aset ditampilkan pada laporan Laba Rugi sebagai data aset dan rekonsiliasi. Depresiasi bulanan master tidak ditambahkan kembali ke total beban Laba Rugi karena beban yang memengaruhi laba harus mengikuti jurnal posted.";

  sheet.getCell(currentRow, 1).alignment = {
    wrapText: true,
    vertical: "top",
  };

  return currentRow + 2;
}

async function createCoaDetailSheet(
  workbook: ExcelJS.Workbook,
  row: ReportLine,
  ledgerRows: LabaRugiDetailRow[],
  periode: string,
  printDate: string,
): Promise<void> {
  const detailSheetName = formatSheetName(row.kode, row.nama, row.id_coa);

  const detailSheet = workbook.addWorksheet(detailSheetName);

  const accountDetails = ledgerRows
    .filter((item): boolean => Number(item.id_coa) === row.id_coa)
    .sort((a, b): number => {
      const dateA = new Date(a.tanggal).getTime();

      const dateB = new Date(b.tanggal).getTime();

      if (dateA !== dateB) {
        return dateA - dateB;
      }

      return String(a.no_bukti).localeCompare(String(b.no_bukti));
    });

  createTitle(
    detailSheet,
    COMPANY_NAME,
    REPORT_SECTION,
    "LABA RUGI",
    periode,
    printDate,
  );

  detailSheet.columns = [
    {
      width: 15,
    },
    {
      width: 25,
    },
    {
      width: 45,
    },
    {
      width: 18,
    },
    {
      width: 18,
    },
    {
      width: 18,
    },
  ];

  setInternalHyperlink(
    detailSheet.getCell("A10"),
    "Kembali ke Laba Rugi",
    "Laba Rugi",
  );

  detailSheet.getRow(11).values = [
    "Tanggal",
    "Voucher",
    "Keterangan",
    "Debit",
    "Kredit",
    "Saldo",
  ];

  for (let col = 1; col <= 6; col++) {
    applyHeaderStyle(detailSheet.getCell(11, col));
  }

  let detailRow = 12;
  let saldo = 0;

  const isPendapatan = normalizeText(row.tipe) === "PENDAPATAN";

  for (const item of accountDetails) {
    const debit = toNumber(item.debit);

    const kredit = toNumber(item.kredit);

    if (isPendapatan) {
      saldo += kredit - debit;
    } else {
      saldo += debit - kredit;
    }

    detailSheet.getCell(`A${detailRow}`).value = formatDateIndonesia(
      item.tanggal,
    );

    detailSheet.getCell(`B${detailRow}`).value = item.no_bukti;

    detailSheet.getCell(`C${detailRow}`).value = item.keterangan;

    detailSheet.getCell(`D${detailRow}`).value = debit !== 0 ? debit : "";

    detailSheet.getCell(`E${detailRow}`).value = kredit !== 0 ? kredit : "";

    detailSheet.getCell(`F${detailRow}`).value = saldo;

    for (let col = 4; col <= 6; col++) {
      detailSheet.getCell(detailRow, col).numFmt = ACCOUNTING_FORMAT;
    }

    detailRow++;
  }

  detailSheet.mergeCells(`A${detailRow}:E${detailRow}`);

  detailSheet.getCell(`A${detailRow}`).value = "Saldo Akhir";

  detailSheet.getCell(`F${detailRow}`).value = saldo;

  detailSheet.getCell(`F${detailRow}`).numFmt = ACCOUNTING_FORMAT;

  applyTotalStyle(detailSheet.getCell(`A${detailRow}`));

  applyTotalStyle(detailSheet.getCell(`F${detailRow}`));

  addSignature(detailSheet, detailRow + 4);
}

/* =========================================================
   DETAIL PENDAPATAN PROYEK
========================================================= */

async function createPendapatanProyekSheet(
  workbook: ExcelJS.Workbook,
  rows: PendapatanProyekRow[],
  periode: string,
  printDate: string,
  totalPendapatan: number,
): Promise<void> {
  const sheet = workbook.addWorksheet("Pendapatan Proyek");

  createTitle(
    sheet,
    COMPANY_NAME,
    REPORT_SECTION,
    "LABA RUGI",
    periode,
    printDate,
  );

  sheet.columns = [
    {
      width: 15,
    },
    {
      width: 15,
    },
    {
      width: 30,
    },
    {
      width: 35,
    },
    {
      width: 25,
    },
    {
      width: 18,
    },
    {
      width: 18,
    },
    {
      width: 20,
    },
  ];

  setInternalHyperlink(
    sheet.getCell("A10"),
    "Kembali ke Laba Rugi",
    "Laba Rugi",
  );

  let currentRow = 11;

  sheet.mergeCells(`A${currentRow}:H${currentRow}`);
  sheet.getCell(`A${currentRow}`).value =
    "Pendapatan Bersih diambil langsung dari public.pendapatan_proyek.nilai_bersih. Nilai jurnal posted tidak diubah.";
  sheet.getCell(`A${currentRow}`).alignment = {
    wrapText: true,
    vertical: "top",
  };

  currentRow += 2;

  sheet.getRow(currentRow).values = [
    "Tanggal",
    "Kode Proyek",
    "Nama Proyek",
    "Customer",
    "Voucher",
    "Debit",
    "Kredit",
    "Pendapatan Bersih",
  ];

  for (let col = 1; col <= 8; col++) {
    applyHeaderStyle(sheet.getCell(currentRow, col));
  }

  currentRow++;

  for (const row of rows) {
    sheet.getCell(`A${currentRow}`).value = formatDateIndonesia(row.tanggal);

    sheet.getCell(`B${currentRow}`).value = row.kode_proyek ?? "-";

    sheet.getCell(`C${currentRow}`).value = row.nama_proyek ?? "-";

    sheet.getCell(`D${currentRow}`).value = row.customer ?? "-";

    sheet.getCell(`E${currentRow}`).value = row.no_bukti;

    sheet.getCell(`F${currentRow}`).value = row.debit !== 0 ? row.debit : "";

    sheet.getCell(`G${currentRow}`).value = row.kredit !== 0 ? row.kredit : "";

    sheet.getCell(`H${currentRow}`).value = row.pendapatan_bersih;

    for (let col = 6; col <= 8; col++) {
      sheet.getCell(currentRow, col).numFmt = ACCOUNTING_FORMAT;
    }

    currentRow++;
  }

  sheet.mergeCells(`A${currentRow}:G${currentRow}`);

  sheet.getCell(`A${currentRow}`).value = "TOTAL PENDAPATAN BERSIH";

  sheet.getCell(`H${currentRow}`).value = totalPendapatan;

  sheet.getCell(`H${currentRow}`).numFmt = ACCOUNTING_FORMAT;

  applyTotalStyle(sheet.getCell(`A${currentRow}`));

  applyTotalStyle(sheet.getCell(`H${currentRow}`));

  currentRow += 2;

  sheet.getCell(`A${currentRow}`).value = "TOTAL PENDAPATAN BRUTO";
  sheet.getCell(`H${currentRow}`).value = rows.reduce(
    (total, row): number => total + row.pendapatan,
    0,
  );
  sheet.getCell(`H${currentRow}`).numFmt = ACCOUNTING_FORMAT;

  currentRow++;

  sheet.getCell(`A${currentRow}`).value = "TOTAL PAJAK PENDAPATAN";
  sheet.getCell(`H${currentRow}`).value = rows.reduce(
    (total, row): number => total + row.nilai_pajak,
    0,
  );
  sheet.getCell(`H${currentRow}`).numFmt = ACCOUNTING_FORMAT;

  addSignature(sheet, currentRow + 4);
}

/* =========================================================
   WRITE REPORT SECTION
========================================================= */

async function writeReportSection(
  sheet: ExcelJS.Worksheet,
  workbook: ExcelJS.Workbook,
  currentRow: number,
  title: string,
  rows: ReportLine[],
  ledgerRows: LabaRugiDetailRow[],
  periode: string,
  printDate: string,
): Promise<number> {
  sheet.mergeCells(`A${currentRow}:C${currentRow}`);

  sheet.getCell(`A${currentRow}`).value = title;

  applySectionStyle(sheet.getCell(`A${currentRow}`));

  currentRow++;

  for (const row of rows) {
    const detailSheetName = formatSheetName(row.kode, row.nama, row.id_coa);

    setInternalHyperlink(
      sheet.getCell(`B${currentRow}`),
      row.nama,
      detailSheetName,
    );

    sheet.getCell(`C${currentRow}`).value = row.saldo;

    sheet.getCell(`C${currentRow}`).numFmt = ACCOUNTING_FORMAT;

    await createCoaDetailSheet(workbook, row, ledgerRows, periode, printDate);

    currentRow++;
  }

  return currentRow;
}

/* =========================================================
   GET
========================================================= */

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);

    // Ambil periode OPEN yang belum ditutup sebagai periode default laporan.
    const { data: openPeriodData, error: openPeriodError } = await db
      .from("periode")
      .select(
        `
        id_periode,
        nama_periode,
        status,
        tanggal_mulai,
        tanggal_selesai,
        is_closed
        `,
      )
      .eq("status", "OPEN")
      .eq("is_closed", false)
      .order("tanggal_mulai", { ascending: false })
      .limit(1);

    if (openPeriodError) {
      return NextResponse.json(
        { error: `Gagal mengambil periode OPEN: ${openPeriodError.message}` },
        { status: 500 },
      );
    }

    const openPeriods = (openPeriodData ?? []) as PeriodeReportRow[];
    const openPeriod = openPeriods[0];

    if (!openPeriod) {
      return NextResponse.json(
        {
          error:
            "Periode OPEN tidak ditemukan. Laporan Laba Rugi tidak dapat menentukan rentang tanggal.",
        },
        { status: 409 },
      );
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(openPeriod.tanggal_mulai) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(openPeriod.tanggal_selesai)
    ) {
      return NextResponse.json(
        {
          error: `Tanggal pada periode OPEN ${openPeriod.nama_periode} tidak valid.`,
        },
        { status: 422 },
      );
    }

    const { tanggalMulai, tanggalSelesai } = getReportDateRange(
      url.searchParams,
      openPeriod,
    );

    if (tanggalMulai > tanggalSelesai) {
      return NextResponse.json(
        {
          error: "Tanggal mulai tidak boleh lebih besar dari tanggal selesai.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       1. AMBIL DETAIL LABA RUGI DARI VIEW DATABASE
       =====================================================

       View preview SQL:
       public.v_laba_rugi_api_sql_source_preview_20261012

       View dasar public.v_laba_rugi_report_detail dan view preview memastikan:
       - jurnal.is_posted = true
       - coa.aktif = true
       - coa.is_header = false
       - tipe COA = PENDAPATAN / BEBAN
       - nilai_laba_rugi dihitung database
       - kelompok_laba_rugi ditentukan database

       API tidak lagi melakukan klasifikasi berdasarkan nama COA.
       ===================================================== */

    const { data: viewData, error: viewError } = await db
      .from("v_laba_rugi_api_sql_source_preview_20261012")
      .select(
        `
        id_jurnal,
        tanggal,
        no_bukti,
        sumber,
        modul,
        ref_id,
        id_detail,
        id_coa,
        kode_coa,
        nama_coa,
        tipe_coa,
        kategori_laporan,
        sub_kategori,
        kelompok_utama,
        kelompok_detail,
        debit,
        kredit,
        nilai_laba_rugi,
        kelompok_laba_rugi
        `,
      )
      .gte("tanggal", tanggalMulai)
      .lt("tanggal", getNextDate(tanggalSelesai))
      .not("no_bukti", "like", "CLS-%")
      .not("no_bukti", "like", "CLOSE-%")
      .not("no_bukti", "like", "OPEN-%")
      .not("no_bukti", "like", "REV-%")
      .order("tanggal", { ascending: true })
      .order("id_jurnal", { ascending: true })
      .order("id_detail", { ascending: true });

    if (viewError) {
      return NextResponse.json(
        {
          error: `Gagal mengambil data view Laba Rugi: ${viewError.message}`,
        },
        {
          status: 500,
        },
      );
    }

    const rawViewRows = (viewData ?? []) as LabaRugiViewRow[];

    if (rawViewRows.length === 0) {
      return NextResponse.json(
        {
          error: "Tidak ada jurnal posted pada tanggal laporan.",
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================================
       2. AMBIL METADATA JURNAL

       Dipakai untuk:
       - keterangan
       - id_periode
       - validasi referensi periode
       - detail Excel

       Nilai accounting tetap berasal dari view.
       ===================================================== */

    const journalIds = Array.from(
      new Set(
        rawViewRows
          .map((row): number => Number(row.id_jurnal))
          .filter((id): boolean => Number.isInteger(id) && id > 0),
      ),
    );

    if (journalIds.length === 0) {
      return NextResponse.json(
        {
          error: "Data view Laba Rugi tidak memiliki id_jurnal yang valid.",
        },
        {
          status: 422,
        },
      );
    }

    const { data: jurnalData, error: jurnalError } = await db
      .from("jurnal")
      .select(
        `
        id_jurnal,
        tanggal,
        no_bukti,
        keterangan,
        sumber,
        modul,
        ref_id,
        id_periode
        `,
      )
      .in("id_jurnal", journalIds);

    if (jurnalError) {
      return NextResponse.json(
        {
          error: `Gagal mengambil metadata jurnal: ${jurnalError.message}`,
        },
        {
          status: 500,
        },
      );
    }

    const jurnalRows = (jurnalData ?? []) as JurnalReportRow[];

    if (jurnalRows.length === 0) {
      return NextResponse.json(
        {
          error: "Metadata jurnal tidak ditemukan untuk data Laba Rugi.",
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================================
       3. VALIDASI REFERENSI PERIODE

       Status OPEN/CLOSED tidak menghapus jurnal historis.
       Periode hanya digunakan untuk memastikan id_periode
       yang direferensikan jurnal memang valid.
       ===================================================== */

    const periodeIds = Array.from(
      new Set(
        jurnalRows
          .map((row): number => Number(row.id_periode))
          .filter((id): boolean => Number.isInteger(id) && id > 0),
      ),
    );

    if (periodeIds.length === 0) {
      return NextResponse.json(
        {
          error:
            "Jurnal posted pada tanggal laporan tidak memiliki periode yang valid.",
        },
        {
          status: 422,
        },
      );
    }

    const { data: periodeData, error: periodeError } = await db
      .from("periode")
      .select(
        `
        id_periode,
        status
        `,
      )
      .in("id_periode", periodeIds);

    if (periodeError) {
      return NextResponse.json(
        {
          error: `Gagal mengambil status periode: ${periodeError.message}`,
        },
        {
          status: 500,
        },
      );
    }

    const periodeRows = (periodeData ?? []) as PeriodeReportRow[];

    const validPeriodeIds = new Set<number>(
      periodeRows
        .map((row): number => Number(row.id_periode))
        .filter((id): boolean => Number.isInteger(id) && id > 0),
    );

    const validJournalIds = new Set<number>(
      jurnalRows
        .filter(
          (row): boolean =>
            validPeriodeIds.has(Number(row.id_periode)) &&
            Number(row.id_periode) === Number(openPeriod.id_periode),
        )
        .map((row): number => Number(row.id_jurnal)),
    );

    if (validJournalIds.size === 0) {
      return NextResponse.json(
        {
          error:
            "Tidak ada jurnal posted dengan referensi periode yang valid untuk tanggal laporan.",
        },
        {
          status: 404,
        },
      );
    }

    const reportViewRows = rawViewRows.filter((row): boolean =>
      validJournalIds.has(Number(row.id_jurnal)),
    );

    if (reportViewRows.length === 0) {
      return NextResponse.json(
        {
          error:
            "Tidak ada detail Laba Rugi dari jurnal posted dengan periode yang valid.",
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================================
       4. MAP METADATA JURNAL
       ===================================================== */

    const journalMap = new Map<number, JurnalReportRow>();

    for (const journal of jurnalRows) {
      if (validJournalIds.has(Number(journal.id_jurnal))) {
        journalMap.set(Number(journal.id_jurnal), journal);
      }
    }

    /* =====================================================
       5. SUMBER PENDAPATAN MENGIKUTI BUKU BESAR PER AKUN

       Buku Besar Per Akun mengambil pendapatan dari:
       public.v_buku_besar_pendapatan_usaha_per_akun

       Laba Rugi menggunakan view yang sama, bukan menebak nama
       keterangan jurnal atau membaca ulang saldo dari tabel berbeda.
       Baris dibatasi tanggal dan periode laporan, lalu diagregasi
       per id_coa dengan saldo normal pendapatan = kredit - debit.

       Baris pendapatan operasional dari view Laba Rugi utama diganti
       oleh hasil Buku Besar Per Akun agar tidak dihitung dua kali.
       View sumber adalah view khusus jurnal POSTED. Tidak ada
       INSERT, UPDATE, DELETE, atau perubahan jurnal.
       ===================================================== */

    const REVENUE_LEDGER_PAGE_SIZE = 1000;
    let revenueLedgerOffset = 0;
    const revenueLedgerRows: RevenueLedgerViewRow[] = [];

    while (true) {
      const { data: revenueLedgerData, error: revenueLedgerError } = await db
        .from("v_buku_besar_pendapatan_usaha_per_akun")
        .select("*")
        .gte("tanggal", tanggalMulai)
        .lt("tanggal", getNextDate(tanggalSelesai))
        .order("tanggal", { ascending: true })
        .order("id_jurnal", { ascending: true })
        .order("id_detail", { ascending: true })
        .range(
          revenueLedgerOffset,
          revenueLedgerOffset + REVENUE_LEDGER_PAGE_SIZE - 1,
        );

      if (revenueLedgerError) {
        return NextResponse.json(
          {
            error: `Gagal mengambil Buku Besar Pendapatan Usaha Per Akun: ${revenueLedgerError.message}`,
          },
          { status: 500 },
        );
      }

      const pageRows = (revenueLedgerData ?? []) as RevenueLedgerViewRow[];

      for (const row of pageRows) {
        const rowPeriodId =
          row.id_periode === null || row.id_periode === undefined
            ? null
            : Number(row.id_periode);

        const postedByBoolean =
          typeof row.is_posted === "boolean" ? row.is_posted : null;
        const postedByStatus =
          typeof row.status === "string" && row.status.trim().length > 0
            ? row.status.trim().toUpperCase() === "POSTED"
            : null;

        if (postedByBoolean === false || postedByStatus === false) {
          continue;
        }

        if (
          rowPeriodId !== null &&
          Number.isFinite(rowPeriodId) &&
          rowPeriodId !== Number(openPeriod.id_periode)
        ) {
          continue;
        }

        const idJurnal = Number(row.id_jurnal);
        const idDetail = Number(row.id_detail);
        const idCoa = Number(row.id_coa);

        if (
          !Number.isInteger(idJurnal) ||
          idJurnal <= 0 ||
          !Number.isInteger(idDetail) ||
          idDetail <= 0 ||
          !Number.isInteger(idCoa) ||
          idCoa <= 0 ||
          !row.kode_coa ||
          !row.nama_coa
        ) {
          console.warn(
            "LABA RUGI: baris Buku Besar Pendapatan Per Akun dilewati karena identitas tidak lengkap.",
            {
              id_jurnal: row.id_jurnal,
              id_detail: row.id_detail,
              id_coa: row.id_coa,
            },
          );
          continue;
        }

        revenueLedgerRows.push(row);
      }

      if (pageRows.length < REVENUE_LEDGER_PAGE_SIZE) {
        break;
      }

      revenueLedgerOffset += REVENUE_LEDGER_PAGE_SIZE;
    }

    const revenueCoaIds = new Set<number>();
    const revenueRowsFromLedger: LabaRugiViewRow[] = [];

    for (const row of revenueLedgerRows) {
      const idJurnal = Number(row.id_jurnal);
      const idDetail = Number(row.id_detail);
      const idCoa = Number(row.id_coa);

      // View Buku Besar Pendapatan Usaha adalah sumber akun pendapatan.
      // Saldo berjalan tidak dipakai; yang dihitung hanya mutasi periode.
      const debit = toNumber(row.debit);
      const kredit = toNumber(row.kredit);
      const nilaiPendapatan = kredit - debit;

      revenueCoaIds.add(idCoa);

      revenueRowsFromLedger.push({
        id_jurnal: idJurnal,
        tanggal: row.tanggal,
        no_bukti: row.no_bukti ?? "",
        sumber: row.sumber,
        modul: null,
        ref_id: null,
        id_detail: idDetail,
        id_coa: idCoa,
        kode_coa: row.kode_coa ?? "",
        nama_coa: row.nama_coa ?? "",
        tipe_coa: row.tipe_coa ?? "PENDAPATAN",
        kategori_laporan: "PENDAPATAN",
        sub_kategori: "OPERASIONAL",
        kelompok_utama: "PENDAPATAN_OPERASIONAL",
        kelompok_detail: "PENDAPATAN_PROYEK",
        debit: row.debit,
        kredit: row.kredit,
        nilai_laba_rugi: nilaiPendapatan,
        kelompok_laba_rugi: "PENDAPATAN_OPERASIONAL",
      });

      if (!journalMap.has(idJurnal)) {
        journalMap.set(idJurnal, {
          id_jurnal: idJurnal,
          tanggal: row.tanggal,
          no_bukti: row.no_bukti ?? "",
          keterangan: row.keterangan ?? "",
          sumber: row.sumber,
          modul: null,
          ref_id: null,
          id_periode:
            row.id_periode === null || row.id_periode === undefined
              ? Number(openPeriod.id_periode)
              : Number(row.id_periode),
        });
      }
    }

    // Pertahankan seluruh kelompok lain dari view Laba Rugi.
    // Pendapatan operasional diganti seluruhnya dengan view Buku Besar
    // Per Akun agar satu detail tidak dihitung dari dua sumber.
    // Hapus berdasarkan id_coa, bukan kelompok_utama. Sebagian COA
    // pendapatan pada view Laba Rugi lama masih berlabel LAINNYA;
    // jika dipertahankan, aggregateCoaRows akan memakai klasifikasi lama
    // saat menemukan id_coa yang sama dan total Pendapatan Operasional
    // tetap menjadi 0 meskipun nominal dari Buku Besar sudah terbaca.
    const nonOperationalRevenueRows = reportViewRows.filter(
      (row): boolean => !revenueCoaIds.has(Number(row.id_coa)),
    );

    const effectiveReportViewRows: LabaRugiViewRow[] = [
      ...nonOperationalRevenueRows,
      ...revenueRowsFromLedger,
    ];

    const openingRevenueRows = revenueLedgerRows.filter(
      (row): boolean =>
        normalizeText(row.keterangan).includes("SALDO AWAL") &&
        /^40\.100\./.test(String(row.kode_coa ?? "").trim()),
    );

    const openingRevenueTotal = openingRevenueRows.reduce(
      (total, row): number =>
        total + toNumber(row.kredit) - toNumber(row.debit),
      0,
    );

    console.info(
      "LABA RUGI: pendapatan direkonsiliasi dari Buku Besar Pendapatan Usaha Per Akun.",
      {
        sumber: "v_buku_besar_pendapatan_usaha_per_akun",
        jumlahBarisPendapatanPerAkun: revenueRowsFromLedger.length,
        jumlahAkunPendapatan: new Set(
          revenueRowsFromLedger.map((row) => row.id_coa),
        ).size,
        jumlahBarisSaldoAwalPendapatan: openingRevenueRows.length,
        totalSaldoAwalPendapatan: openingRevenueTotal,
        totalMutasiPendapatanPeriode: revenueRowsFromLedger.reduce(
          (total, row): number => total + toNumber(row.nilai_laba_rugi),
          0,
        ),
      },
    );

    /* =====================================================
       6. BENTUK DETAIL LAPORAN

       Struktur detail tetap dipertahankan supaya:
       - detail COA Excel tetap berjalan
       - Pendapatan Proyek tetap berjalan
       - hyperlink detail tetap berjalan

       Namun sumber COA/classification berasal dari view.
       ===================================================== */

    const detailRows: LabaRugiDetailRow[] = [];

    for (const row of effectiveReportViewRows) {
      const journal = journalMap.get(Number(row.id_jurnal));

      if (!journal) {
        continue;
      }

      detailRows.push({
        id_jurnal: Number(row.id_jurnal),
        tanggal: row.tanggal,
        no_bukti: row.no_bukti,
        keterangan: journal.keterangan,
        sumber: row.sumber,
        modul: row.modul,
        ref_id: row.ref_id,
        id_detail: Number(row.id_detail),
        id_coa: Number(row.id_coa),
        debit: row.debit,
        kredit: row.kredit,
        kode_coa: row.kode_coa,
        nama_coa: row.nama_coa,
        tipe_coa: row.tipe_coa,
        normal_balance: null,
        kategori_laporan: row.kategori_laporan,
        sub_kategori: row.sub_kategori,
        kelompok_utama: row.kelompok_utama,
        kelompok_detail: row.kelompok_detail,
        level_coa: null,
        parent_id: null,
      });
    }

    if (detailRows.length === 0) {
      return NextResponse.json(
        {
          error: "Tidak ada detail jurnal yang valid dari view Laba Rugi.",
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================================
       6. AGREGASI COA PERIODE

       Penting:
       aggregate memakai reportViewRows, bukan detailRows,
       karena nilai_laba_rugi dan kelompok_laba_rugi berasal
       langsung dari database.
       ===================================================== */

    const coaRows = aggregateCoaRows(effectiveReportViewRows);

    const unclassifiedRows = coaRows.filter(
      (row): boolean => normalizeText(row.kelompok_laba_rugi) === "LAINNYA",
    );

    if (unclassifiedRows.length > 0) {
      console.warn(
        "LABA RUGI: terdapat COA yang belum memiliki kelompok_laba_rugi laporan.",
        unclassifiedRows.map((row) => ({
          id_coa: row.id_coa,
          kode_coa: row.kode_coa,
          nama_coa: row.nama_coa,
          nilai_laba_rugi: row.nilai_laba_rugi,
        })),
      );
    }

    if (coaRows.length === 0) {
      return NextResponse.json(
        {
          error:
            "Tidak ada COA laba rugi yang memiliki transaksi pada periode laporan.",
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================================
       7. RELASI PROJECT
       ===================================================== */

    const { projectLinks, projects } = await getProjectRelations(detailRows);

    /* =====================================================
       8. PENDAPATAN PROYEK
       ===================================================== */

    const pendapatanSourceMap = await getPendapatanProyekSource(
      detailRows,
      projectLinks,
    );

    const pendapatanProyekRows = buildPendapatanProyekRows(
      detailRows,
      projectLinks,
      projects,
      pendapatanSourceMap,
    );

    const totalPendapatanBersih = pendapatanProyekRows.reduce(
      (total, row): number => total + row.pendapatan_bersih,
      0,
    );

    const totalPendapatanBrutoProyek = pendapatanProyekRows.reduce(
      (total, row): number => total + row.pendapatan,
      0,
    );

    const totalPajakPendapatanProyek = pendapatanProyekRows.reduce(
      (total, row): number => total + row.nilai_pajak,
      0,
    );

    /* =====================================================
       9. DATA ASET
       ===================================================== */

    const assetRows = await getAssetData();
    const assetSummary = summarizeAssetData(assetRows);

    // Data aset bersifat pendukung. Laporan Laba Rugi tetap dapat
    // ditampilkan dan diekspor meskipun master aset belum memiliki baris.
    // Beban penyusutan tetap hanya berasal dari jurnal posted pada view.

    /* =====================================================
       10. SECTION

       Seluruh klasifikasi berasal dari
       kelompok_laba_rugi di database.
       ===================================================== */

    const sections = buildReportSections(coaRows);

    const administrativeCoaIds = new Set(
      coaRows
        .filter(
          (row): boolean =>
            normalizeText(row.kelompok_laba_rugi) === "BEBAN_ADMINISTRATIF",
        )
        .map((row): number => row.id_coa),
    );

    const reportAdministrativeCoaIds = new Set(
      sections.bebanAdministratif.rows.map((row): number => row.id_coa),
    );

    const missingAdministrativeCoaIds = Array.from(administrativeCoaIds).filter(
      (idCoa): boolean => !reportAdministrativeCoaIds.has(idCoa),
    );

    if (missingAdministrativeCoaIds.length > 0) {
      console.error(
        "LABA RUGI: COA BEBAN_ADMINISTRATIF dari database tidak masuk ke section laporan.",
        missingAdministrativeCoaIds,
      );

      return NextResponse.json(
        {
          error:
            "Terdapat COA Beban Administratif yang diklasifikasikan database tetapi tidak masuk ke laporan Laba Rugi.",
          id_coa: missingAdministrativeCoaIds,
        },
        { status: 500 },
      );
    }

    /*
     * DASAR LABA RUGI UTAMA:
     * Pendapatan operasional berasal dari jurnal POSTED pada view.
     * Untuk jurnal "Saldo Awal Pendapatan Usaha" pada akun 40.100.xx.xx,
     * nilai pendapatan di laporan menggunakan kredit - debit agar saldo
     * awal 16 akun tetap masuk ke Pendapatan Januari.
     *
     * public.pendapatan_proyek.nilai_bersih tetap ditampilkan pada sheet
     * pendukung "Pendapatan Proyek" saja. Nilai tersebut tidak menggantikan
     * pendapatan bruto jurnal dan tidak ditambahkan lagi ke total pendapatan.
     *
     * Tidak ada jurnal atau nominal database yang diubah oleh API ini.
     */
    const pendapatanProyekJurnal = sections.pendapatanProyek.total;

    if (
      Math.abs(pendapatanProyekJurnal - totalPendapatanBrutoProyek) > 0.000001
    ) {
      console.warn(
        "LABA RUGI: total pendapatan operasional pada view berbeda dengan rincian bruto modul proyek.",
        {
          pendapatanProyekJurnal,
          pendapatanProyekBrutoModul: totalPendapatanBrutoProyek,
          pendapatanBersihModul: totalPendapatanBersih,
        },
      );
    }

    const totalPendapatanFinal = pendapatanProyekJurnal;

    console.info(
      "LABA RUGI: pendapatan utama bersumber dari Buku Besar Pendapatan Usaha Per Akun; pendapatan bersih proyek hanya untuk rincian pendukung.",
      {
        pendapatanOperasionalJurnal: totalPendapatanFinal,
        penghasilanLainJurnal: sections.penghasilanLain.total,
        pendapatanBrutoModul: totalPendapatanBrutoProyek,
        pajakPendapatanModul: totalPajakPendapatanProyek,
        pendapatanBersihModul: totalPendapatanBersih,
      },
    );

    /* =====================================================
       10. FORMULA LABA RUGI

       Semua angka section berasal dari klasifikasi database.
       Beban Administratif tidak dipindahkan ke Beban Lain atau
       dihilangkan hanya karena nilainya negatif/net credit.


       PPh sudah menjadi kelompok database tersendiri:
       BEBAN_PAJAK_PENGHASILAN.

       Karena itu PPh:
       - TIDAK masuk laba sebelum pajak
       - DIKURANGKAN setelah laba sebelum pajak

       Tidak boleh lagi melakukan:
       bebanLain - pajakPenghasilan
       karena itu akan berisiko double counting.
       ===================================================== */

    const labaKotor = totalPendapatanFinal - sections.biayaPenjualan.total;

    const labaSebelumPajak =
      labaKotor +
      sections.penghasilanLain.total -
      sections.bebanAdministratif.total -
      sections.bebanLain.total;

    const labaBersih = labaSebelumPajak - sections.pajakPenghasilan.total;

    const totals: ReportTotals = {
      pendapatanOperasionalJurnal: totalPendapatanFinal,

      biayaPenjualan: sections.biayaPenjualan.total,

      labaKotor,

      penghasilanLain: sections.penghasilanLain.total,

      bebanAdministratif: sections.bebanAdministratif.total,

      bebanLain: sections.bebanLain.total,

      bebanPajakPenghasilan: sections.pajakPenghasilan.total,

      labaSebelumPajak,

      labaBersih,
    };

    /* =====================================================
       11. VIEW JSON
       GET /api/report/laba-rugi?mode=view
       Nilai dan klasifikasi tetap berasal dari view database.
       Tidak ada perubahan jurnal atau data database.
       ===================================================== */

    const mode = normalizeText(url.searchParams.get("mode"));

    if (mode === "VIEW" || mode === "PREVIEW") {
      return NextResponse.json(
        {
          success: true,
          report: "LABA_RUGI",
          company: COMPANY_NAME,
          section: REPORT_SECTION,
          periode: {
            id_periode: openPeriod.id_periode,
            nama_periode: openPeriod.nama_periode,
            status: openPeriod.status,
            tanggal_mulai: tanggalMulai,
            tanggal_selesai: tanggalSelesai,
          },
          generated_at: new Date().toISOString(),
          currency: "IDR",
          totals,
          sections: {
            pendapatan: sections.pendapatanProyek,
            penghasilan_lain: sections.penghasilanLain,
            biaya_penjualan: sections.biayaPenjualan,
            beban_administratif: sections.bebanAdministratif,
            beban_lain: sections.bebanLain,
            beban_pajak_penghasilan: sections.pajakPenghasilan,
          },
          pendapatan_proyek: {
            rows: pendapatanProyekRows,
            total_bruto: totalPendapatanBrutoProyek,
            total_pajak: totalPajakPendapatanProyek,
            total_bersih: totalPendapatanBersih,
          },
          aset: {
            rows: assetRows,
            summary: assetSummary,
            catatan:
              "Data aset bersifat pendukung. Beban penyusutan pada Laba Rugi hanya berasal dari jurnal posted.",
          },
          metadata: {
            jumlah_jurnal: new Set(detailRows.map((row) => row.id_jurnal)).size,
            jumlah_detail_jurnal: detailRows.length,
            jumlah_coa: coaRows.length,
            jumlah_baris_saldo_awal_pendapatan: effectiveReportViewRows.filter(
              (row): boolean => {
                const journal = journalMap.get(Number(row.id_jurnal));
                return (
                  journal !== undefined &&
                  normalizeText(journal.keterangan).includes("SALDO AWAL") &&
                  normalizeText(row.tipe_coa) === "PENDAPATAN" &&
                  /^40\\.100\\./.test(String(row.kode_coa ?? "").trim())
                );
              },
            ).length,
            total_saldo_awal_pendapatan: openingRevenueTotal,
            sumber_nilai:
              "v_buku_besar_pendapatan_usaha_per_akun + view Laba Rugi untuk kelompok lainnya",
            status_jurnal: "POSTED",
          },
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    /* =====================================================
       12. EXCEL WORKBOOK / EXPORT
       GET /api/report/laba-rugi (default) atau ?mode=export
       ===================================================== */

    const workbook = new ExcelJS.Workbook();

    const sheet = workbook.addWorksheet("Laba Rugi");

    const printDate = formatPrintDate();

    const periode = `${formatDateIndonesia(tanggalMulai)} s/d ${formatDateIndonesia(tanggalSelesai)}`;

    createTitle(
      sheet,
      COMPANY_NAME,
      REPORT_SECTION,
      "LABA RUGI",
      periode,
      printDate,
    );

    createAssetSummarySheet(
      workbook,
      assetRows,
      assetSummary,
      periode,
      printDate,
    );

    sheet.columns = [
      { width: 5 },
      { width: 50 },
      { width: 25 },
      { width: 18 },
      { width: 20 },
      { width: 22 },
      { width: 20 },
      { width: 20 },
      { width: 18 },
      { width: 16 },
    ];

    let currentRow = 11;

    /* =====================================================
       PENDAPATAN
       ===================================================== */

    sheet.mergeCells(`A${currentRow}:C${currentRow}`);

    sheet.getCell(`A${currentRow}`).value = "Pendapatan";

    applySectionStyle(sheet.getCell(`A${currentRow}`));

    currentRow++;

    sheet.getCell(`B${currentRow}`).value = "Pendapatan Proyek (Jurnal Posted)";

    sheet.getCell(`C${currentRow}`).value = totals.pendapatanOperasionalJurnal;

    sheet.getCell(`C${currentRow}`).numFmt = ACCOUNTING_FORMAT;

    currentRow++;

    await createPendapatanProyekSheet(
      workbook,
      pendapatanProyekRows,
      periode,
      printDate,
      totalPendapatanBersih,
    );

    sheet.getCell(`B${currentRow}`).value =
      "Total Pendapatan Proyek (Jurnal Posted)";

    sheet.getCell(`C${currentRow}`).value = totals.pendapatanOperasionalJurnal;

    sheet.getCell(`C${currentRow}`).numFmt = ACCOUNTING_FORMAT;

    applyTotalStyle(sheet.getCell(`B${currentRow}`));

    applyTotalStyle(sheet.getCell(`C${currentRow}`));

    currentRow += 2;

    /* =====================================================
       BIAYA PENJUALAN
       ===================================================== */

    currentRow = await writeReportSection(
      sheet,
      workbook,
      currentRow,
      "Biaya Penjualan",
      sections.biayaPenjualan.rows,
      detailRows,
      periode,
      printDate,
    );

    sheet.getCell(`B${currentRow}`).value = "Jumlah Biaya Penjualan";

    sheet.getCell(`C${currentRow}`).value = totals.biayaPenjualan;

    sheet.getCell(`C${currentRow}`).numFmt = ACCOUNTING_FORMAT;

    applyTotalStyle(sheet.getCell(`B${currentRow}`));

    applyTotalStyle(sheet.getCell(`C${currentRow}`));

    currentRow += 2;

    /* =====================================================
       LABA KOTOR
       ===================================================== */

    sheet.getCell(`B${currentRow}`).value = "LABA KOTOR";

    sheet.getCell(`C${currentRow}`).value = totals.labaKotor;

    sheet.getCell(`C${currentRow}`).numFmt = ACCOUNTING_FORMAT;

    applyTotalStyle(sheet.getCell(`B${currentRow}`));

    applyTotalStyle(sheet.getCell(`C${currentRow}`));

    currentRow += 2;

    /* =====================================================
       PENGHASILAN LAIN
       ===================================================== */

    currentRow = await writeReportSection(
      sheet,
      workbook,
      currentRow,
      "Penghasilan Lain",
      sections.penghasilanLain.rows,
      detailRows,
      periode,
      printDate,
    );

    sheet.getCell(`B${currentRow}`).value = "Jumlah Penghasilan Lain";

    sheet.getCell(`C${currentRow}`).value = totals.penghasilanLain;

    sheet.getCell(`C${currentRow}`).numFmt = ACCOUNTING_FORMAT;

    applyTotalStyle(sheet.getCell(`B${currentRow}`));

    applyTotalStyle(sheet.getCell(`C${currentRow}`));

    currentRow += 2;

    /* =====================================================
       BEBAN ADMINISTRATIF
       ===================================================== */

    currentRow = await writeReportSection(
      sheet,
      workbook,
      currentRow,
      "Beban Administratif",
      sections.bebanAdministratif.rows,
      detailRows,
      periode,
      printDate,
    );

    sheet.getCell(`B${currentRow}`).value = "Jumlah Beban Administratif";

    sheet.getCell(`C${currentRow}`).value = totals.bebanAdministratif;

    sheet.getCell(`C${currentRow}`).numFmt = ACCOUNTING_FORMAT;

    applyTotalStyle(sheet.getCell(`B${currentRow}`));

    applyTotalStyle(sheet.getCell(`C${currentRow}`));

    currentRow += 2;

    /* =====================================================
       BEBAN LAIN
       ===================================================== */

    if (sections.bebanLain.rows.length > 0) {
      currentRow = await writeReportSection(
        sheet,
        workbook,
        currentRow,
        "Beban Lain",
        sections.bebanLain.rows,
        detailRows,
        periode,
        printDate,
      );

      sheet.getCell(`B${currentRow}`).value = "Jumlah Beban Lain";

      sheet.getCell(`C${currentRow}`).value = totals.bebanLain;

      sheet.getCell(`C${currentRow}`).numFmt = ACCOUNTING_FORMAT;

      applyTotalStyle(sheet.getCell(`B${currentRow}`));

      applyTotalStyle(sheet.getCell(`C${currentRow}`));

      currentRow += 2;
    }

    /* =====================================================
       BEBAN PAJAK PENGHASILAN
       ===================================================== */

    currentRow = await writeReportSection(
      sheet,
      workbook,
      currentRow,
      "Beban Pajak Penghasilan",
      sections.pajakPenghasilan.rows,
      detailRows,
      periode,
      printDate,
    );

    sheet.getCell(`B${currentRow}`).value = "Jumlah Beban Pajak Penghasilan";

    sheet.getCell(`C${currentRow}`).value = totals.bebanPajakPenghasilan;

    sheet.getCell(`C${currentRow}`).numFmt = ACCOUNTING_FORMAT;

    applyTotalStyle(sheet.getCell(`B${currentRow}`));

    applyTotalStyle(sheet.getCell(`C${currentRow}`));

    currentRow += 2;

    /* =====================================================
       LABA SEBELUM PAJAK
       ===================================================== */

    sheet.getCell(`B${currentRow}`).value = "LABA/(RUGI) SEBELUM PAJAK";

    sheet.getCell(`C${currentRow}`).value = totals.labaSebelumPajak;

    sheet.getCell(`C${currentRow}`).numFmt = ACCOUNTING_FORMAT;

    applyTotalStyle(sheet.getCell(`B${currentRow}`));

    applyTotalStyle(sheet.getCell(`C${currentRow}`));

    currentRow += 2;

    /* =====================================================
       LABA BERSIH
       ===================================================== */

    sheet.getCell(`B${currentRow}`).value = "LABA/(RUGI) BERSIH";

    sheet.getCell(`C${currentRow}`).value = totals.labaBersih;

    sheet.getCell(`C${currentRow}`).numFmt = ACCOUNTING_FORMAT;

    applyTotalStyle(sheet.getCell(`B${currentRow}`));

    applyTotalStyle(sheet.getCell(`C${currentRow}`));

    currentRow += 3;

    /* =====================================================
       DATA ASET MASUK KE SHEET UTAMA LABA RUGI
       ===================================================== */

    currentRow = writeMainAssetSection(
      sheet,
      currentRow,
      assetRows,
      assetSummary,
    );

    /* =====================================================
       QR CODE LAPORAN
       ===================================================== */

    const qrValue = generateQRCodeValue({
      id: detailRows.length,
      sumber_modul: "LABA_RUGI",
      nilai_transaksi: totals.labaBersih,
      tanggal_transaksi: new Date().toISOString(),
    });

    const qrImage = await QRCode.toDataURL(String(qrValue));

    const imageId = workbook.addImage({
      base64: qrImage,
      extension: "png",
    });

    sheet.addImage(imageId, {
      tl: {
        col: 4,
        row: currentRow + 2,
      },
      ext: {
        width: 100,
        height: 100,
      },
    });

    /* =====================================================
       SIGNATURE
       ===================================================== */

    addSignature(sheet, currentRow);

    /* =====================================================
       FREEZE / PRINT
       ===================================================== */

    sheet.views = [
      {
        state: "frozen",
        ySplit: 10,
      },
    ];

    sheet.pageSetup.orientation = "portrait";

    sheet.pageSetup.fitToPage = true;

    sheet.pageSetup.fitToWidth = 1;

    sheet.pageSetup.fitToHeight = 0;

    /* =====================================================
       WRITE BUFFER
       ===================================================== */

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition": 'attachment; filename="laba-rugi.xlsx"',
      },
    });
  } catch (error: unknown) {
    console.error("LABA RUGI API ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal membuat laporan laba rugi.",
      },
      {
        status: 500,
      },
    );
  }
}
