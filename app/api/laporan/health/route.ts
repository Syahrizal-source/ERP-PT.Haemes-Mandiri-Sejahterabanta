import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";
import { getPeriodeAktif } from "@/lib/periode";

type CoaTipe = "ASET" | "LIABILITAS" | "EKUITAS" | "PENDAPATAN" | "BEBAN";

type Coa = {
  id_coa: number;
  tipe: CoaTipe;
  nama: string;
  is_cash: boolean;
};

type Detail = {
  id_coa: number;
  debit: number;
  kredit: number;
  id_jurnal: number;
};

type InsightLevel = "INFO" | "WARNING" | "DANGER" | "SUCCESS";

type Insight = {
  level: InsightLevel;
  message: string;
};

function toNumber(value: unknown): number {
  const result = Number(value ?? 0);

  return Number.isFinite(result) ? result : 0;
}

function parseCoaTipe(value: unknown): CoaTipe | null {
  const tipe = String(value ?? "")
    .trim()
    .toUpperCase();

  if (
    tipe === "ASET" ||
    tipe === "LIABILITAS" ||
    tipe === "EKUITAS" ||
    tipe === "PENDAPATAN" ||
    tipe === "BEBAN"
  ) {
    return tipe;
  }

  return null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);

    const param = searchParams.get("id_periode");

    /* =====================================================
       PERIODE
    ===================================================== */

    let id_periode: number;

    if (param) {
      const parsed = Number(param);

      if (!Number.isInteger(parsed) || parsed <= 0) {
        return NextResponse.json(
          {
            error: "id_periode tidak valid",
          },
          {
            status: 400,
          },
        );
      }

      id_periode = parsed;
    } else {
      const periode = await getPeriodeAktif();

      id_periode = periode.id_periode;
    }

    /* =====================================================
       JURNAL POSTED ONLY
    ===================================================== */

    const { data: jurnal, error: jurnalError } = await db
      .from("jurnal")
      .select("id_jurnal")
      .eq("id_periode", id_periode)
      .eq("is_posted", true);

    if (jurnalError) {
      console.error("Health jurnal error:", jurnalError);

      return NextResponse.json(
        {
          error: "Gagal mengambil jurnal",
        },
        {
          status: 500,
        },
      );
    }

    const jurnalIds: number[] = (jurnal ?? []).map(
      (row: { id_jurnal: number }) => Number(row.id_jurnal),
    );

    if (jurnalIds.length === 0) {
      return NextResponse.json({
        kas: 0,
        pendapatan: 0,
        beban: 0,
        laba: 0,
        hutang: 0,
        score: 0,
        kategori: "KRISIS",
        warna: "red",
        insights: [],
        rekomendasi: [],
        periode: id_periode,
        jumlah_jurnal: 0,
        jumlah_detail: 0,
        perhitungan: {
          pendapatan: 0,
          beban: 0,
          laba: 0,
          rumus: "pendapatan - beban",
        },
      });
    }

    /* =====================================================
       JURNAL DETAIL
    ===================================================== */

    const { data: detail, error: detailError } = await db
      .from("jurnal_detail")
      .select("id_coa, debit, kredit, id_jurnal")
      .in("id_jurnal", jurnalIds);

    if (detailError) {
      console.error("Health jurnal_detail error:", detailError);

      return NextResponse.json(
        {
          error: "Gagal mengambil detail jurnal",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       COA
    ===================================================== */

    const { data: coaList, error: coaError } = await db
      .from("coa")
      .select("id_coa, tipe, nama, is_cash");

    if (coaError) {
      console.error("Health COA error:", coaError);

      return NextResponse.json(
        {
          error: "Gagal mengambil COA",
        },
        {
          status: 500,
        },
      );
    }

    const coaMap = new Map<number, Coa>();

    for (const row of coaList ?? []) {
      const tipe = parseCoaTipe(row.tipe);

      if (!tipe) {
        continue;
      }

      const idCoa = Number(row.id_coa);

      if (!Number.isInteger(idCoa) || idCoa <= 0) {
        continue;
      }

      coaMap.set(idCoa, {
        id_coa: idCoa,
        tipe,
        nama: String(row.nama ?? ""),
        is_cash: Boolean(row.is_cash),
      });
    }

    /* =====================================================
       METRIC DASAR
    ===================================================== */

    let kas = 0;
    let pendapatan = 0;

    /*
     * Saldo mentah akun BEBAN.
     *
     * Akun beban normalnya:
     * debit - kredit
     *
     * Tetapi untuk Dashboard kita tampilkan
     * BEBAN sebagai magnitude positif.
     */
    let rawBeban = 0;

    let hutang = 0;

    const bebanMap = new Map<string, number>();

    /* =====================================================
       LOOP JURNAL
    ===================================================== */

    for (const row of detail ?? []) {
      const d: Detail = {
        id_coa: Number(row.id_coa),
        debit: toNumber(row.debit),
        kredit: toNumber(row.kredit),
        id_jurnal: Number(row.id_jurnal),
      };

      const coa = coaMap.get(d.id_coa);

      if (!coa) {
        continue;
      }

      /* ===================================================
         KAS

         Hanya COA is_cash = true.
      =================================================== */

      if (coa.is_cash) {
        kas += d.debit - d.kredit;
      }

      /* ===================================================
         PENDAPATAN

         Normal balance kredit.
      =================================================== */

      if (coa.tipe === "PENDAPATAN") {
        pendapatan += d.kredit - d.debit;
      }

      /* ===================================================
         BEBAN

         Normal balance debit.
      =================================================== */

      if (coa.tipe === "BEBAN") {
        const nilaiBeban = d.debit - d.kredit;

        rawBeban += nilaiBeban;

        bebanMap.set(coa.nama, (bebanMap.get(coa.nama) ?? 0) + nilaiBeban);
      }

      /* ===================================================
         LIABILITAS

         Normal balance kredit.
      =================================================== */

      if (coa.tipe === "LIABILITAS") {
        hutang += d.kredit - d.debit;
      }
    }

    /* =====================================================
       NORMALISASI BEBAN
    ===================================================== */

    /*
     * Ini bagian penting.
     *
     * Data Anda saat ini:
     *
     * rawBeban = -489.479.755.168,31
     *
     * Dashboard harus menampilkan:
     *
     * Beban = 489.479.755.168,31
     *
     * bukan 0
     * dan bukan angka negatif.
     */

    const beban = Math.abs(rawBeban);

    /* =====================================================
       LABA / RUGI
    ===================================================== */

    /*
     * Pendapatan - Beban
     *
     * 1.154.634.993.278
     * -
     * 489.479.755.168,31
     *
     * =
     * 665.155.238.109,69
     */

    const laba = pendapatan - beban;

    /* =====================================================
       SCORE
    ===================================================== */

    let score = 100;

    if (laba < 0 && kas < 0 && beban > pendapatan) {
      score = 10;
    }

    if (pendapatan > 0) {
      const margin = laba / pendapatan;

      if (margin < 0) {
        const penalty = Math.abs(margin);

        if (penalty < 0.5) {
          score -= penalty * 20;
        } else if (penalty < 1.5) {
          score -= 10 + (penalty - 0.5) * 10;
        } else {
          score -= 25;
        }
      }
    }

    if (pendapatan > 0 && kas < 0) {
      const cashRatio = Math.abs(kas) / pendapatan;

      score -= Math.min(cashRatio * 10, 15);
    }

    if (pendapatan > 0) {
      const expenseRatio = beban / pendapatan;

      if (expenseRatio > 1) {
        score -= Math.min((expenseRatio - 1) * 20, 25);
      }
    }

    if (kas !== 0) {
      const debtRatio = Math.abs(hutang) / Math.abs(kas);

      if (debtRatio > 1) {
        score -= Math.min((debtRatio - 1) * 10, 10);
      }
    }

    if (score < 5) {
      score = 5;
    }

    if (score > 100) {
      score = 100;
    }

    if (score < 20 && pendapatan > 0) {
      score = 20;
    }

    score = Math.round(score);

    /* =====================================================
       KATEGORI
    ===================================================== */

    let kategori = "SEHAT";
    let warna = "green";

    if (score < 20) {
      kategori = "KRISIS";
      warna = "red";
    } else if (score < 60) {
      kategori = "WASPADA";
      warna = "yellow";
    }

    /* =====================================================
       INSIGHT
    ===================================================== */

    const insights: Insight[] = [];
    const rekomendasi: string[] = [];

    /* =====================================================
       KAS
    ===================================================== */

    if (kas < 0) {
      if (Math.abs(kas) > pendapatan) {
        insights.push({
          level: "DANGER",
          message: "Kas negatif melebihi pendapatan",
        });
      } else {
        insights.push({
          level: "WARNING",
          message: "Kas masih negatif",
        });
      }

      rekomendasi.push(
        "Perbaiki arus kas: percepat penagihan atau pertimbangkan injeksi modal",
      );
    } else {
      insights.push({
        level: "SUCCESS",
        message: "Kas dalam kondisi aman",
      });
    }

    /* =====================================================
       LABA
    ===================================================== */

    if (laba < 0) {
      const ratio = Math.abs(laba) / (pendapatan || 1);

      if (ratio > 1) {
        insights.push({
          level: "DANGER",
          message: "Kerugian sangat besar",
        });
      } else {
        insights.push({
          level: "WARNING",
          message: "Perusahaan masih merugi",
        });
      }

      rekomendasi.push(
        `Kurangi beban atau tingkatkan pendapatan sekitar Rp ${Math.round(
          Math.abs(laba),
        ).toLocaleString("id-ID")}`,
      );
    } else {
      insights.push({
        level: "SUCCESS",
        message: "Perusahaan menghasilkan laba",
      });
    }

    /* =====================================================
       BEBAN
    ===================================================== */

    if (beban > pendapatan) {
      const ratio = beban / (pendapatan || 1);

      if (ratio > 2) {
        insights.push({
          level: "DANGER",
          message: "Beban sangat tidak terkendali",
        });
      } else {
        insights.push({
          level: "WARNING",
          message: "Beban lebih besar dari pendapatan",
        });
      }

      rekomendasi.push(
        `Efisiensi biaya minimal Rp ${Math.round(
          beban - pendapatan,
        ).toLocaleString("id-ID")}`,
      );
    } else {
      insights.push({
        level: "SUCCESS",
        message: "Beban masih dalam batas sehat",
      });
    }

    /* =====================================================
       HUTANG
    ===================================================== */

    if (kas !== 0) {
      const debtRatio = Math.abs(hutang) / Math.abs(kas);

      if (debtRatio > 2) {
        insights.push({
          level: "DANGER",
          message: "Ketergantungan hutang tinggi",
        });
      } else if (debtRatio > 1) {
        insights.push({
          level: "WARNING",
          message: "Rasio hutang meningkat",
        });
      } else {
        insights.push({
          level: "SUCCESS",
          message: "Rasio hutang aman",
        });
      }
    }

    /* =====================================================
       BEBAN TERBESAR
    ===================================================== */

    let maxNama = "";
    let maxVal = 0;

    for (const [nama, nilai] of bebanMap.entries()) {
      if (nilai > maxVal) {
        maxVal = nilai;
        maxNama = nama;
      }
    }

    if (maxNama) {
      insights.push({
        level: "INFO",
        message: `Biaya terbesar berasal dari ${maxNama}`,
      });

      rekomendasi.push(`Fokus efisiensi pada ${maxNama}`);
    }

    /* =====================================================
       FINAL PRIORITAS
    ===================================================== */

    if (score < 40) {
      rekomendasi.push(
        "Prioritas: stabilkan cashflow dan tekan biaya operasional",
      );
    } else if (score < 70) {
      rekomendasi.push("Fokus meningkatkan margin dan efisiensi operasional");
    } else {
      rekomendasi.push("Pertahankan performa dan lakukan ekspansi bertahap");
    }

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      kas,
      pendapatan,
      beban,
      laba,
      hutang,
      score,
      kategori,
      warna,
      insights,
      rekomendasi,

      periode: id_periode,

      jumlah_jurnal: jurnalIds.length,

      jumlah_detail: detail?.length ?? 0,

      perhitungan: {
        pendapatan,
        raw_beban: rawBeban,
        beban,
        laba,
        rumus: "pendapatan - beban",
      },
    });
  } catch (err) {
    console.error("Health dashboard error:", err);

    return NextResponse.json(
      {
        error: "Gagal load health",
      },
      {
        status: 500,
      },
    );
  }
}
