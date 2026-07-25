import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

interface DashboardResponse {
  totalJurnal: number;
  totalDebit: number;
  totalKredit: number;
  totalProyek: number;
  totalPayroll: number;
  totalFuel: number;
  totalRental: number;
}

export async function GET() {
  try {
    /* ================= JURNAL DETAIL ================= */

    const { data: jurnalDetail } = await db
      .from("jurnal_detail")
      .select("debit, kredit");

    /* ================= TOTAL JURNAL ================= */

    const { count: totalJurnal } = await db.from("jurnal").select("*", {
      count: "exact",
      head: true,
    });

    const totalDebit: number =
      jurnalDetail?.reduce((acc, j) => acc + Number(j.debit), 0) ?? 0;

    const totalKredit: number =
      jurnalDetail?.reduce((acc, j) => acc + Number(j.kredit), 0) ?? 0;
    /* ================= PROYEK ================= */

    const { count: totalProyek } = await db
      .from("proyek")
      .select("*", { count: "exact", head: true });

    /* ================= PAYROLL ================= */

    const { data: payroll } = await db.from("payroll").select("net_gaji");

    const totalPayroll: number =
      payroll?.reduce((acc, p) => acc + Number(p.net_gaji), 0) ?? 0;

    /* ================= FUEL ================= */

    const { data: fuel } = await db.from("equipment_fuel").select("total");

    const totalFuel: number =
      fuel?.reduce((acc, f) => acc + Number(f.total), 0) ?? 0;

    /* ================= RENTAL ================= */

    const { data: rental } = await db.from("equipment_rental").select("total");

    const totalRental: number =
      rental?.reduce((acc, r) => acc + Number(r.total), 0) ?? 0;

    return NextResponse.json({
      totalJurnal: totalJurnal ?? 0,
      totalDebit,
      totalKredit,
      totalProyek: totalProyek ?? 0,
      totalPayroll,
      totalFuel,
      totalRental,
    } satisfies DashboardResponse);
  } catch (error: unknown) {
    return NextResponse.json(
      { message: (error as Error).message },
      { status: 500 },
    );
  }
}
