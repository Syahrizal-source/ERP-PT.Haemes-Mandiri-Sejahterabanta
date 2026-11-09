import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";

import {
  normalizeKasArmada,
  hitungKasArmada,
  validateKasArmada,
  type KasArmadaInput,
} from "@/lib/validators/kas-armada";

import { db } from "@/lib/supabase/server";

import type { JurnalLine } from "@/types/accounting";

/**
 * ============================================================
 * GET COA KAS ARMADA SUPIR
 * ============================================================
 *
 * Setiap sopir mempunyai COA kas masing-masing.
 *
 * Contoh nama COA di database:
 *
 *   Kas Armada Supir - A36 Julham
 *   Kas Armada Supir - A37 Rendy
 *   Kas Armada Supir - A38 Misar
 *   Kas Armada Supir - A39 Bondan
 *   Kas Armada Supir - A48 Rapen
 *
 * Input transaksi hanya berisi nama sopir:
 *
 *   Julham
 *   Rendy
 *   Rapen
 *
 * Pencarian menggunakan nama sopir sebagai suffix,
 * bukan exact match seluruh nama COA.
 *
 * COA tidak di-hardcode.
 *
 * Validasi:
 *   - COA harus ditemukan
 *   - COA harus aktif
 *   - COA harus is_cash
 *   - COA harus leaf / bukan header
 *   - Nama sopir harus menghasilkan tepat satu COA
 * ============================================================
 */
async function getCoaKasArmadaSupir(
  sopir: string,
): Promise<{ id_coa: number }> {
  const namaSopir = sopir.trim();

  if (!namaSopir) {
    throw new Error("Nama sopir wajib diisi.");
  }

  /**
   * Format COA:
   *
   * Kas Armada Supir - [kode kendaraan] [nama sopir]
   *
   * Contoh:
   *
   * Kas Armada Supir - A48 Rapen
   */
  const prefix = "Kas Armada Supir - ";
  const pattern = `${prefix}%${namaSopir}`;

  const { data, error } = await db
    .from("coa")
    .select("id_coa, kode, nama, aktif, is_cash, is_header")
    .ilike("nama", pattern);

  if (error) {
    throw new Error(
      `Gagal mengambil COA Kas Armada Supir ${namaSopir}: ${error.message}`,
    );
  }

  if (!data || data.length === 0) {
    throw new Error(
      `COA Kas Armada Supir tidak ditemukan untuk sopir: ${namaSopir}. ` +
        `Format COA yang dicari: ${prefix}[kode kendaraan] ${namaSopir}.`,
    );
  }

  /**
   * Jangan memilih secara sembarangan apabila terdapat
   * lebih dari satu COA yang cocok.
   */
  if (data.length > 1) {
    const daftarCoa = data.map((coa) => `${coa.kode} - ${coa.nama}`).join("; ");

    throw new Error(
      `Ditemukan lebih dari satu COA Kas Armada Supir untuk "${namaSopir}": ` +
        `${daftarCoa}. Mapping sopir harus dibuat unik sebelum transaksi diposting.`,
    );
  }

  const coa = data[0];

  if (!coa) {
    throw new Error(
      `COA Kas Armada Supir tidak valid untuk sopir: ${namaSopir}.`,
    );
  }

  if (!coa.aktif) {
    throw new Error(
      `COA Kas Armada Supir inactive: ${coa.kode} - ${coa.nama}.`,
    );
  }

  if (!coa.is_cash) {
    throw new Error(`COA ${coa.kode} - ${coa.nama} bukan akun kas.`);
  }

  if (coa.is_header) {
    throw new Error(
      `COA ${coa.kode} - ${coa.nama} adalah akun header dan tidak boleh digunakan untuk posting.`,
    );
  }

  const idCoa = Number(coa.id_coa);

  if (!Number.isInteger(idCoa) || idCoa <= 0) {
    throw new Error(`ID COA Kas Armada Supir tidak valid: ${coa.id_coa}.`);
  }

  return {
    id_coa: idCoa,
  };
}

/**
 * ============================================================
 * POST KAS ARMADA
 * ============================================================
 *
 * Flow accounting:
 *
 * PENERIMAAN:
 *   Dr Kas Armada Supir
 *   Cr Kas Kecil Bu Butet
 *
 * PENGEMBALIAN:
 *   Dr Kas Kecil Bu Butet
 *   Cr Kas Armada Supir
 *
 * PENGELUARAN:
 *   Dr Beban Armada
 *   Cr Kas Armada Supir
 *
 * KASBON:
 *   Dr Beban Armada
 *   Cr Kas Armada Supir
 *
 * Setelah seluruh transaksi dibentuk, detail jurnal
 * DIGABUNG berdasarkan COA.
 *
 * Tujuannya agar satu transaksi Kas Armada tidak menghasilkan
 * banyak baris jurnal untuk COA yang sama.
 *
 * Contoh:
 *
 *   Penerimaan   1.000.000
 *   Pengembalian   500.000
 *   Pengeluaran    500.000
 *   Kasbon         500.000
 *
 * Tidak dibuat 8 detail.
 *
 * Tetapi dinet:
 *
 *   Kas Armada Supir  -> Kredit 500.000
 *   Kas Kecil Butet   -> Kredit 500.000
 *   Beban Armada      -> Debit  1.000.000
 *
 * Total tetap balance.
 *
 * Pendapatan Armada TIDAK digunakan.
 *
 * COA 41101 Pendapatan Armada sudah inactive.
 *
 * Kas Armada Supir menggunakan COA detail berdasarkan sopir,
 * bukan COA header 11110 / 11111.
 * ============================================================
 */
