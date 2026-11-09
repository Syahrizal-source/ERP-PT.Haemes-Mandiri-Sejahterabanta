import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { JurnalSchema } from "@/schemas/jurnal.schema";
import { validateBalance } from "@/lib/utils/jurnal";
import { getPeriodeAktif } from "@/lib/periode";

/* =========================
   TYPES
========================= */
type Suggestion = {
  message: string;
  coa_id: number;
};

interface JurnalDetailRow {
  id_detail: number;
  id_coa: number;
  debit: number;
  kredit: number;
}

interface JurnalRow {
  id_jurnal: number;
  tanggal: string;
  no_bukti: string;
  sumber: string;
  keterangan: string;
  id_periode: number;
  created_at: string;
  is_posted: boolean;
  jurnal_detail: JurnalDetailRow[];
}

type PeriodeRow = {
  id_periode: number;
  status: "OPEN" | "CLOSED";
  is_closed: boolean;
};

/* =========================
   GET JURNAL
========================= */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const periodeParam = searchParams.get("periode");

    const semuaPeriodeParam = searchParams.get("semua_periode");

    const semuaPeriode = semuaPeriodeParam === "true";

    let query = db
      .from("jurnal")
      .select(
        `
        id_jurnal,
        tanggal,
        no_bukti,
        sumber,
        keterangan,
        id_periode,
        created_at,
        is_posted,
        jurnal_detail (
          id_detail,
          id_coa,
          debit,
          kredit
        )
        `,
      )
      .order("tanggal", {
        ascending: false,
      });

    /*
     * ==================================================
     * SEMUA PERIODE
     * Digunakan oleh Form Jurnal Koreksi.
     *
     * Termasuk:
     * - Periode OPEN
     * - Periode CLOSED
     *
     * Tetapi hanya jurnal yang benar-benar POSTED
     * yang akan ditampilkan oleh form.
     * ==================================================
     */
    if (semuaPeriode) {
      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const result: JurnalRow[] = data ?? [];

      return NextResponse.json(result);
    }

    /*
     * ==================================================
     * FILTER PERIODE MANUAL
     * ==================================================
     */
    if (periodeParam) {
      const periodeNumber = Number(periodeParam);

      if (!Number.isInteger(periodeNumber) || periodeNumber <= 0) {
        return NextResponse.json(
          {
            message: "Parameter periode tidak valid",
          },
          {
            status: 400,
          },
        );
      }

      query = query.eq("id_periode", periodeNumber);
    } else {
      /*
       * ==================================================
       * DEFAULT
       * Tetap menggunakan periode aktif.
       *
       * Jangan diubah karena endpoint /api/jurnal
       * digunakan oleh modul lain.
       * ==================================================
       */
      const periode: PeriodeRow = await getPeriodeAktif();

      query = query.eq("id_periode", periode.id_periode);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const result: JurnalRow[] = data ?? [];

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("GET JURNAL ERROR:", error);

    return NextResponse.json(
      {
        message: "Gagal ambil jurnal",
      },
      {
        status: 500,
      },
    );
  }
}

function validateCoaBySumber(
  sumber: string,
  coaList: { id_coa: number; tipe: string }[],
  details: { id_coa: number }[],
): void {
  const coaMap = new Map<number, string>();

  for (const c of coaList) {
    coaMap.set(c.id_coa, c.tipe);
  }

  for (const d of details) {
    const tipe = coaMap.get(d.id_coa);

    if (!tipe) {
      throw new Error(`COA tidak ditemukan: ${d.id_coa}`);
    }

    /* =========================
       RULE VALIDATION
    ========================= */

    // ❌ PENYESUAIAN tidak boleh BEBAN / PENDAPATAN
    if (
      sumber === "PENYESUAIAN" &&
      (tipe === "BEBAN" || tipe === "PENDAPATAN")
    ) {
      throw new Error(
        "Jurnal PENYESUAIAN tidak boleh menggunakan akun BEBAN / PENDAPATAN",
      );
    }

    // ❌ OPENING BALANCE tidak boleh BEBAN
    if (sumber === "PENYESUAIAN" && tipe === "BEBAN") {
      throw new Error("Opening Balance tidak boleh dimasukkan sebagai BEBAN");
    }

    // ❌ PENDAPATAN tidak boleh pakai akun BEBAN
    if (sumber === "PENDAPATAN" && tipe === "BEBAN") {
      throw new Error(
        "Transaksi PENDAPATAN tidak boleh menggunakan akun BEBAN",
      );
    }

    // ❌ BEBAN tidak boleh pakai akun PENDAPATAN
    if (sumber === "KAS_KELUAR" && tipe === "PENDAPATAN") {
      throw new Error(
        "Transaksi BEBAN tidak boleh menggunakan akun PENDAPATAN",
      );
    }
  }
}

