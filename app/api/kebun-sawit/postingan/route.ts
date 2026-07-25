import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCoaMappingDetail } from "@/lib/accounting/getcoamapping";
import { postJournal } from "@/lib/accounting/postJournal";
import { JurnalLine } from "@/types/accounting";

const schema = z.object({
  jenis_transaksi: z.enum([
    "HARVEST",
    "PEMUPUKAN",
    "PERAWATAN",
    "HAMA",
    "REPLANTING",
    "GAJI",
    "MAINTENANCE",
  ]),
  region_id: z.string().uuid(),
  tanggal: z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
    message: "Tanggal tidak valid",
  }),
  no_bukti: z.string().min(1),
  keterangan: z.string().min(1),
  amount: z.number().positive(),
  cost_center_id: z.string().uuid(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(parsed.error.format(), { status: 400 });
    }

    const {
      jenis_transaksi,
      region_id,
      tanggal,
      no_bukti,
      keterangan,
      amount,
      cost_center_id,
    } = parsed.data;

    const mapping = await getCoaMappingDetail(jenis_transaksi, region_id);

    const lines: JurnalLine[] = mapping.map((m) => ({
      id_coa: m.id_coa,
      debit: m.posisi === "DEBIT" ? amount : 0,
      kredit: m.posisi === "KREDIT" ? amount : 0,
      id_cost_center: cost_center_id,
    }));

    const jurnalId = await postJournal({
      tanggal,
      no_bukti,
      keterangan,
      sumber: "KEBUN",
      lines,
    });

    return NextResponse.json(
      {
        message: "Posting berhasil",
        jurnal_id: jurnalId,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
