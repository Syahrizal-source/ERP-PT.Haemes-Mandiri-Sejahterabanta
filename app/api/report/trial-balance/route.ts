import { NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import ExcelJS, { CellHyperlinkValue } from "exceljs";

import QRCode from "qrcode";

import { generateQRCodeValue } from "@/lib/helpers/qrcode";

/* =========================
   TYPES
========================= */

interface TrialBalanceRow {
  id_coa: number;

  kode: string;

  nama: string;

  total_debit: number;

  total_kredit: number;

  saldo: number;
}
interface LedgerDetailRow {
  tanggal: string;

  no_bukti: string;

  keterangan: string;

  debit: number;

  kredit: number;

  saldo: number;
}

/* =========================
   FORMAT SHEET NAME
========================= */

function formatSheetName(kode: string, nama: string): string {
  return `${kode}-${nama}`.replace(/[\\/*?:[\]]/g, "").substring(0, 31);
}

/* =========================
   HEADER STYLE
========================= */

function applyHeaderStyle(cell: ExcelJS.Cell): void {
  cell.font = {
    bold: true,
    color: {
      argb: "000000",
    },
  };

  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "F4CCCC",
    },
  };

  cell.border = {
    top: {
      style: "thin",
    },

    left: {
      style: "thin",
    },

    bottom: {
      style: "thin",
    },

    right: {
      style: "thin",
    },
  };
}

/* =========================
   TITLE
========================= */

function createTitle(
  sheet: ExcelJS.Worksheet,
  companyTitle: string,
  division: string,
  section: string,
  reportTitle: string,
  periode: string,
  printDate: string,
): void {
  sheet.mergeCells("A1:G1");

  sheet.getCell("A1").value = reportTitle;

  sheet.getCell("A1").font = {
    bold: true,
    size: 18,
  };

  sheet.getCell("A1").alignment = {
    horizontal: "center",
  };

  sheet.mergeCells("A2:G2");

  sheet.getCell("A2").value = companyTitle;

  sheet.getCell("A2").font = {
    bold: true,
    size: 15,
  };

  sheet.getCell("A2").alignment = {
    horizontal: "center",
  };

  sheet.mergeCells("A3:G3");

  sheet.getCell("A3").value = section;

  sheet.getCell("A3").alignment = {
    horizontal: "center",
  };

  sheet.getCell("A5").value = `DIVISI : ${division}`;
  sheet.getCell("A6").value = `PERIODE : ${periode}`;
  sheet.getCell("A7").value = `TANGGAL CETAK : ${printDate}`;
  sheet.getCell("A8").value = "MATA UANG : Rupiah (IDR)";
  sheet.mergeCells("A9:G9");
  const divider = sheet.getCell("A9");

  divider.border = {
    bottom: {
      style: "medium",
    },
  };

  divider.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "EDEDED",
    },
  };
}
/* =========================
   SIGNATURE
========================= */

function addSignature(sheet: ExcelJS.Worksheet, row: number): void {
  const safeRow = row < 20 ? 20 : row;

  sheet.getCell(`B${safeRow}`).value = "Direksi";

  sheet.getCell(`F${safeRow}`).value = "Manager";

  sheet.getCell(`B${safeRow}`).font = {
    bold: true,
  };

  sheet.getCell(`F${safeRow}`).font = {
    bold: true,
  };

  sheet.getCell(`B${safeRow + 4}`).value = "(_________________)";

  sheet.getCell(`F${safeRow + 4}`).value = "(_________________)";

  sheet.getCell(`B${safeRow + 5}`).value = "PT. Haemes Mandiri Sejahterabanta";

  sheet.getCell(`F${safeRow + 5}`).value = "Finance Manager";
}

/* =========================
   GET
========================= */