function validateJurnalComposition(
  sumber: string,
  coaList: { id_coa: number; tipe: string }[],
  details: { id_coa: number; debit: number; kredit: number }[],
): void {
  const coaMap = new Map<number, string>();

  for (const c of coaList) {
    coaMap.set(c.id_coa, c.tipe);
  }

  let totalPendapatan = 0;
  let totalBeban = 0;

  for (const d of details) {
    const tipe = coaMap.get(d.id_coa);
    if (!tipe) continue;

    const debit = Number(d.debit);
    const kredit = Number(d.kredit);

    if (tipe === "PENDAPATAN") {
      totalPendapatan += kredit - debit;
    }

    if (tipe === "BEBAN") {
      totalBeban += debit - kredit;
    }
  }

  /* =========================
     RULE KHUSUS
  ========================= */

  // ❌ UMUM tidak boleh langsung buat pendapatan besar
  /*
=====================================
CORPORATE GOVERNANCE
=====================================
*/

  if (sumber === "UMUM" && totalPendapatan >= 1000000000000) {
    throw new Error(
      "Jurnal UMUM bernilai besar untuk akun pendapatan wajib melalui modul bisnis",
    );
  }

  // ❌ kas masuk tidak boleh pendapatan ekstrem tanpa dasar
  if (sumber === "KAS_MASUK" && totalPendapatan > 0) {
    if (totalPendapatan > 500000000000) {
      throw new Error(
        "Pendapatan terlalu besar, periksa kembali transaksi (indikasi salah input)",
      );
    }
  }

  // ❌ beban lebih besar dari pendapatan ekstrem
  if (totalBeban > totalPendapatan * 5 && totalPendapatan > 0) {
    throw new Error(
      "Beban terlalu besar dibanding pendapatan, kemungkinan salah akun",
    );
  }
}

function generateCoaSuggestions(
  sumber: string,
  keterangan: string,
  coaList: { id_coa: number; tipe: string; nama: string }[],
  details: { id_coa: number; debit: number; kredit: number }[],
): { coa_id: number; message: string }[] {
  const suggestions: { coa_id: number; message: string }[] = [];

  const coaMap = new Map<number, { tipe: string; nama: string }>();

  for (const c of coaList) {
    coaMap.set(c.id_coa, { tipe: c.tipe, nama: c.nama });
  }

  const ket = keterangan.toLowerCase();

  for (const d of details) {
    const coa = coaMap.get(d.id_coa);
    if (!coa) continue;

    const debit = Number(d.debit);
    const kredit = Number(d.kredit);

    /* =========================
       RULE UMUM
    ========================= */

    if (coa.tipe === "PENDAPATAN" && debit > 0) {
      suggestions.push({
        coa_id: d.id_coa,
        message: `Akun ${coa.nama} seharusnya di KREDIT`,
      });
    }

    if (coa.tipe === "BEBAN" && kredit > 0) {
      suggestions.push({
        coa_id: d.id_coa,
        message: `Akun ${coa.nama} seharusnya di DEBIT`,
      });
    }

    /* =========================
       RULE DEPRESIASI (KEY FIX)
    ========================= */

    if (ket.includes("depresiasi")) {
      // ❌ pakai beban operasional
      if (
        coa.tipe === "BEBAN" &&
        !coa.nama.toLowerCase().includes("depresiasi")
      ) {
        suggestions.push({
          coa_id: d.id_coa,
          message:
            "Depresiasi harus menggunakan akun Beban Depresiasi, bukan biaya operasional",
        });
      }

      // ❌ mengurangi piutang
      if (coa.tipe === "ASET" && coa.nama.toLowerCase().includes("piutang")) {
        suggestions.push({
          coa_id: d.id_coa,
          message:
            "Depresiasi tidak boleh mengurangi piutang, gunakan Akumulasi Depresiasi",
        });
      }

      // ❌ tidak ada akun akumulasi depresiasi
      const hasAkumulasi = details.some((x) => {
        const c = coaMap.get(x.id_coa);
        return c?.nama.toLowerCase().includes("akumulasi");
      });

      if (!hasAkumulasi) {
        suggestions.push({
          coa_id: d.id_coa,
          message:
            "Jurnal depresiasi seharusnya memiliki akun Akumulasi Depresiasi (kredit)",
        });
      }
    }

    /* =========================
       RULE ASET
    ========================= */

    if (sumber === "ASET" && coa.tipe === "PENDAPATAN") {
      suggestions.push({
        coa_id: d.id_coa,
        message: "Transaksi ASET tidak boleh menggunakan akun pendapatan",
      });
    }
  }

  return suggestions;
}

