import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  pembayaranPph23Schema,
  type PembayaranPph23Input,
} from "@/lib/validators/pembayaran-pph23";
import { getCoaPembayaranPph23 } from "@/lib/accounting/getcoamapping";
import { postPembayaranPph23 } from "@/lib/accounting/postPembayaranPph23";

interface PembayaranPph23Row {
  id: number;
  tanggal: string;
  id_pph23: number;
  nominal: number;
  keterangan: string;
  id_coa_kas: number;
  id_jurnal: number | null;
  created_at: string;
}

interface Pph23Row {
  id: number;
  id_vendor: number;
  jenis_jasa: string;
  nilai_transaksi: number;
  tarif_pph23: number;
  pph23_terutang: number;
  tanggal_transaksi: string;
  id_periode: number | null;
}

interface VendorRow {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
  npwp: string | null;
}

interface CoaRow {
  id_coa: number;
  kode: string;
  nama: string;
  aktif: boolean;
  is_cash: boolean;
  is_header: boolean;
}

const PPH23_HUTANG_COA_ID = 55;
const PPH23_KAS_HEADER_COA_ID = 3;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function GET(): Promise<NextResponse> {
  try {
    const { data: paymentData, error: paymentError } = await db
      .from("pembayaran_pph23")
      .select(
        "id, tanggal, id_pph23, nominal, keterangan, id_coa_kas, id_jurnal, created_at",
      )
      .order("tanggal", { ascending: false })
      .order("id", { ascending: false });

    if (paymentError)
      throw new Error(
        `Gagal mengambil pembayaran PPh23: ${paymentError.message}`,
      );

    const rows: PembayaranPph23Row[] = (paymentData ?? []).map((row) => ({
      id: Number(row.id),
      tanggal: String(row.tanggal),
      id_pph23: Number(row.id_pph23),
      nominal: Number(row.nominal),
      keterangan: String(row.keterangan ?? ""),
      id_coa_kas: Number(row.id_coa_kas),
      id_jurnal: row.id_jurnal === null ? null : Number(row.id_jurnal),
      created_at: String(row.created_at ?? ""),
    }));

    const pph23Ids = [
      ...new Set(
        rows
          .map((row) => row.id_pph23)
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

    const pph23Map = new Map<number, Pph23Row>();
    if (pph23Ids.length > 0) {
      const { data, error } = await db
        .from("pph23")
        .select(
          "id, id_vendor, jenis_jasa, nilai_transaksi, tarif_pph23, pph23_terutang, tanggal_transaksi, id_periode",
        )
        .in("id", pph23Ids);
      if (error)
        throw new Error(`Gagal mengambil data PPh23: ${error.message}`);

      for (const row of data ?? []) {
        pph23Map.set(Number(row.id), {
          id: Number(row.id),
          id_vendor: Number(row.id_vendor),
          jenis_jasa: String(row.jenis_jasa ?? ""),
          nilai_transaksi: Number(row.nilai_transaksi ?? 0),
          tarif_pph23: Number(row.tarif_pph23 ?? 0),
          pph23_terutang: Number(row.pph23_terutang ?? 0),
          tanggal_transaksi: String(row.tanggal_transaksi ?? ""),
          id_periode: row.id_periode === null ? null : Number(row.id_periode),
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
          `Gagal mengambil COA pembayaran PPh23: ${error.message}`,
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

    const vendorIds = [
      ...new Set(
        [...pph23Map.values()]
          .map((row) => row.id_vendor)
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];
    const vendorMap = new Map<number, VendorRow>();

    if (vendorIds.length > 0) {
      const { data, error } = await db
        .from("vendors")
        .select("id, kode_vendor, nama_vendor, npwp")
        .in("id", vendorIds);
      if (error)
        throw new Error(`Gagal mengambil vendor PPh23: ${error.message}`);

      for (const row of data ?? []) {
        vendorMap.set(Number(row.id), {
          id: Number(row.id),
          kode_vendor:
            row.kode_vendor === null ? null : String(row.kode_vendor),
          nama_vendor: String(row.nama_vendor ?? ""),
          npwp: row.npwp === null ? null : String(row.npwp),
        });
      }
    }

    const totalPembayaranMap = new Map<number, number>();
    for (const payment of rows) {
      totalPembayaranMap.set(
        payment.id_pph23,
        (totalPembayaranMap.get(payment.id_pph23) ?? 0) + payment.nominal,
      );
    }

    const result = rows.map((payment) => {
      const pph23 = pph23Map.get(payment.id_pph23) ?? null;
      const vendor = pph23 ? (vendorMap.get(pph23.id_vendor) ?? null) : null;
      const coa = coaMap.get(payment.id_coa_kas) ?? null;
      const totalPembayaran = totalPembayaranMap.get(payment.id_pph23) ?? 0;
      const pph23Terutang = Number(pph23?.pph23_terutang ?? 0);
      const sisa = Math.max(pph23Terutang - totalPembayaran, 0);
      const status =
        sisa <= 0 ? "PAID" : totalPembayaran > 0 ? "PARTIAL" : "UNPAID";

      return {
        ...payment,
        pph23,
        vendor,
        coa_kas: coa,
        pph23_terutang: pph23Terutang,
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
    console.error("GET PEMBAYARAN PPH23 ERROR:", error);
    return NextResponse.json(
      { error: errorMessage(error, "Gagal mengambil data pembayaran PPh23") },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let paymentId: number | null = null;

  try {
    const body: unknown = await req.json();
    const parsed = pembayaranPph23Schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Data pembayaran PPh23 tidak valid",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const input: PembayaranPph23Input = parsed.data;

    const coaPembayaran = await getCoaPembayaranPph23(input.id_coa_kas);
    if (coaPembayaran.id_coa_hutang !== PPH23_HUTANG_COA_ID) {
      throw new Error(
        `COA hutang PPh23 tidak sesuai. Diperoleh id_coa=${coaPembayaran.id_coa_hutang}, wajib ${PPH23_HUTANG_COA_ID} - 21303 Hutang Pajak PPh 23.`,
      );
    }
    if (coaPembayaran.id_coa_kas === PPH23_KAS_HEADER_COA_ID) {
      throw new Error(
        "COA 3 - 11100 Kas adalah HEADER. Gunakan COA kas/bank DETAIL.",
      );
    }

    const { data: pph23, error: pph23Error } = await db
      .from("pph23")
      .select(
        "id, id_vendor, jenis_jasa, nilai_transaksi, tarif_pph23, pph23_terutang, tanggal_transaksi, id_periode",
      )
      .eq("id", input.id_pph23)
      .maybeSingle();

    if (pph23Error)
      throw new Error(`Gagal memeriksa PPh23: ${pph23Error.message}`);
    if (!pph23) {
      return NextResponse.json(
        { error: "Data PPh23 tidak ditemukan" },
        { status: 404 },
      );
    }

    const pph23Terutang = Number(pph23.pph23_terutang);
    if (!Number.isFinite(pph23Terutang) || pph23Terutang <= 0) {
      return NextResponse.json(
        { error: "Nilai PPh23 terutang tidak valid" },
        { status: 400 },
      );
    }

    const { data: previousPayments, error: previousError } = await db
      .from("pembayaran_pph23")
      .select("id, nominal")
      .eq("id_pph23", input.id_pph23);

    if (previousError)
      throw new Error(
        `Gagal menghitung pembayaran PPh23 sebelumnya: ${previousError.message}`,
      );

    const totalSebelumnya = (previousPayments ?? []).reduce(
      (total, row) => total + Number(row.nominal ?? 0),
      0,
    );
    const sisa = Math.max(pph23Terutang - totalSebelumnya, 0);

    if (sisa <= 0) {
      return NextResponse.json(
        {
          error: "PPh23 sudah lunas",
          pph23_terutang: pph23Terutang,
          total_pembayaran: totalSebelumnya,
          sisa: 0,
        },
        { status: 400 },
      );
    }
    if (input.nominal > sisa + 0.01) {
      return NextResponse.json(
        {
          error: "Pembayaran PPh23 melebihi sisa kewajiban",
          pph23_terutang: pph23Terutang,
          total_pembayaran: totalSebelumnya,
          sisa,
          nominal_diminta: input.nominal,
        },
        { status: 400 },
      );
    }

    const { data: payment, error: insertError } = await db
      .from("pembayaran_pph23")
      .insert({
        tanggal: input.tanggal,
        id_pph23: input.id_pph23,
        nominal: input.nominal,
        keterangan: input.keterangan,
        id_coa_kas: input.id_coa_kas,
      })
      .select(
        "id, tanggal, id_pph23, nominal, keterangan, id_coa_kas, id_jurnal, created_at",
      )
      .single();

    if (insertError || !payment) {
      throw new Error(
        insertError?.message ?? "Gagal menyimpan pembayaran PPh23",
      );
    }
    paymentId = Number(payment.id);

    let jurnalId: number;
    try {
      jurnalId = await postPembayaranPph23(
        input.tanggal,
        `BYR-PPH23-${payment.id}`,
        input.keterangan,
        input.nominal,
        input.id_pph23,
        input.id_coa_kas,
      );
    } catch (journalError: unknown) {
      const { error: deleteError } = await db
        .from("pembayaran_pph23")
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
      .from("pembayaran_pph23")
      .update({ id_jurnal: jurnalId })
      .eq("id", payment.id)
      .select(
        "id, tanggal, id_pph23, nominal, keterangan, id_coa_kas, id_jurnal, created_at",
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
    const sisaAkhir = Math.max(pph23Terutang - totalAkhir, 0);

    return NextResponse.json(
      {
        message: "Pembayaran PPh23 dan jurnal berhasil dibuat",
        data: {
          ...updatedPayment,
          id_coa_hutang: PPH23_HUTANG_COA_ID,
          pph23_terutang: pph23Terutang,
          total_pembayaran: totalAkhir,
          sisa: sisaAkhir,
          status: sisaAkhir <= 0 ? "PAID" : "PARTIAL",
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("POST PEMBAYARAN PPH23 ERROR:", error);
    return NextResponse.json(
      {
        error: errorMessage(error, "Gagal memproses pembayaran PPh23"),
        ...(paymentId === null ? {} : { id_pembayaran: paymentId }),
      },
      { status: 500 },
    );
  }
}