export async function GET(): Promise<Response> {
  try {
    /* =========================
       GET TRIAL BALANCE
    ========================= */

    const { data, error } = await db.rpc("get_trial_balance_report");

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    const rows: TrialBalanceRow[] = data ?? [];

    const { data: periode } = await db
      .from("periode")
      .select("nama_periode")
      .eq("status", "OPEN")
      .single();

    const printDate = new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    /* =========================
   GET DETAIL JURNAL
========================= */

    const {
      data: ledgerData,

      error: ledgerError,
    } = await db
      .from("v_general_ledger")
      .select(
        `
    tanggal,
    no_bukti,
    keterangan,
    kode_coa,
    debit,
    kredit
  `,
      )
      .not("no_bukti", "like", "CLS-SUSPENSE-%")
      .order("tanggal", {
        ascending: true,
      });

    if (ledgerError) {
      return NextResponse.json(
        {
          error: ledgerError.message,
        },
        {
          status: 500,
        },
      );
    }

    const ledgerRows = (ledgerData ?? []) as (LedgerDetailRow & {
      kode_coa: string;
    })[];

    /* =========================
       WORKBOOK
    ========================= */

    const workbook = new ExcelJS.Workbook();

    /* =========================
       MAIN SHEET
    ========================= */

    const sheet = workbook.addWorksheet("Trial Balance");

    createTitle(
      sheet,
      "PT. Haemes Mandiri Sejahterabanta",
      "CORPORATE",
      "JASA CUT & FILL DAN PENGURUGAN TANAH",
      "TRIAL BALANCE",
      periode?.nama_periode ?? "-",
      printDate,
    );

    /* =========================
       HEADER
    ========================= */

    sheet.mergeCells("B11:C11");
    sheet.mergeCells("D11:E11");
    sheet.mergeCells("F11:G11");

    sheet.getCell("A11").value = "Account";

    sheet.getCell("B11").value = "Opening Balance";

    sheet.getCell("D11").value = "Transaction During Period";

    sheet.getCell("F11").value = "Closing Balance";

    sheet.getCell("B11").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "D9EAD3" }, // contoh warna
    };

    sheet.getCell("D11").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "EAD1DC" },
    };

    sheet.getCell("F11").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF2CC" },
    };

    sheet.getRow(12).values = [
      "",
      "Debit Dr",
      "Credit Cr",
      "Debit Dr",
      "Credit Cr",
      "Debit Dr",
      "Credit Cr",
    ];

    for (let row = 11; row <= 12; row++) {
      for (let col = 1; col <= 7; col++) {
        applyHeaderStyle(sheet.getCell(row, col));
      }
    }

    /* =========================
       COLUMN WIDTH
    ========================= */

    sheet.columns = [
      {
        width: 48,
      },

      {
        width: 18,
      },

      {
        width: 18,
      },

      {
        width: 18,
      },

      {
        width: 18,
      },

      {
        width: 18,
      },

      {
        width: 18,
      },
    ];

    /* =========================
       DETAIL
    ========================= */

    let currentRow = 13;

    let totalDebit = 0;

    let totalKredit = 0;

    /* =========================
   GROUP CORPORATE
========================= */

    interface GroupedTrialBalance {
      kategori: string;

      subKategori: string;

      items: TrialBalanceRow[];
    }

    const groupedMap = new Map<string, Map<string, TrialBalanceRow[]>>();

    for (const item of rows) {
      const coaInfo = await db
        .from("coa")
        .select(
          `
      kode,
      kategori_laporan,
      sub_kategori
    `,
        )
        .eq("kode", item.kode)
        .single();

      const kategori = coaInfo.data?.kategori_laporan ?? "LAINNYA";

      const subKategori = coaInfo.data?.sub_kategori ?? "LAINNYA";

      if (!groupedMap.has(kategori)) {
        groupedMap.set(kategori, new Map<string, TrialBalanceRow[]>());
      }

      const subMap = groupedMap.get(kategori);

      if (!subMap) {
        continue;
      }

      if (!subMap.has(subKategori)) {
        subMap.set(subKategori, []);
      }

      const currentItems = subMap.get(subKategori);

      if (!currentItems) {
        continue;
      }

      currentItems.push(item);
    }

    for (const [kategori, subMap] of groupedMap) {
      /* =========================
     HEADER KATEGORI
  ========================= */

      sheet.mergeCells(`A${currentRow}:G${currentRow}`);

      sheet.getCell(`A${currentRow}`).value = kategori;

      sheet.getCell(`A${currentRow}`).font = {
        bold: true,
        size: 14,
      };

      sheet.getCell(`A${currentRow}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "D9EAD3",
        },
      };

      currentRow++;

      /* =========================
     SUB KATEGORI
  ========================= */

      for (const [subKategori, coaItems] of subMap) {
        sheet.mergeCells(`A${currentRow}:G${currentRow}`);

        sheet.getCell(`A${currentRow}`).value = subKategori;

        sheet.getCell(`A${currentRow}`).font = {
          bold: true,
        };

        sheet.getCell(`A${currentRow}`).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FFF2CC",
          },
        };

        currentRow++;

        /* =========================
       DETAIL COA
    ========================= */

        for (const row of coaItems) {
          const saldo =
            Number(row.total_debit ?? 0) - Number(row.total_kredit ?? 0);

          const saldoDebit = saldo >= 0 ? saldo : 0;

          const saldoKredit = saldo < 0 ? Math.abs(saldo) : 0;

          const detailSheetName = formatSheetName(row.kode, row.nama);

          const linkCell = sheet.getCell(`A${currentRow}`);

          const hyperlinkValue: CellHyperlinkValue = {
            text: `${row.kode} - ${row.nama}`,

            hyperlink: `#'${detailSheetName}'!A1`,
          };

          linkCell.value = hyperlinkValue;

          linkCell.font = {
            color: {
              argb: "0000FF",
            },

            underline: true,
          };

          sheet.getCell(`D${currentRow}`).value = Number(row.total_debit);

          sheet.getCell(`E${currentRow}`).value = Number(row.total_kredit);

          sheet.getCell(`F${currentRow}`).value =
            saldoDebit > 0 ? saldoDebit : "";

          sheet.getCell(`G${currentRow}`).value =
            saldoKredit > 0 ? saldoKredit : "";

          for (let col = 2; col <= 7; col++) {
            sheet.getCell(currentRow, col).numFmt =
              '"Rp" #,##0;[Red]("Rp" #,##0)';
          }

          totalDebit += Number(row.total_debit ?? 0);

          totalKredit += Number(row.total_kredit ?? 0);

          /* =========================
   DETAIL SHEET
========================= */

          const detailSheet = workbook.addWorksheet(detailSheetName);

          createTitle(
            detailSheet,
            "PT. Haemes Mandiri Sejahterabanta",
            "CORPORATE",
            "JASA CUT & FILL DAN PENGURUGAN TANAH",
            "TRIAL BALANCE",
            periode?.nama_periode ?? "-",
            printDate,
          );

          detailSheet.columns = [
            { width: 15 },
            { width: 20 },
            { width: 40 },
            { width: 18 },
            { width: 18 },
            { width: 18 },
          ];

          detailSheet.getRow(11).values = [
            "Tanggal",
            "Voucher",
            "Keterangan",
            "Debit",
            "Kredit",
            "Saldo",
          ];

          for (let col = 1; col <= 11; col++) {
            applyHeaderStyle(detailSheet.getCell(11, col));
          }

          /* =========================
   FILTER ACCOUNT
========================= */

          const accountDetails = ledgerRows
            .filter((item): boolean => item.kode_coa === row.kode)
            .sort((a, b): number => {
              const dateA = new Date(a.tanggal).getTime();

              const dateB = new Date(b.tanggal).getTime();

              if (dateA !== dateB) {
                return dateA - dateB;
              }

              return a.no_bukti.localeCompare(b.no_bukti);
            });

          let detailRow = 12;

          let runningSaldo = 0;

          for (const item of accountDetails) {
            const debitValue = Number(item.debit ?? 0);

            const kreditValue = Number(item.kredit ?? 0);

            runningSaldo = runningSaldo + debitValue - kreditValue;

            detailSheet.getCell(`A${detailRow}`).value = new Date(
              item.tanggal,
            ).toLocaleDateString("id-ID");

            detailSheet.getCell(`B${detailRow}`).value = item.no_bukti;

            detailSheet.getCell(`C${detailRow}`).value = item.keterangan;

            detailSheet.getCell(`D${detailRow}`).value =
              debitValue > 0 ? debitValue : "";

            detailSheet.getCell(`E${detailRow}`).value =
              kreditValue > 0 ? kreditValue : "";

            detailSheet.getCell(`F${detailRow}`).value = runningSaldo;

            for (let col = 4; col <= 6; col++) {
              detailSheet.getCell(detailRow, col).numFmt =
                '"Rp" #,##0;[Red]("Rp" #,##0)';
            }

            detailRow++;
          }

          /* =========================
   BACK LINK
========================= */

          const backCell = detailSheet.getCell(`A${detailRow + 2}`);

          const backLink: CellHyperlinkValue = {
            text: "Kembali ke Trial Balance",

            hyperlink: "#'Trial Balance'!A1",
          };

          backCell.value = backLink;

          backCell.font = {
            color: {
              argb: "0000FF",
            },

            underline: true,

            bold: true,
          };

          /* =========================
   QR CODE
========================= */

          const qrValueDetail = generateQRCodeValue({
            id: row.id_coa,

            sumber_modul: "TRIAL_BALANCE",

            nilai_transaksi: Number(row.saldo),

            tanggal_transaksi: new Date().toISOString(),
          });

          const qrImageDetail = await QRCode.toDataURL(qrValueDetail);

          const imageIdDetail = workbook.addImage({
            base64: qrImageDetail,

            extension: "png",
          });

          detailSheet.addImage(imageIdDetail, {
            tl: {
              col: 9,
              row: 11,
            },

            ext: {
              width: 90,
              height: 90,
            },
          });

          addSignature(detailSheet, detailRow + 6);

          currentRow++;
        }
      }
    }

    /* =========================
   SUMMARY
========================= */

    const jumlahCoa = rows.length;
    const selisih = totalDebit - totalKredit;

    sheet.getCell(`A${currentRow}`).value = "RINGKASAN";
    sheet.getCell(`A${currentRow}`).font = {
      bold: true,
      size: 12,
    };

    currentRow++;

    sheet.getCell(`A${currentRow}`).value = "Jumlah COA";
    sheet.getCell(`B${currentRow}`).value = jumlahCoa;

    currentRow++;

    sheet.getCell(`A${currentRow}`).value = "Total Debit";
    sheet.getCell(`B${currentRow}`).value = totalDebit;
    sheet.getCell(`B${currentRow}`).numFmt = '"Rp" #,##0;[Red]("Rp" #,##0)';

    currentRow++;

    sheet.getCell(`A${currentRow}`).value = "Total Kredit";
    sheet.getCell(`B${currentRow}`).value = totalKredit;
    sheet.getCell(`B${currentRow}`).numFmt = '"Rp" #,##0;[Red]("Rp" #,##0)';

    currentRow++;

    sheet.getCell(`A${currentRow}`).value = "Selisih";
    sheet.getCell(`B${currentRow}`).value = selisih;
    sheet.getCell(`B${currentRow}`).numFmt = '"Rp" #,##0;[Red]("Rp" #,##0)';

    currentRow += 2;

    /* =========================
       TOTAL
    ========================= */

    sheet.getCell(`A${currentRow}`).value = "TOTAL";

    sheet.getCell(`D${currentRow}`).value = totalDebit;

    sheet.getCell(`E${currentRow}`).value = totalKredit;

    sheet.getCell(`F${currentRow}`).value =
      totalDebit > totalKredit ? totalDebit - totalKredit : "";

    sheet.getCell(`G${currentRow}`).value =
      totalKredit > totalDebit ? totalKredit - totalDebit : "";

    for (let col = 1; col <= 7; col++) {
      const cell = sheet.getCell(currentRow, col);

      cell.font = {
        bold: true,
      };

      cell.fill = {
        type: "pattern",

        pattern: "solid",

        fgColor: {
          argb: "FFF2CC",
        },
      };

      cell.border = {
        top: {
          style: "thin",
        },

        bottom: {
          style: "thin",
        },
      };

      cell.numFmt = '"Rp" #,##0;[Red]("Rp" #,##0)';
    }

    /* =========================
       MAIN QR
    ========================= */

    const qrValue = generateQRCodeValue({
      id: rows.length,

      sumber_modul: "TRIAL_BALANCE",

      nilai_transaksi: totalDebit,

      tanggal_transaksi: new Date().toISOString(),
    });

    const qrImage = await QRCode.toDataURL(qrValue);

    const imageId = workbook.addImage({
      base64: qrImage,

      extension: "png",
    });

    sheet.addImage(imageId, {
      tl: {
        col: 8,
        row: currentRow + 2,
      },

      ext: {
        width: 100,
        height: 100,
      },
    });

    /* =========================
       SIGNATURE
    ========================= */

    addSignature(sheet, currentRow + 8);

    /* =========================
       EXPORT
    ========================= */

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,

      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition": 'attachment; filename="trial-balance.xlsx"',
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: (error as Error).message,
      },
      {
        status: 500,
      },
    );
  }
}
