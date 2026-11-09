import { NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import { invoiceSchema } from "@/lib/validators/invoice";

import { postInvoice } from "@/lib/accounting/postInvoice";

/* =========================================================
   TYPES
========================================================= */

type InvoiceStatus =
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";

interface InvoiceProjectVendorRow {
  id: string;
  kode_proyek: string;
  nama_proyek: string;
  nilai_kontrak: number | string;
  id_vendor: number | null;
  vendor: InvoiceVendorRow | null;
}

interface InvoiceVendorRow {
  id: number;
  kode_vendor: string;
  nama_vendor: string;
  status: boolean;
}

interface InvoiceRow {
  id: number;
  tanggal: string;
  no_invoice: string;
  customer: string;
  nominal: number;
  status: InvoiceStatus;
  created_at: string;
  tanggal_jatuh_tempo: string | null;
  is_reminded: boolean;
  id_proyek: string | null;
  nilai_kontrak: number | null;
  persentase_termin: number | null;
  nilai_tagihan_termin: number | null;
  potongan_uang_muka: number;
  retensi_persen: number | null;
  potongan_retensi: number;
  subtotal_tagihan: number | null;
  ppn_persen: number | null;
  ppn_nilai: number | null;
  total_neto: number | null;
}

/* =========================================================
   HELPERS
========================================================= */

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/* =========================================================
   GET: LIST INVOICE
========================================================= */

export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db
      .from("invoice")
      .select(
        `
        id,
        tanggal,
        no_invoice,
        customer,
        nominal,
        status,
        created_at,
        tanggal_jatuh_tempo,
        is_reminded,
        id_proyek,
        nilai_kontrak,
        persentase_termin,
        nilai_tagihan_termin,
        potongan_uang_muka,
        retensi_persen,
        potongan_retensi,
        subtotal_tagihan,
        ppn_persen,
        ppn_nilai,
        total_neto
        `,
      )
      .order("tanggal", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      console.error("GET INVOICE ERROR:", error);

      return NextResponse.json(
        {
          error: "Gagal mengambil data invoice.",
        },
        {
          status: 500,
        },
      );
    }

    const result: InvoiceRow[] = (data ?? []).map(
      (row): InvoiceRow => ({
        id: Number(row.id),
        tanggal: String(row.tanggal),
        no_invoice: String(row.no_invoice),
        customer: String(row.customer ?? ""),
        nominal: Number(row.nominal ?? 0),
        status: row.status as InvoiceStatus,
        created_at: String(row.created_at ?? ""),
        tanggal_jatuh_tempo:
          row.tanggal_jatuh_tempo === null ||
          row.tanggal_jatuh_tempo === undefined
            ? null
            : String(row.tanggal_jatuh_tempo),
        is_reminded: Boolean(row.is_reminded ?? false),
        id_proyek:
          row.id_proyek === null || row.id_proyek === undefined
            ? null
            : String(row.id_proyek),
        nilai_kontrak:
          row.nilai_kontrak === null || row.nilai_kontrak === undefined
            ? null
            : Number(row.nilai_kontrak),
        persentase_termin:
          row.persentase_termin === null || row.persentase_termin === undefined
            ? null
            : Number(row.persentase_termin),
        nilai_tagihan_termin:
          row.nilai_tagihan_termin === null ||
          row.nilai_tagihan_termin === undefined
            ? null
            : Number(row.nilai_tagihan_termin),
        potongan_uang_muka: Number(row.potongan_uang_muka ?? 0),
        retensi_persen:
          row.retensi_persen === null || row.retensi_persen === undefined
            ? null
            : Number(row.retensi_persen),
        potongan_retensi: Number(row.potongan_retensi ?? 0),
        subtotal_tagihan:
          row.subtotal_tagihan === null || row.subtotal_tagihan === undefined
            ? null
            : Number(row.subtotal_tagihan),
        ppn_persen:
          row.ppn_persen === null || row.ppn_persen === undefined
            ? null
            : Number(row.ppn_persen),
        ppn_nilai:
          row.ppn_nilai === null || row.ppn_nilai === undefined
            ? null
            : Number(row.ppn_nilai),
        total_neto:
          row.total_neto === null || row.total_neto === undefined
            ? null
            : Number(row.total_neto),
      }),
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("GET INVOICE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil data invoice.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   POST: CREATE INVOICE PROYEK
========================================================= */

export async function POST(req: Request): Promise<NextResponse> {
  try {
    /**
     * =======================================================
     * PARSE REQUEST
     * =======================================================
     */

    const body: unknown = await req.json();

    const parsed = invoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Data invoice tidak valid.",
          details: parsed.error.format(),
        },
        {
          status: 400,
        },
      );
    }

    const input = parsed.data;

    /**
     * =======================================================
     * VALIDASI INPUT INVOICE PROYEK
     * =======================================================
     *
     * Customer TIDAK diambil dari input.
     *
     * Nilai kontrak TIDAK diambil dari input.
     *
     * Nominal invoice TIDAK diambil dari input.
     *
     * Semuanya dihitung/diambil dari database.
     */

    const tanggal: string = input.tanggal.trim();

    const noInvoice: string = input.no_invoice.trim();

    const idProyek: string = input.id_proyek.trim();

    const persentaseTermin: number = Number(input.persentase_termin);

    const potonganUangMuka: number = Number(input.potongan_uang_muka ?? 0);

    const retensiPersen: number = Number(input.retensi_persen ?? 0);

    const ppnPersen: number = Number(input.ppn_persen ?? 0);

    const status: InvoiceStatus = input.status;

    const tanggalJatuhTempo: string | null =
      input.tanggal_jatuh_tempo?.trim() || null;

    /**
     * =======================================================
     * VALIDASI ANGKA
     * =======================================================
     */

    if (!tanggal) {
      return NextResponse.json(
        {
          error: "Tanggal invoice wajib diisi.",
        },
        {
          status: 400,
        },
      );
    }

    if (!noInvoice) {
      return NextResponse.json(
        {
          error: "Nomor invoice wajib diisi.",
        },
        {
          status: 400,
        },
      );
    }

    if (!idProyek) {
      return NextResponse.json(
        {
          error: "Proyek invoice wajib dipilih.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isFinite(persentaseTermin) ||
      persentaseTermin <= 0 ||
      persentaseTermin > 100
    ) {
      return NextResponse.json(
        {
          error:
            "Persentase termin harus lebih besar dari 0 dan maksimal 100%.",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isFinite(potonganUangMuka) || potonganUangMuka < 0) {
      return NextResponse.json(
        {
          error: "Potongan uang muka tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isFinite(retensiPersen) ||
      retensiPersen < 0 ||
      retensiPersen > 100
    ) {
      return NextResponse.json(
        {
          error: "Persentase retensi harus berada antara 0% sampai 100%.",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isFinite(ppnPersen) || ppnPersen < 0 || ppnPersen > 100) {
      return NextResponse.json(
        {
          error: "Persentase PPN harus berada antara 0% sampai 100%.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * =======================================================
     * GUARD NO INVOICE UNIK
     * =======================================================
     */

    const { data: existing, error: existingError } = await db
      .from("invoice")
      .select("id")
      .eq("no_invoice", noInvoice)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        {
          error: `Gagal memeriksa nomor invoice: ` + existingError.message,
        },
        {
          status: 500,
        },
      );
    }

    if (existing) {
      return NextResponse.json(
        {
          error: "No invoice sudah dipakai.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * =======================================================
     * AMBIL PROYEK + VENDOR
     * =======================================================
     *
     * Customer berasal dari:
     *
     * proyek_master.id_vendor
     *       ↓
     * vendors.id
     *       ↓
     * vendors.nama_vendor
     *
     * Tidak menggunakan customer dari frontend.
     */

    const { data: project, error: projectError } = await db
      .from("proyek_master")
      .select(
        `
        id,
        kode_proyek,
        nama_proyek,
        nilai_kontrak,
        id_vendor,
        vendor:vendors!proyek_master_id_vendor_fkey(
          id,
          kode_vendor,
          nama_vendor,
          status
        )
        `,
      )
      .eq("id", idProyek)
      .maybeSingle<InvoiceProjectVendorRow>();

    if (projectError) {
      return NextResponse.json(
        {
          error: `Gagal mengambil data proyek: ${projectError.message}`,
        },
        {
          status: 500,
        },
      );
    }

    if (!project) {
      return NextResponse.json(
        {
          error: "Proyek tidak ditemukan.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * =======================================================
     * VALIDASI VENDOR CUSTOMER
     * =======================================================
     */

    if (!project.id_vendor) {
      return NextResponse.json(
        {
          error: `Proyek ${project.kode_proyek} belum memiliki Customer/Vendor.`,
        },
        {
          status: 400,
        },
      );
    }

    if (!project.vendor) {
      return NextResponse.json(
        {
          error: `Customer/Vendor proyek ${project.kode_proyek} tidak ditemukan.`,
        },
        {
          status: 400,
        },
      );
    }

    if (!project.vendor.status) {
      return NextResponse.json(
        {
          error: `Customer/Vendor ${project.vendor.nama_vendor} sudah tidak aktif.`,
        },
        {
          status: 400,
        },
      );
    }

    const customer: string = project.vendor.nama_vendor.trim();

    if (!customer) {
      return NextResponse.json(
        {
          error: `Nama Customer/Vendor proyek ${project.kode_proyek} tidak valid.`,
        },
        {
          status: 400,
        },
      );
    }

    /**
     * =======================================================
     * NILAI KONTRAK
     * =======================================================
     */

    const nilaiKontrak: number = Number(project.nilai_kontrak);

    if (!Number.isFinite(nilaiKontrak) || nilaiKontrak <= 0) {
      return NextResponse.json(
        {
          error: `Nilai kontrak proyek ${project.kode_proyek} tidak valid.`,
        },
        {
          status: 400,
        },
      );
    }

    /**
     * =======================================================
     * HITUNG NILAI TAGIHAN TERMIN
     * =======================================================
     *
     * nilai_tagihan_termin =
     *
     *   nilai_kontrak
     *   × persentase_termin
     *   / 100
     */

    const nilaiTagihanTermin: number = roundMoney(
      (nilaiKontrak * persentaseTermin) / 100,
    );

    if (!Number.isFinite(nilaiTagihanTermin) || nilaiTagihanTermin <= 0) {
      return NextResponse.json(
        {
          error: "Nilai tagihan termin tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * =======================================================
     * HITUNG POTONGAN RETENSI
     * =======================================================
     *
     * Retensi dihitung dari nilai tagihan termin.
     */

    const potonganRetensi: number = roundMoney(
      (nilaiTagihanTermin * retensiPersen) / 100,
    );

    /**
     * =======================================================
     * HITUNG SUBTOTAL
     * =======================================================
     *
     * subtotal =
     *
     *   nilai_tagihan_termin
     *   - potongan_uang_muka
     *   - potongan_retensi
     */

    const subtotalTagihan: number = roundMoney(
      nilaiTagihanTermin - potonganUangMuka - potonganRetensi,
    );

    if (subtotalTagihan <= 0) {
      return NextResponse.json(
        {
          error:
            "Subtotal tagihan harus lebih besar dari 0. " +
            "Periksa termin, potongan uang muka, dan retensi.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * =======================================================
     * VALIDASI POTONGAN
     * =======================================================
     */

    if (potonganUangMuka > nilaiTagihanTermin) {
      return NextResponse.json(
        {
          error:
            "Potongan uang muka tidak boleh melebihi nilai tagihan termin.",
        },
        {
          status: 400,
        },
      );
    }

    if (potonganRetensi > nilaiTagihanTermin) {
      return NextResponse.json(
        {
          error: "Potongan retensi tidak boleh melebihi nilai tagihan termin.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * =======================================================
     * HITUNG PPN
     * =======================================================
     *
     * ppn_nilai =
     *
     *   subtotal_tagihan
     *   × ppn_persen
     *   / 100
     */

    const ppnNilai: number = roundMoney((subtotalTagihan * ppnPersen) / 100);

    /**
     * =======================================================
     * HITUNG TOTAL NETO
     * =======================================================
     *
     * total_neto =
     *
     *   subtotal_tagihan
     *   + ppn_nilai
     */

    const totalNeto: number = roundMoney(subtotalTagihan + ppnNilai);

    if (!Number.isFinite(totalNeto) || totalNeto <= 0) {
      return NextResponse.json(
        {
          error: "Total netto invoice tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * =======================================================
     * INSERT INVOICE
     * =======================================================
     *
     * customer:
     *   berasal dari vendors.nama_vendor
     *
     * nilai_kontrak:
     *   berasal dari proyek_master.nilai_kontrak
     *
     * nominal:
     *   tetap diisi total_neto untuk kompatibilitas
     *   dengan modul pembayaran invoice yang lama.
     */

    const { data, error } = await db
      .from("invoice")
      .insert({
        tanggal,
        no_invoice: noInvoice,

        customer,

        nominal: totalNeto,

        status,

        tanggal_jatuh_tempo: tanggalJatuhTempo,

        id_proyek: project.id,

        nilai_kontrak: nilaiKontrak,

        persentase_termin: persentaseTermin,

        nilai_tagihan_termin: nilaiTagihanTermin,

        potongan_uang_muka: potonganUangMuka,

        retensi_persen: retensiPersen,

        potongan_retensi: potonganRetensi,

        subtotal_tagihan: subtotalTagihan,

        ppn_persen: ppnPersen,

        ppn_nilai: ppnNilai,

        total_neto: totalNeto,
      })
      .select(
        `
        id,
        tanggal,
        no_invoice,
        customer,
        nominal,
        status,
        created_at,
        tanggal_jatuh_tempo,
        is_reminded,
        id_proyek,
        nilai_kontrak,
        persentase_termin,
        nilai_tagihan_termin,
        potongan_uang_muka,
        retensi_persen,
        potongan_retensi,
        subtotal_tagihan,
        ppn_persen,
        ppn_nilai,
        total_neto
        `,
      )
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          error: error?.message ?? "Gagal insert invoice.",
        },
        {
          status: 500,
        },
      );
    }

    /**
     * =======================================================
     * AUTO POSTING JURNAL
     * =======================================================
     *
     * COA TIDAK DIAMBIL DARI FRONTEND.
     *
     * postInvoice akan mengambil:
     *
     *   INVOICE / PIUTANG
     *   INVOICE / PENDAPATAN
     *
     * melalui coa_mapping.
     *
     * id_proyek dan id_vendor juga diteruskan ke jurnal.
     */

    let jurnalId: number;

    try {
      jurnalId = await postInvoice(
        tanggal,
        noInvoice,
        `Invoice ${noInvoice} - ${project.kode_proyek} - ${project.nama_proyek} - ${customer}`,
        totalNeto,
        project.id,
      );
    } catch (journalError: unknown) {
      /**
       * =====================================================
       * ROLLBACK MANUAL
       * =====================================================
       *
       * postJournal bukan transaksi database atomic dengan
       * INSERT invoice di atas.
       *
       * Jika jurnal gagal, invoice yang baru dibuat dihapus
       * agar tidak meninggalkan invoice tanpa jurnal.
       */

      await db.from("invoice").delete().eq("id", data.id);

      throw journalError;
    }

    /**
     * =======================================================
     * RETURN
     * =======================================================
     */

    return NextResponse.json(
      {
        id: Number(data.id),
        tanggal: String(data.tanggal),
        no_invoice: String(data.no_invoice),
        customer: String(data.customer),
        nominal: Number(data.nominal ?? 0),
        status: data.status as InvoiceStatus,
        created_at: String(data.created_at ?? ""),
        tanggal_jatuh_tempo:
          data.tanggal_jatuh_tempo === null ||
          data.tanggal_jatuh_tempo === undefined
            ? null
            : String(data.tanggal_jatuh_tempo),
        is_reminded: Boolean(data.is_reminded ?? false),
        id_proyek:
          data.id_proyek === null || data.id_proyek === undefined
            ? null
            : String(data.id_proyek),
        nilai_kontrak:
          data.nilai_kontrak === null || data.nilai_kontrak === undefined
            ? null
            : Number(data.nilai_kontrak),
        persentase_termin:
          data.persentase_termin === null ||
          data.persentase_termin === undefined
            ? null
            : Number(data.persentase_termin),
        nilai_tagihan_termin:
          data.nilai_tagihan_termin === null ||
          data.nilai_tagihan_termin === undefined
            ? null
            : Number(data.nilai_tagihan_termin),
        potongan_uang_muka: Number(data.potongan_uang_muka ?? 0),
        retensi_persen:
          data.retensi_persen === null || data.retensi_persen === undefined
            ? null
            : Number(data.retensi_persen),
        potongan_retensi: Number(data.potongan_retensi ?? 0),
        subtotal_tagihan:
          data.subtotal_tagihan === null || data.subtotal_tagihan === undefined
            ? null
            : Number(data.subtotal_tagihan),
        ppn_persen:
          data.ppn_persen === null || data.ppn_persen === undefined
            ? null
            : Number(data.ppn_persen),
        ppn_nilai:
          data.ppn_nilai === null || data.ppn_nilai === undefined
            ? null
            : Number(data.ppn_nilai),
        total_neto:
          data.total_neto === null || data.total_neto === undefined
            ? null
            : Number(data.total_neto),
        id_jurnal: jurnalId,
      },
      {
        status: 201,
      },
    );
  } catch (error: unknown) {
    console.error("POST INVOICE ERROR:", error);

    const message: string =
      error instanceof Error ? error.message : "Gagal membuat invoice.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}
