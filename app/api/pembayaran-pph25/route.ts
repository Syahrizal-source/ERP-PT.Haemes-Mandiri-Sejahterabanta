import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  pembayaranPph25Schema,
  type PembayaranPph25Input,
} from "@/lib/validators/pembayaran-pph25";
import { getCoaPembayaranPph25 } from "@/lib/accounting/getcoamapping";
import { postPembayaranPph25 } from "@/lib/accounting/postPembayaranPph25";

interface PembayaranPph25Row {
  id: number;
  tanggal: string;
  id_pph25: number;
  nominal: number;
  keterangan: string;
  id_coa_kas: number;
  id_jurnal: number | null;
  created_at: string;
}

interface Pph25Row {
  id: number;
  tahun: number;
  bulan: number;
  nilai_angsuran: number;
  tanggal_setor: string | null;
  tanggal_transaksi: string;
  keterangan: string | null;
  id_jurnal: number | null;
  created_at: string;
}

interface CoaRow {
  id_coa: number;
  kode: string;
  nama: string;
  aktif: boolean;
  is_cash: boolean;
  is_header: boolean;
}

const PPH25_HUTANG_COA_ID = 2508;
const PPH25_KAS_HEADER_COA_ID = 3;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function GET(): Promise<NextResponse> {
  try {
    const { data: paymentData, error: paymentError } = await db
      .from("pembayaran_pph25")
      .select(
        "id, tanggal, id_pph25, nominal, keterangan, id_coa_kas, id_jurnal, created_at",
      )
      .order("tanggal", { ascending: false })
      .order("id", { ascending: false });

    if (paymentError)
      throw new Error(
        `Gagal mengambil pembayaran PPh25: ${paymentError.message}`,
      );

    const rows: PembayaranPph25Row[] = (paymentData ?? []).map((row) => ({
      id: Number(row.id),
      tanggal: String(row.tanggal),
      id_pph25: Number(row.id_pph25),
      nominal: Number(row.nominal),
      keterangan: String(row.keterangan ?? ""),
      id_coa_kas: Number(row.id_coa_kas),
      id_jurnal: row.id_jurnal === null ? null : Number(row.id_jurnal),
      created_at: String(row.created_at ?? ""),
    }));

    const pph25Ids = [
      ...new Set(
        rows
          .map((row) => row.id_pph25)
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];
    const coaIds = [
      ...new Set(
        rows
          .map((row) => row.id_coa_kas)
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];

    const pph25Map = new Map<number, Pph25Row>();
    if (pph25Ids.length > 0) {
      const { data, error } = await db
        .from("pph25")
        .select(
          "id, tahun, bulan, nilai_angsuran, tanggal_setor, tanggal_transaksi, keterangan, id_jurnal, created_at",
        )
        .in("id", pph25Ids);
      if (error)
        throw new Error(`Gagal mengambil data PPh25: ${error.message}`);

      for (const row of data ?? []) {
        pph25Map.set(Number(row.id), {
          id: Number(row.id),
          tahun: Number(row.tahun),
          bulan: Number(row.bulan),
          nilai_angsuran: Number(row.nilai_angsuran ?? 0),
          tanggal_setor:
            row.tanggal_setor === null ? null : String(row.tanggal_setor),
          tanggal_transaksi: String(row.tanggal_transaksi ?? ""),
          keterangan: row.keterangan === null ? null : String(row.keterangan),
          id_jurnal: row.id_jurnal === null ? null : Number(row.id_jurnal),
          created_at: String(row.created_at ?? ""),
        });
      }
    }

    const coaMap = new Map<number, CoaRow>();
    if (coaIds.length > 0) {
      const { data, error } = await db
        .from("coa")
        .select("id_coa, kode, nama, aktif, is_cash, is_header")
        .in("id_coa", coaIds);
      if (error)
        throw new Error(
          `Gagal mengambil COA pembayaran PPh25: ${error.message}`,
        );

      for (const row of data ?? []) {
        coaMap.set(Number(row.id_coa), {
          id_coa: Number(row.id_coa),
          kode: String(row.kode ?? ""),
          nama: String(row.nama ?? ""),
          aktif: row.aktif === true,
          is_cash: row.is_cash === true,
          is_header: row.is_header === true,
        });
      }
    }

    const totalPembayaranMap = new Map<number, number>();
    for (const payment of rows) {
      totalPembayaranMap.set(
        payment.id_pph25,
        (totalPembayaranMap.get(payment.id_pph25) ?? 0) + payment.nominal,
      );
    }

    const result = rows.map((payment) => {
      const pph25 = pph25Map.get(payment.id_pph25) ?? null;
      const coa = coaMap.get(payment.id_coa_kas) ?? null;
      const totalPembayaran = totalPembayaranMap.get(payment.id_pph25) ?? 0;
      const nilaiAngsuran = Number(pph25?.nilai_angsuran ?? 0);
      const sisa = Math.max(nilaiAngsuran - totalPembayaran, 0);
      const status =
        sisa <= 0 ? "PAID" : totalPembayaran > 0 ? "PARTIAL" : "UNPAID";

      return {
        ...payment,
        pph25,
        coa_kas: coa,
        nilai_angsuran: nilaiAngsuran,
        total_pembayaran: totalPembayaran,
        sisa,
        status,
        status_label:
          status === "PAID"
            ? "Lunas"
            : status === "PARTIAL"
              ? "Sebagian"
              : "Belum Dibayar",
      };
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("GET PEMBAYARAN PPH25 ERROR:", error);
    return NextResponse.json(
      { error: errorMessage(error, "Gagal mengambil data pembayaran PPh25") },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let paymentId: number | null = null;

  try {
    const body: unknown = await req.json();
    const parsed = pembayaranPph25Schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Data pembayaran PPh25 tidak valid",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const input: PembayaranPph25Input = parsed.data;

    const coaPembayaran = await getCoaPembayaranPph25(input.id_coa_kas);
    if (coaPembayaran.id_coa_hutang !== PPH25_HUTANG_COA_ID) {
      throw new Error(
        `COA hutang PPh25 tidak sesuai. Diperoleh id_coa=${coaPembayaran.id_coa_hutang}, wajib ${PPH25_HUTANG_COA_ID} - 21305 Hutang Pajak PPh25.`,
      );
    }
    if (coaPembayaran.id_coa_kas === PPH25_KAS_HEADER_COA_ID) {
      throw new Error(
        "COA 3 - 11100 Kas adalah HEADER. Gunakan COA kas/bank DETAIL.",
      );
    }

    const { data: coaKas, error: coaKasError } = await db
      .from("coa")
      .select(
        "id_coa, kode, nama, aktif, is_cash, is_header, tipe, normal_balance",
      )
      .eq("id_coa", input.id_coa_kas)
      .maybeSingle();

    if (coaKasError)
      throw new Error(`Gagal memeriksa COA kas/bank: ${coaKasError.message}`);
    if (!coaKas) {
      return NextResponse.json(
        { error: "COA kas/bank yang dipilih tidak ditemukan" },
        { status: 400 },
      );
    }
    if (!coaKas.aktif) {
      return NextResponse.json(
        { error: "COA kas/bank yang dipilih sudah tidak aktif" },
        { status: 400 },
      );
    }
    if (!coaKas.is_cash) {
      return NextResponse.json(
        { error: "COA pembayaran harus merupakan COA kas/bank" },
        { status: 400 },
      );
    }
    if (coaKas.is_header || coaKas.id_coa === PPH25_KAS_HEADER_COA_ID) {
      return NextResponse.json(
        {
          error:
            "COA kas/bank HEADER tidak boleh digunakan untuk pembayaran PPh25",
        },
        { status: 400 },
      );
    }
    if (coaKas.tipe !== "ASET") {
      return NextResponse.json(
        { error: "COA kas/bank pembayaran harus bertipe ASET" },
        { status: 400 },
      );
    }
    if (coaKas.normal_balance !== "DEBIT") {
      return NextResponse.json(
        {
          error: "COA kas/bank pembayaran harus memiliki normal balance DEBIT",
        },
        { status: 400 },
      );
    }

    const { data: pph25, error: pph25Error } = await db
      .from("pph25")
      .select(
        "id, tahun, bulan, nilai_angsuran, tanggal_setor, tanggal_transaksi, keterangan, id_jurnal, created_at",
      )
      .eq("id", input.id_pph25)
      .maybeSingle();

    if (pph25Error)
      throw new Error(`Gagal memeriksa PPh25: ${pph25Error.message}`);
    if (!pph25) {
      return NextResponse.json(
        { error: "Data PPh25 tidak ditemukan" },
        { status: 404 },
      );
    }

    const nilaiAngsuran = Number(pph25.nilai_angsuran);
    if (!Number.isFinite(nilaiAngsuran) || nilaiAngsuran <= 0) {
      return NextResponse.json(
        { error: "Nilai angsuran PPh25 tidak valid atau bernilai 0" },
        { status: 400 },
      );
    }

    const { data: previousPayments, error: previousError } = await db
      .from("pembayaran_pph25")
      .select("id, nominal")
      .eq("id_pph25", input.id_pph25);

    if (previousError) {
      throw new Error(
        `Gagal menghitung pembayaran PPh25 sebelumnya: ${previousError.message}`,
      );
    }

    const totalSebelumnya = (previousPayments ?? []).reduce(
      (total, row) => total + Number(row.nominal ?? 0),
      0,
    );
    const sisa = Math.max(nilaiAngsuran - totalSebelumnya, 0);

    if (sisa <= 0) {
      return NextResponse.json(
        {
          error: "PPh25 sudah lunas",
          nilai_angsuran: nilaiAngsuran,
          total_pembayaran: totalSebelumnya,
          sisa: 0,
        },
        { status: 400 },
      );
    }
    if (input.nominal > sisa + 0.01) {
      return NextResponse.json(
        {
          error: "Pembayaran PPh25 melebihi sisa kewajiban",
          nilai_angsuran: nilaiAngsuran,
          total_pembayaran: totalSebelumnya,
          sisa,
          nominal_diminta: input.nominal,
        },
        { status: 400 },
      );
    }

    const { data: payment, error: insertError } = await db
      .from("pembayaran_pph25")
      .insert({
        tanggal: input.tanggal,
        id_pph25: input.id_pph25,
        nominal: input.nominal,
        keterangan: input.keterangan,
        id_coa_kas: input.id_coa_kas,
      })
      .select(
        "id, tanggal, id_pph25, nominal, keterangan, id_coa_kas, id_jurnal, created_at",
      )
      .single();

    if (insertError || !payment) {
      throw new Error(
        insertError?.message ?? "Gagal menyimpan pembayaran PPh25",
      );
    }
    paymentId = Number(payment.id);

    let jurnalId: number;
    try {
      jurnalId = await postPembayaranPph25(
        input.tanggal,
        `BYR-PPH25-${payment.id}`,
        input.keterangan,
        input.nominal,
        input.id_pph25,
        input.id_coa_kas,
      );
    } catch (journalError: unknown) {
      const { error: deleteError } = await db
        .from("pembayaran_pph25")
        .delete()
        .eq("id", payment.id);

      if (deleteError) {
        throw new Error(
          `Posting jurnal gagal (${errorMessage(journalError, "kesalahan tidak diketahui")}) dan rollback pembayaran juga gagal (${deleteError.message}). Periksa transaksi dengan ID ${payment.id}.`,
        );
      }
      paymentId = null;
      throw journalError;
    }

    const { data: updatedPayment, error: updateError } = await db
      .from("pembayaran_pph25")
      .update({ id_jurnal: jurnalId })
      .eq("id", payment.id)
      .select(
        "id, tanggal, id_pph25, nominal, keterangan, id_coa_kas, id_jurnal, created_at",
      )
      .single();

    if (updateError || !updatedPayment) {
      return NextResponse.json(
        {
          error:
            "Jurnal berhasil diposting, tetapi id_jurnal gagal disimpan. Jangan ulangi pembayaran sebelum pemeriksaan.",
          detail:
            updateError?.message ??
            "Data pembayaran setelah update tidak ditemukan",
          id_pembayaran: Number(payment.id),
          id_jurnal: jurnalId,
        },
        { status: 500 },
      );
    }

    const totalAkhir = totalSebelumnya + input.nominal;
    const sisaAkhir = Math.max(nilaiAngsuran - totalAkhir, 0);
    const status = sisaAkhir <= 0 ? "PAID" : "PARTIAL";

    return NextResponse.json(
      {
        message: "Pembayaran PPh25 dan jurnal berhasil dibuat",
        data: {
          ...updatedPayment,
          id_coa_hutang: PPH25_HUTANG_COA_ID,
          nilai_angsuran: nilaiAngsuran,
          total_pembayaran: totalAkhir,
          sisa: sisaAkhir,
          status,
          status_label: status === "PAID" ? "Lunas" : "Sebagian",
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("POST PEMBAYARAN PPH25 ERROR:", error);
    return NextResponse.json(
      {
        error: errorMessage(error, "Gagal memproses pembayaran PPh25"),
        ...(paymentId === null ? {} : { id_pembayaran: paymentId }),
      },
      { status: 500 },
    );
  }
}