export async function postKasArmada(input: KasArmadaInput): Promise<number> {
  /* ==========================================================
     1. NORMALIZE + VALIDATE
     ========================================================== */

  const data = normalizeKasArmada(input);

  validateKasArmada(data);

  /* ==========================================================
     2. HITUNG
     ========================================================== */

  const hitung = hitungKasArmada(data);

  /**
   * Tetap jalankan kalkulasi existing.
   */
  void hitung;

  /* ==========================================================
     3. VALIDASI NILAI TRANSAKSI
     ========================================================== */

  const penerimaan = data.penerimaan;
  const pengembalian = data.pengembalian;
  const pengeluaran = data.pengeluaran;
  const kasbon = data.kasbon;

  const nilaiTransaksi = [penerimaan, pengembalian, pengeluaran, kasbon];

  for (const nilai of nilaiTransaksi) {
    if (!Number.isFinite(nilai)) {
      throw new Error("Nilai transaksi Kas Armada tidak valid.");
    }

    if (nilai < 0) {
      throw new Error("Nilai transaksi Kas Armada tidak boleh negatif.");
    }
  }

  if (penerimaan <= 0 && pengembalian <= 0 && pengeluaran <= 0 && kasbon <= 0) {
    throw new Error("Tidak ada transaksi Kas Armada.");
  }

  /* ==========================================================
     4. AMBIL COA KAS UTAMA
     ========================================================== */

  /**
   * KAS_ARMADA / KAS_ARMADA_BU_BUTET
   *
   * -> 1101.03.04
   * -> Kas Kecil Bu Butet
   */
  const coaKasBuButet = await getCoaMappingDetail(
    "KAS_ARMADA",
    "KAS_ARMADA_BU_BUTET",
  );

  /* ==========================================================
     5. AMBIL COA BEBAN ARMADA
     ========================================================== */

  /**
   * KAS_ARMADA / BEBAN
   *
   * -> 61101
   * -> Beban Armada
   */
  const coaBeban = await getCoaMappingDetail("KAS_ARMADA", "BEBAN");

  /* ==========================================================
     6. AMBIL COA KAS SUPIR
     ========================================================== */

  /**
   * Tidak menggunakan:
   *
   * KAS_ARMADA / KAS -> 11110
   *
   * karena 11110 adalah header.
   *
   * Tidak menggunakan:
   *
   * KAS_ARMADA / PENDAPATAN -> 41101
   *
   * karena 41101 sudah inactive.
   *
   * Contoh:
   *
   * Julham
   * ->
   * Kas Armada Supir - A36 Julham
   */
  const coaKasSupir = await getCoaKasArmadaSupir(data.sopir);

  /* ==========================================================
     7. HITUNG NET JURNAL PER COA
     ========================================================== */

  /**
   * Kita tidak langsung membuat banyak JurnalLine.
   *
   * Semua nilai terlebih dahulu dikumpulkan berdasarkan
   * id_coa.
   *
   * Struktur internal:
   *
   * id_coa -> debit / kredit
   */

  type CoaAccumulator = {
    debit: number;
    kredit: number;
  };

  const accumulator = new Map<number, CoaAccumulator>();

  const tambahDebit = (idCoa: number, nilai: number): void => {
    const existing = accumulator.get(idCoa);

    if (existing) {
      existing.debit += nilai;
      return;
    }

    accumulator.set(idCoa, {
      debit: nilai,
      kredit: 0,
    });
  };

  const tambahKredit = (idCoa: number, nilai: number): void => {
    const existing = accumulator.get(idCoa);

    if (existing) {
      existing.kredit += nilai;
      return;
    }

    accumulator.set(idCoa, {
      debit: 0,
      kredit: nilai,
    });
  };

  /* ==========================================================
     7A. PENERIMAAN
     ========================================================== */

  /**
   * Dr Kas Armada Supir
   * Cr Kas Kecil Bu Butet
   */
  if (penerimaan > 0) {
    tambahDebit(coaKasSupir.id_coa, penerimaan);

    tambahKredit(coaKasBuButet.id_coa, penerimaan);
  }

  /* ==========================================================
     7B. PENGEMBALIAN
     ========================================================== */

  /**
   * Dr Kas Kecil Bu Butet
   * Cr Kas Armada Supir
   */
  if (pengembalian > 0) {
    tambahDebit(coaKasBuButet.id_coa, pengembalian);

    tambahKredit(coaKasSupir.id_coa, pengembalian);
  }

  /* ==========================================================
     7C. PENGELUARAN
     ========================================================== */

  /**
   * Dr Beban Armada
   * Cr Kas Armada Supir
   */
  if (pengeluaran > 0) {
    tambahDebit(coaBeban.id_coa, pengeluaran);

    tambahKredit(coaKasSupir.id_coa, pengeluaran);
  }

  /* ==========================================================
     7D. KASBON
     ========================================================== */

  /**
   * Untuk saat ini tetap mengikuti business logic existing:
   *
   * Dr Beban Armada
   * Cr Kas Armada Supir
   */
  if (kasbon > 0) {
    tambahDebit(coaBeban.id_coa, kasbon);

    tambahKredit(coaKasSupir.id_coa, kasbon);
  }

  /* ==========================================================
     8. NETTING DEBIT / KREDIT PER COA
     ========================================================== */

  const lines: JurnalLine[] = [];

  for (const [idCoa, value] of accumulator.entries()) {
    const debit = value.debit;
    const kredit = value.kredit;

    if (!Number.isFinite(debit) || !Number.isFinite(kredit)) {
      throw new Error("Nilai jurnal Kas Armada tidak valid.");
    }

    if (debit < 0 || kredit < 0) {
      throw new Error("Nilai jurnal Kas Armada tidak boleh negatif.");
    }

    /**
     * Kalau satu COA memiliki debit dan kredit sekaligus,
     * lakukan netting.
     *
     * Contoh:
     *
     * Debit  1.000.000
     * Kredit   500.000
     *
     * menjadi:
     *
     * Debit 500.000
     */
    if (debit > kredit) {
      const netDebit = debit - kredit;

      if (netDebit > 0) {
        lines.push({
          id_coa: idCoa,
          debit: netDebit,
          kredit: 0,
        });
      }
    } else if (kredit > debit) {
      const netKredit = kredit - debit;

      if (netKredit > 0) {
        lines.push({
          id_coa: idCoa,
          debit: 0,
          kredit: netKredit,
        });
      }
    }

    /**
     * Jika debit === kredit, COA tersebut tidak perlu
     * masuk ke detail jurnal karena saldonya net zero.
     */
  }

  /* ==========================================================
     9. VALIDASI DETAIL JURNAL
     ========================================================== */

  if (lines.length === 0) {
    throw new Error("Tidak ada detail jurnal Kas Armada setelah netting.");
  }

  for (const line of lines) {
    if (!Number.isInteger(line.id_coa) || line.id_coa <= 0) {
      throw new Error("COA jurnal Kas Armada tidak valid.");
    }

    if (!Number.isFinite(line.debit) || line.debit < 0) {
      throw new Error("Nilai debit jurnal Kas Armada tidak valid.");
    }

    if (!Number.isFinite(line.kredit) || line.kredit < 0) {
      throw new Error("Nilai kredit jurnal Kas Armada tidak valid.");
    }

    if (line.debit > 0 && line.kredit > 0) {
      throw new Error(
        "Satu detail jurnal tidak boleh memiliki debit dan kredit sekaligus.",
      );
    }

    if (line.debit === 0 && line.kredit === 0) {
      throw new Error("Detail jurnal Kas Armada tidak boleh bernilai nol.");
    }
  }

  /* ==========================================================
     10. VALIDASI BALANCE
     ========================================================== */

  const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);

  const totalKredit = lines.reduce((sum, line) => sum + line.kredit, 0);

  if (!Number.isFinite(totalDebit)) {
    throw new Error("Total debit jurnal Kas Armada tidak valid.");
  }

  if (!Number.isFinite(totalKredit)) {
    throw new Error("Total kredit jurnal Kas Armada tidak valid.");
  }

  if (totalDebit <= 0 || totalKredit <= 0) {
    throw new Error("Jurnal Kas Armada harus memiliki debit dan kredit.");
  }

  const selisih = Math.abs(totalDebit - totalKredit);

  if (selisih > 0.01) {
    throw new Error(
      `Jurnal Kas Armada tidak balance. Debit: ${totalDebit}, Kredit: ${totalKredit}.`,
    );
  }

  /* ==========================================================
     11. POST JURNAL
     ========================================================== */

  const jurnalId = await postJournal({
    tanggal: data.tanggal,
    no_bukti: `KAS-ARMADA-${Date.now()}`,
    keterangan: `Kas Armada - ${data.sopir}`,
    sumber: "KAS_ARMADA",
    modul: "KAS_ARMADA",
    lines,
  });

  return jurnalId;
}
