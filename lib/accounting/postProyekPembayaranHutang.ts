import { db } from "@/lib/supabase/server";
import { postJournal } from "./postJournal";
import { getCoaMappingDetail, KategoriCoa } from "./getcoamapping";

import type { JurnalLine } from "@/types/accounting";

import {
  proyekPembayaranHutangSchema,
  ProyekPembayaranHutangRequest,
} from "@/lib/validators/proyekPembayaranHutang";

export async function postProyekPembayaranHutang(
  data: ProyekPembayaranHutangRequest & {
    id_pembayaran: string;
    no_bukti: string;
  },
): Promise<number> {
  const validated = proyekPembayaranHutangSchema.parse(data);

  // ============================================================
  // AMBIL HUTANG
  // ============================================================

  const { data: hutang, error: hutangError } = await db
    .from("proyek_hutang")
    .select(
      `
      id,
      id_proyek,
      supplier,
      nilai,
      jumlah_pembayaran,
      sisa,
      status
      `,
    )
    .eq("id", validated.id_hutang)
    .single();

  if (hutangError || !hutang) {
    throw new Error("Hutang proyek tidak ditemukan.");
  }

  // ============================================================
  // VALIDASI PEMBAYARAN
  // ============================================================

  const jumlahPembayaran = Number(validated.jumlah);
  const sisaHutang = Number(hutang.sisa);

  if (!Number.isFinite(jumlahPembayaran) || jumlahPembayaran <= 0) {
    throw new Error("Jumlah pembayaran harus lebih besar dari 0.");
  }

  if (!Number.isFinite(sisaHutang) || sisaHutang < 0) {
    throw new Error("Saldo hutang tidak valid.");
  }

  if (jumlahPembayaran > sisaHutang) {
    throw new Error(
      `Jumlah pembayaran Rp${jumlahPembayaran.toLocaleString(
        "id-ID",
      )} melebihi sisa hutang Rp${sisaHutang.toLocaleString("id-ID")}.`,
    );
  }

  if (sisaHutang <= 0) {
    throw new Error("Hutang sudah lunas dan tidak dapat dibayar lagi.");
  }

  // ============================================================
  // COA DEBIT
  //
  // PROYEK + HUTANG
  // 21010 - Hutang Proyek
  // ============================================================

  const coaHutang = await getCoaMappingDetail(
    "PROYEK",
    "HUTANG" as KategoriCoa,
  );

  // ============================================================
  // COA KREDIT
  //
  // PROYEK + METODE PEMBAYARAN
  // ============================================================

  const kategoriPembayaran: KategoriCoa =
    validated.metode === "KAS"
      ? "KAS"
      : validated.metode === "KAS_BESAR"
        ? "KAS_BESAR"
        : validated.metode === "KAS_KECIL"
          ? "KAS_KECIL"
          : "BANK";

  const coaPembayaran = await getCoaMappingDetail("PROYEK", kategoriPembayaran);

  // ============================================================
  // JURNAL
  //
  // Dr 21010 Hutang Proyek
  // Cr COA KAS/BANK
  // ============================================================

  const lines: JurnalLine[] = [
    {
      id_coa: coaHutang.id_coa,
      debit: jumlahPembayaran,
      kredit: 0,
      id_proyek: hutang.id_proyek,
    },
    {
      id_coa: coaPembayaran.id_coa,
      debit: 0,
      kredit: jumlahPembayaran,
      id_proyek: hutang.id_proyek,
    },
  ];

  // ============================================================
  // POST JOURNAL
  // ============================================================

  const idJurnal = await postJournal({
    tanggal: validated.tanggal,
    no_bukti: data.no_bukti,
    keterangan:
      validated.keterangan ??
      `Pembayaran Hutang Proyek - ${hutang.supplier ?? "-"}`,
    sumber: "PROYEK",
    modul: "PROYEK",
    ref_id: data.id_pembayaran,
    id_proyek: hutang.id_proyek,
    lines,
  });

  return idJurnal;
}
