import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { getPeriodeAktif } from "@/lib/periode";

/* =========================
   TYPES
========================= */
type Coa = {
  id_coa: number;
  tipe: "ASET" | "LIABILITAS" | "EKUITAS" | "PENDAPATAN" | "BEBAN";
};

type Detail = {
  id_coa: number;
  debit: number;
  kredit: number;
  id_jurnal: number;
};

type Jurnal = {
  id_jurnal: number;
  tanggal: string;
  sumber: string;
  id_proyek: string | null;
};

type ProyekAgg = {
  pendapatan: number;
  beban: number;
};

/* =========================
   HELPER
========================= */
function getOrInitProyek(map: Map<string, ProyekAgg>, key: string): ProyekAgg {
  const existing = map.get(key);
  if (existing) return existing;

  const init: ProyekAgg = { pendapatan: 0, beban: 0 };
  map.set(key, init);
  return init;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);

    /* =========================
       PERIODE (SAMA DENGAN HEALTH)
    ========================= */
    let id_periode: number;
    const param = searchParams.get("id_periode");

    if (param) {
      id_periode = Number(param);

      if (!Number.isInteger(id_periode)) {
        return NextResponse.json(
          { error: "id_periode tidak valid" },
          { status: 400 },
        );
      }
    } else {
      const periode = await getPeriodeAktif();
      id_periode = periode.id_periode;
    }

    /* =========================
       JURNAL POSTED ONLY (SINKRON HEALTH)
    ========================= */
    const { data: jurnal } = await db
      .from("jurnal")
      .select("id_jurnal, tanggal, sumber, id_proyek")
      .eq("id_periode", id_periode)
      .eq("is_posted", true);

    const jurnalMap = new Map<number, Jurnal>();
    const jurnalIds: number[] = [];

    for (const j of jurnal ?? []) {
      jurnalMap.set(j.id_jurnal, j as Jurnal);
      jurnalIds.push(j.id_jurnal);
    }

    if (jurnalIds.length === 0) {
      return NextResponse.json({
        monthly: [],
        divisi: [],
        forecast: [],
        anomaly: [],
        margin: [],
        ranking: [],
        profit_chart: [],
        rekomendasi: [],
      });
    }

    /* =========================
       DETAIL & COA
    ========================= */
    const { data: detail } = await db
      .from("jurnal_detail")
      .select("id_coa, debit, kredit, id_jurnal")
      .in("id_jurnal", jurnalIds);

    const { data: coaList } = await db.from("coa").select("id_coa, tipe");

    const coaMap = new Map<number, Coa>();
    for (const c of coaList ?? []) {
      coaMap.set(c.id_coa, c as Coa);
    }

    /* =========================
       MAP
    ========================= */
    const monthlyMap = new Map<string, { p: number; b: number }>();
    const divisiMap = new Map<string, number>();
    const proyekMap = new Map<string, ProyekAgg>();
    const bebanKategori = new Map<string, number>();

    for (const d of detail ?? []) {
      const coa = coaMap.get(d.id_coa);
      const j = jurnalMap.get(d.id_jurnal);
      if (!coa || !j) continue;

      const bulan = j.tanggal.slice(0, 7);

      if (!monthlyMap.has(bulan)) {
        monthlyMap.set(bulan, { p: 0, b: 0 });
      }

      const m = monthlyMap.get(bulan);
      if (!m) continue;

      const debit = Number(d.debit);
      const kredit = Number(d.kredit);

      const proyekId =
        j.id_proyek && j.id_proyek.trim() !== "" ? j.id_proyek : "NON_PROYEK";

      /* =========================
         PENDAPATAN
      ========================= */
      if (coa.tipe === "PENDAPATAN") {
        m.p += kredit - debit;

        const p = getOrInitProyek(proyekMap, proyekId);
        p.pendapatan += kredit - debit;
      }

      /* =========================
         BEBAN (EXCLUDE PENYESUAIAN - SINKRON HEALTH)
      ========================= */
      if (coa.tipe === "BEBAN") {
        if (j.sumber === "PENYESUAIAN") continue;

        const val = debit - kredit;

        m.b += val;

        divisiMap.set(j.sumber, (divisiMap.get(j.sumber) ?? 0) + val);
        bebanKategori.set(j.sumber, (bebanKategori.get(j.sumber) ?? 0) + val);

        const p = getOrInitProyek(proyekMap, proyekId);
        p.beban += val;
      }
    }

    /* =========================
       FORMAT
    ========================= */
    const monthly = Array.from(monthlyMap.entries()).map(([bulan, v]) => ({
      bulan,
      pendapatan: v.p,
      beban: v.b,
    }));

    const divisi = Array.from(divisiMap.entries()).map(([nama, total]) => ({
      nama,
      total,
    }));

    const margin = Array.from(proyekMap.entries()).map(([id, v]) => ({
      id_proyek: id,
      margin: v.pendapatan - v.beban,
      pendapatan: v.pendapatan,
      beban: v.beban,
      profit: v.pendapatan - v.beban,
    }));

    const ranking = [...margin].sort((a, b) => b.profit - a.profit).slice(0, 5);

    const profit_chart = margin.map((m) => ({
      proyek: m.id_proyek,
      profit: m.profit,
    }));

    /* =========================
       FORECAST
    ========================= */
    const forecast = monthly.map((m, i) => {
      const prev = monthly.slice(Math.max(0, i - 2), i + 1);
      const avg =
        prev.reduce((s, v) => s + (v.pendapatan - v.beban), 0) / prev.length;

      return {
        bulan: m.bulan,
        estimasi: avg,
      };
    });

    /* =========================
       ANOMALY (LEBIH STABIL)
    ========================= */
    const avgBeban =
      monthly.reduce((s, m) => s + m.beban, 0) / (monthly.length || 1);

    const anomaly = monthly.filter(
      (m) => m.beban > avgBeban * 1.5 && m.beban > 0,
    );

    /* =========================
       REKOMENDASI (SINKRON)
    ========================= */
    const rekomendasi: string[] = [];

    const totalBeban = Array.from(bebanKategori.values()).reduce(
      (s, v) => s + v,
      0,
    );

    for (const [kategori, val] of bebanKategori.entries()) {
      if (kategori === "PENYESUAIAN") continue;

      const ratio = val / (totalBeban || 1);

      if (ratio > 0.3) {
        rekomendasi.push(
          `Biaya ${kategori} terlalu tinggi (${Math.round(
            ratio * 100,
          )}%), perlu efisiensi`,
        );
      }
    }

    if (rekomendasi.length === 0) {
      rekomendasi.push("Biaya masih dalam batas normal");
    }

    return NextResponse.json({
      monthly,
      divisi,
      forecast,
      anomaly,
      margin,
      ranking,
      profit_chart,
      rekomendasi,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal analytics" }, { status: 500 });
  }
}
