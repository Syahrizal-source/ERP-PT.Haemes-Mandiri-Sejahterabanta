import { db } from "@/lib/supabase/server";
import { postJournal } from "./postJournal";
import { getCoaMappingDetail, KategoriCoa } from "./getcoamapping";

import type { JurnalLine } from "@/types/accounting";
import {
  proyekAlatBeratSchema,
  ProyekAlatBeratRequest,
} from "@/lib/validators/proyekAlatBerat";

export async function postProyekAlatBerat(
  data: ProyekAlatBeratRequest & {
    id_proyek_alat_berat: string;
  },
): Promise<number> {
  proyekAlatBeratSchema.parse(data);

  const { data: kategori, error } = await db
    .from("kategori_biaya_proyek")
    .select("kode")
    .eq("id", data.id_kategori)
    .single();

  if (error || !kategori) {
    throw new Error("Kategori biaya proyek tidak ditemukan.");
  }

  const coaBiaya = await getCoaMappingDetail(
    "PROYEK",
    kategori.kode as KategoriCoa,
  );

  const kategoriCoa: KategoriCoa =
    data.metode_pembayaran === "KAS"
      ? "KAS"
      : data.metode_pembayaran === "BANK"
        ? "BANK"
        : "HUTANG";

  const coaLawan = await getCoaMappingDetail("PROYEK", kategoriCoa);

  const total = Number(data.tarif_sewa_internal) * Number(data.jam_operasi);

  const lines: JurnalLine[] = [
    {
      id_coa: coaBiaya.id_coa,
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

  const idJurnal = await postJournal({
    tanggal: data.tanggal_mulai,
    no_bukti: data.no_bukti,
    keterangan: `Sewa Alat : ${data.keterangan ?? "-"}`,
    sumber: "PROYEK",
    modul: "PROYEK",
    ref_id: data.id_proyek_alat_berat,
    id_proyek: data.id_proyek,
    lines,
  });

  await db
    .from("proyek_alat_berat_konstruksi")
    .update({
      id_jurnal: idJurnal,
    })
    .eq("id", data.id_proyek_alat_berat);

  return idJurnal;
}
