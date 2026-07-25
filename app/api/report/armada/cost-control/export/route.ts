import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import ExcelJS from "exceljs";
import QRCode from "qrcode";

interface CostControlRow {
  tanggal: string;
  jenis_biaya: string;
  nominal: number;
  armada: {
    kode_transaksi: string;
    no_polisi: string;
    supir: string;
  } | null;
}

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("cost_control_armada")
    .select(
      `
      tanggal,
      jenis_biaya,
      nominal,
      armada (
        kode_transaksi,
        no_polisi,
        supir
      )
    `,
    )
    .order("tanggal", { ascending: true });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil cost control armada" },
      { status: 500 },
    );
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Cost Control Armada");

  sheet.addRow([
    "Tanggal",
    "Kode Transaksi",
    "No Polisi",
    "Supir",
    "Jenis Biaya",
    "Nominal",
  ]);

  let total = 0;

  data.forEach((row: CostControlRow) => {
    const nominal = Number(row.nominal);

    sheet.addRow([
      row.tanggal,
      row.armada?.kode_transaksi ?? "",
      row.armada?.no_polisi ?? "",
      row.armada?.supir ?? "",
      row.jenis_biaya,
      nominal,
    ]);

    total += nominal;
  });

  sheet.addRow([]);
  sheet.addRow(["", "", "", "", "TOTAL", total]);

  const qrText = `Total Cost Control Armada: ${total}`;
  const qrImage = await QRCode.toBuffer(qrText);

  const imageId = workbook.addImage({
    buffer: qrImage,
    extension: "png",
  });

  sheet.addImage(imageId, "H2:I10");

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=cost-control-armada.xlsx",
    },
  });
}
