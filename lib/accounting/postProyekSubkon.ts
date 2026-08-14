import { db } from "@/lib/supabase/server";
import { postJournal } from "./postJournal";
import { getCoaMappingDetail, KategoriCoa } from "./getcoamapping";
import type { JurnalLine } from "@/types/accounting";
import {
  proyekSubkonSchema,
  ProyekSubkonRequest,
} from "@/lib/validators/proyekSubkon";

export async function postProyekSubkon(
  data: ProyekSubkonRequest & {
    id_subkon: string;
  },
): Promise<number> {
  // =========================================
  // VALIDASI
  // =========================================
  proyekSubkonSchema.parse(data);

  // =========================================
  // KATEGORI SUBKON
  // =========================================
  const { data: kategori, error: kategoriError } = await db
    .from("kategori_biaya_proyek")
    .select("kode")
    .eq("id", data.id_kategori)
    .single();

  if (kategoriError || !kategori) {
    throw new Error("Kategori subkon tidak ditemukan.");
  }

  // =========================================
  // VALIDASI KATEGORI HARUS SUBKON
  // =========================================
  if (kategori.kode !== "SUBKON") {
    throw new Error(`Kategori ${kategori.kode} bukan kategori SUBKON.`);
  }

  const coaSubkon = await getCoaMappingDetail("PROYEK", "SUBKON");

  // =========================================
  // COA LAWAN
  // =========================================
  const kategoriCoa: KategoriCoa =
    data.metode_pembayaran === "KAS"
      ? "KAS"
      : data.metode_pembayaran === "BANK"
        ? "BANK"
        : "HUTANG";

  const coaLawan = await getCoaMappingDetail("PROYEK", kategoriCoa);

  // =========================================
  // NILAI SUBKON
  // =========================================
  const total = Number(data.nilai_kontrak);

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Nilai kontrak subkon harus lebih besar dari 0.");
  }

  // =========================================
  // JURNAL
  // =========================================
  const lines: JurnalLine[] = [
    {
      id_coa: coaSubkon.id_coa,
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

  // =========================================
  // VALIDASI BALANCE
  // =========================================
  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit), 0);

  const totalKredit = lines.reduce((sum, line) => sum + Number(line.kredit), 0);

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal subkon tidak balance.");
  }

  // =========================================
  // POST JURNAL
  // =========================================
  const idJurnal = await postJournal({
    tanggal: data.tanggal,
    no_bukti: data.no_bukti ?? "",
    keterangan: `Subkon : ${data.pekerjaan}`,
    sumber: "PROYEK",
    modul: "PROYEK",
    ref_id: data.id_subkon,
    id_proyek: data.id_proyek,
    lines,
  });

  // =========================================
  // UPDATE TRANSAKSI SUBKON
  // =========================================
  const { error: updateError } = await db
    .from("proyek_subkon")
    .update({
      id_jurnal: idJurnal,
    })
    .eq("id", data.id_subkon);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return idJurnal;
}
