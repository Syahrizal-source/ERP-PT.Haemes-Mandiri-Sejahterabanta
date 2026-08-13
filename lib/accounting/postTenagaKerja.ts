import { db } from "@/lib/supabase/server";

import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";

import { JurnalLine } from "@/types/accounting";
import {
  proyekTenagaKerjaSchema,
  ProyekTenagaKerjaRequest,
} from "@/lib/validators/proyekTenagaKerja";

export async function postTenagaKerja(
  data: ProyekTenagaKerjaRequest & {
    id_tenaga_kerja: string;
  },
): Promise<number> {
  /* =========================
     VALIDASI
  ========================= */

  proyekTenagaKerjaSchema.parse(data);

  /* =========================
     COA TENAGA KERJA (WIP)
  ========================= */

  const coaTenagaKerja = await getCoaMappingDetail("PROYEK", "TENAGA_KERJA");

  /* =========================
     COA LAWAN
  ========================= */

  const kategoriCoa =
    data.metode_pembayaran === "KAS"
      ? "KAS"
      : data.metode_pembayaran === "BANK"
        ? "BANK"
        : "HUTANG";

  const coaLawan = await getCoaMappingDetail("PROYEK", kategoriCoa);

  /* =========================
     TOTAL
  ========================= */

  const total = Number(data.upah);

  if (total <= 0) {
    throw new Error("Nilai upah tidak valid.");
  }

  /* =========================
     JURNAL
  ========================= */

  const lines: JurnalLine[] = [
    {
      id_coa: coaTenagaKerja.id_coa,
      debit: total,
      kredit: 0,
      id_proyek: data.id_proyek,
    },
    {
      id_coa: coaLawan.id_coa,
      debit: 0,
      kredit: total,
      id_proyek: data.id_proyek,
    },
  ];

  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit), 0);

  const totalKredit = lines.reduce((sum, line) => sum + Number(line.kredit), 0);

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal tenaga kerja tidak balance.");
  }

  /* =========================
     POST JURNAL
  ========================= */
  const noBukti = data.no_bukti ?? `TK-${data.id_tenaga_kerja.substring(0, 8)}`;

  const idJurnal = await postJournal({
    tanggal: data.tanggal_mulai,
    no_bukti: noBukti,
    keterangan: `Tenaga Kerja : ${data.nama}`,
    sumber: "PROYEK",
    modul: "PROYEK",
    ref_id: data.id_tenaga_kerja,
    id_proyek: data.id_proyek,
    lines,
  });

  /* =========================
     UPDATE TENAGA KERJA
  ========================= */

  const { error } = await db
    .from("proyek_tenaga_kerja")
    .update({
      id_jurnal: idJurnal,
    })
    .eq("id", data.id_tenaga_kerja);

  if (error) {
    throw new Error(error.message);
  }

  return idJurnal;
}
