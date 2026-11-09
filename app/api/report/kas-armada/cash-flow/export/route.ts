import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import ExcelJS from "exceljs";
import QRCode from "qrcode";

interface CashRow {
  debit: string;
  kredit: string;
}

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("jurnal_detail")
    .select(
      `
      debit,
      kredit,
      jurnal!inner(sumber)
    `,
    )
    .eq("jurnal.sumber", "KAS_ARMADA");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let cashIn = 0;
  let cashOut = 0;

  for (const row of (data ?? []) as CashRow[]) {
    const debit = Number(row.debit);
    const kredit = Number(row.kredit);

    if (debit > 0) cashIn += debit;
    if (kredit > 0) cashOut += kredit;
  }

  const netCash = cashIn - cashOut;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Cash Flow Kas Armada");

  sheet.addRow(["Cash In", cashIn]);
  sheet.addRow(["Cash Out", cashOut]);
  sheet.addRow(["Net Cash", netCash]);

  const qrText = `Cash In: ${cashIn}
Cash Out: ${cashOut}
Net Cash: ${netCash}`;

  const qrImage = await QRCode.toDataURL(qrText);

  const imageId = workbook.addImage({
    base64: qrImage.replace(/^data:image\/png;base64,/, ""),
    extension: "png",
  });

  sheet.addImage(imageId, {
    tl: { col: 3, row: 1 },
    ext: { width: 150, height: 150 },
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=cash-flow-kas-armada.xlsx",
    },
  });
}
