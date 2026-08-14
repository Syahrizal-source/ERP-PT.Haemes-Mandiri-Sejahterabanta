import { db } from "@/lib/supabase/server";
import { postJournal } from "./postJournal";
import { getCoaMappingDetail, KategoriCoa } from "./getcoamapping";
import type { JurnalLine } from "@/types/accounting";

import {
  proyekOperasionalSchema,
  ProyekOperasionalRequest,
} from "@/lib/validators/proyekOperasional";

export async function postOperasional(
  data: ProyekOperasionalRequest & {
    id_operasional: string;
  },
): Promise<number> {
  /* =========================
     VALIDASI
  ========================= */

  proyekOperasionalSchema.parse(data);

  /* =========================
     KATEGORI BIAYA
  ========================= */

  const { data: kategori, error: kategoriError } = await db
    .from("kategori_biaya_proyek")
    .select("kode")
    .eq("id", data.id_kategori)
    .single();

  if (kategoriError || !kategori) {
    throw new Error("Kategori operasional tidak ditemukan.");
  }

  const coaOperasional = await getCoaMappingDetail(
    "PROYEK",
    kategori.kode as KategoriCoa,
  );

  /* =========================
     COA LAWAN
  ========================= */

  const kategoriCoa: KategoriCoa =
    data.metode_pembayaran === "KAS"
      ? "KAS"
      : data.metode_pembayaran === "BANK"
        ? "BANK"
        : "HUTANG";

  const coaLawan = await getCoaMappingDetail("PROYEK", kategoriCoa);

  /* =========================
     TOTAL
  ========================= */

  const total = Number(data.qty) * Number(data.harga);

  if (total <= 0) {
    throw new Error("Total operasional tidak valid.");
  }

  /* =========================
     JURNAL
  ========================= */

  const lines: JurnalLine[] = [
    {
      id_coa: coaOperasional.id_coa,
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
    throw new Error("Jurnal operasional tidak balance.");
  }

  /* =========================
     POST JURNAL
  ========================= */

  const idJurnal = await postJournal({
    tanggal: data.tanggal,
    no_bukti: data.no_bukti,
    keterangan: `Operasional : ${data.keterangan ?? "-"}`,
    sumber: "PROYEK",
    modul: "PROYEK",
    ref_id: data.id_operasional,
    id_proyek: data.id_proyek,
    lines,
  });

  /* =========================
     UPDATE OPERASIONAL
  ========================= */

  const { error } = await db
    .from("proyek_operasional")
    .update({
      id_jurnal: idJurnal,
    })
    .eq("id", data.id_operasional);

  if (error) {
    throw new Error(error.message);
  }

  return idJurnal;
}
