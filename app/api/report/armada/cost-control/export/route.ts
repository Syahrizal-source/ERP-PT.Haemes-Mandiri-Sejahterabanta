import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import ExcelJS from "exceljs";
import QRCode from "qrcode";

interface CostControlRow {
  tanggal: string;
  jenis_biaya: string;
  nominal: number | string;
  armada: {
    kode_transaksi: string;
    no_polisi: string;
    supir: string;
  }[] | null;
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

  data.forEach((row) => {
    const nominal = Number(row.nominal);
    const armada = row.armada?.[0];

    sheet.addRow([
      row.tanggal,
      armada?.kode_transaksi ?? "",
      armada?.no_polisi ?? "",
      armada?.supir ?? "",
      row.jenis_biaya,
      nominal,
    ]);

    total += nominal;
  });

  sheet.addRow([]);
  sheet.addRow(["", "", "", "", "TOTAL", total]);

  const qrText = `Total Cost Control Armada: ${total}`;
  const qrImage = await QRCode.toDataURL(qrText);

  const imageId = workbook.addImage({
    base64: qrImage.replace(/^data:image\/png;base64,/, ""),
    extension: "png",
  });

  sheet.addImage(imageId, "H2:I10");

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=cost-control-armada.xlsx",
    },
  });
}