/* =========================
   POST JURNAL
========================= */

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();

    const parsed = JurnalSchema.parse(body);

    validateBalance(parsed.details);
    /* =========================
   AMBIL COA
========================= */
    const { data: coaList, error: coaError } = await db.from("coa").select(`
  id_coa,
  tipe,
  nama,
  aktif,
  is_header
`);

    if (coaError || !coaList) {
      throw new Error("Gagal mengambil data COA");
    }

    /* =========================
   VALIDASI COA TERPAKAI
========================= */

    const coaMap = new Map(coaList.map((c) => [c.id_coa, c]));

    for (const detail of parsed.details) {
      const coa = coaMap.get(detail.id_coa);

      if (!coa) {
        throw new Error(`COA tidak ditemukan: ${detail.id_coa}`);
      }

      if (coa.aktif === false) {
        throw new Error(`COA nonaktif tidak boleh digunakan: ${coa.nama}`);
      }

      if (coa.is_header === true) {
        throw new Error(`Header account tidak boleh transaksi: ${coa.nama}`);
      }
    }

    /* =========================
   GENERATE SUGGESTION
========================= */
    /* =========================
   GENERATE SUGGESTION
========================= */
    const suggestions: Suggestion[] = generateCoaSuggestions(
      parsed.sumber,
      parsed.keterangan ?? "",
      coaList,
      parsed.details.map((d) => ({
        id_coa: d.id_coa,
        debit: d.debit,
        kredit: d.kredit,
      })),
    );

    /* =========================
   VALIDASI COA BY SUMBER
========================= */
    validateCoaBySumber(
      parsed.sumber,
      coaList,
      parsed.details.map((d) => ({
        id_coa: d.id_coa,
      })),
    );

    validateJurnalComposition(
      parsed.sumber,
      coaList,
      parsed.details.map((d) => ({
        id_coa: d.id_coa,
        debit: d.debit,
        kredit: d.kredit,
      })),
    );
    console.log(parsed.keterangan);
    /* =========================
       HITUNG TOTAL
    ========================= */
    const total = parsed.details.reduce((sum, d) => sum + Number(d.debit), 0);

    /* =========================
       AMBIL PERIODE AKTIF
    ========================= */
    const periode: PeriodeRow = await getPeriodeAktif();

    /* =========================
       VALIDASI PERIODE
    ========================= */
    if (periode.is_closed === true || periode.status === "CLOSED") {
      return NextResponse.json(
        { message: "Periode sudah ditutup (tidak bisa input jurnal)" },
        { status: 403 },
      );
    }

    /* =========================
   VALIDASI NO BUKTI UNIK
========================= */

    const { data: existingJurnal } = await db
      .from("jurnal")
      .select("id_jurnal")
      .eq("no_bukti", parsed.no_bukti)
      .maybeSingle();

    if (existingJurnal) {
      throw new Error("No bukti sudah digunakan");
    }

    /* =========================
       INSERT JURNAL
    ========================= */
    const { data: jurnal, error: jurnalError } = await db
      .from("jurnal")
      .insert({
        tanggal: parsed.tanggal,
        no_bukti: parsed.no_bukti,
        sumber: parsed.sumber,
        keterangan: parsed.keterangan,
        id_periode: periode.id_periode,
        is_posted: true,
      })
      .select("id_jurnal, no_bukti")
      .single();

    if (jurnalError || !jurnal) throw jurnalError;

    /* =========================
   REMOVE DUPLICATE DETAIL
========================= */

    const uniqueDetails = new Map<string, (typeof parsed.details)[0]>();

    for (const item of parsed.details) {
      const key = [item.id_coa, Number(item.debit), Number(item.kredit)].join(
        "|",
      );

      if (!uniqueDetails.has(key)) {
        uniqueDetails.set(key, item);
      }
    }

    const cleanDetails = Array.from(uniqueDetails.values());

    /* =========================
       INSERT DETAIL
    ========================= */
    const detailsPayload = cleanDetails.map((d) => ({
      id_jurnal: jurnal.id_jurnal,
      id_coa: d.id_coa,
      debit: d.debit,
      kredit: d.kredit,
    }));

    const { error: detailError } = await db
      .from("jurnal_detail")
      .insert(detailsPayload);

    if (detailError) throw detailError;

    /* =========================
       AUDIT LOG
    ========================= */
    await db.from("audit_log").insert({
      aksi: "INSERT",
      tabel: "jurnal",
      data: {
        id_jurnal: jurnal.id_jurnal,
        no_bukti: jurnal.no_bukti,
        total,
      },
    });

    return NextResponse.json({
      message: "Jurnal berhasil disimpan",
      id_jurnal: jurnal.id_jurnal,
      suggestions,
    });
  } catch (error: unknown) {
    console.error("POST JURNAL ERROR:", error);

    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Gagal simpan jurnal" },
      { status: 400 },
    );
  }
}
