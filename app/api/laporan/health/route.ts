import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { getPeriodeAktif } from "@/lib/periode";

type Coa = {
  id_coa: number;
  tipe: "ASET" | "LIABILITAS" | "EKUITAS" | "PENDAPATAN" | "BEBAN";
  nama: string;
};

type Detail = {
  id_coa: number;
  debit: number;
  kredit: number;
  id_jurnal: number;
};

type Insight = {
  level: "INFO" | "WARNING" | "DANGER" | "SUCCESS";
  message: string;
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const param = searchParams.get("id_periode");

    /* =========================
       PRIORITAS: PERIODE AKTIF
    ========================= */
    let id_periode: number;

    if (param) {
      id_periode = Number(param);
    } else {
      const periode = await getPeriodeAktif();
      id_periode = periode.id_periode;
    }

    /* =========================
       JURNAL POSTED ONLY
    ========================= */
    const { data: jurnal } = await db
      .from("jurnal")
      .select("id_jurnal")
      .eq("id_periode", id_periode)
      .eq("is_posted", true);

    const jurnalIds: number[] = (jurnal ?? []).map((j) => j.id_jurnal);

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
      });
    }

    const { data: detail } = await db
      .from("jurnal_detail")
      .select("id_coa, debit, kredit, id_jurnal")
      .in("id_jurnal", jurnalIds);

    const { data: coaList } = await db.from("coa").select("id_coa, tipe, nama");

    const coaMap = new Map<number, Coa>();
    for (const c of coaList ?? []) {
      coaMap.set(c.id_coa, c as Coa);
    }

    let kas = 0;
    let pendapatan = 0;
    let beban = 0;
    let hutang = 0;

    const bebanMap = new Map<string, number>();

    for (const d of detail ?? []) {
      const coa = coaMap.get(d.id_coa);
      if (!coa) continue;

      const debit = Number(d.debit);
      const kredit = Number(d.kredit);

      if (coa.tipe === "ASET") kas += debit - kredit;
      if (coa.tipe === "PENDAPATAN") pendapatan += kredit - debit;

      if (coa.tipe === "BEBAN") {
        const nilai = debit - kredit;
        beban += nilai;
        bebanMap.set(coa.nama, (bebanMap.get(coa.nama) ?? 0) + nilai);
      }

      if (coa.tipe === "LIABILITAS") hutang += kredit - debit;
    }

    const laba = pendapatan - beban;

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
          score -= 25; // batasi supaya tidak langsung hancur
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

    if (score < 5) score = 5;
    if (score > 100) score = 100;
    if (score < 20 && pendapatan > 0) {
      score = 20;
    }

    /* =========================
   FIX: BULATKAN SCORE
========================= */
    score = Math.round(score);

    let kategori = "SEHAT";
    let warna = "green";

    if (score < 20) {
      kategori = "KRISIS";
      warna = "red";
    } else if (score < 60) {
      kategori = "WASPADA";
      warna = "yellow";
    } else {
      kategori = "SEHAT";
      warna = "green";
    }

    const insights: Insight[] = [];
    const rekomendasi: string[] = [];

    /* =========================
   KAS
========================= */
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

    /* =========================
   LABA
========================= */
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

    /* =========================
   BEBAN
========================= */
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

    /* =========================
   HUTANG
========================= */
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

    /* =========================
   BEBAN TERBESAR
========================= */
    let maxNama = "";
    let maxVal = 0;

    for (const [nama, val] of bebanMap.entries()) {
      if (val > maxVal) {
        maxVal = val;
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

    /* =========================
   FINAL PRIORITAS
========================= */
    if (score < 40) {
      rekomendasi.push(
        "Prioritas: stabilkan cashflow dan tekan biaya operasional",
      );
    } else if (score < 70) {
      rekomendasi.push("Fokus meningkatkan margin dan efisiensi operasional");
    } else {
      rekomendasi.push("Pertahankan performa dan lakukan ekspansi bertahap");
    }

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
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal load health" }, { status: 500 });
  }
}
