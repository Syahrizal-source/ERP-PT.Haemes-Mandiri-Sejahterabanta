import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { validatePositive } from "@/lib/validator";
import {
  proyekAlatBeratSchema,
  ProyekAlatBeratRequest,
} from "@/lib/validators/proyekAlatBerat";
import { postProyekAlatBerat } from "@/lib/accounting/postProyekAlatBerat";

/* =====================
   TYPE DEFINISI (FIX)
===================== */
type AlatBeratMaster = {
  id_alat: string;
  kategori: string;
  merek: string;
  model: string;
  tahun: number;
  status: string;
};

type StatusAlatBerat = "AKTIF" | "SELESAI" | "DIBATALKAN";
type ProyekAlatBeratRow = {
  id: string;
  id_proyek: string;
  id_alat: string;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  tarif_sewa_internal: number;
  jam_operasi: number;
  status: StatusAlatBerat;
  keterangan: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id_proyek = searchParams.get("id_proyek");

    if (!id_proyek) {
      return NextResponse.json(
        { error: "id_proyek wajib diisi" },
        { status: 400 },
      );
    }

    // Ambil transaksi proyek
    const { data: rows, error } = await db
      .from("proyek_alat_berat_konstruksi")
      .select(
        `
id,
id_proyek,
id_alat,
id_kategori,
no_bukti,
tanggal_mulai,
tanggal_selesai,
tarif_sewa_internal,
jam_operasi,
metode_pembayaran,
status,
periode,
keterangan,
id_jurnal,
created_by,
created_at,
updated_at
`,
      )
      .eq("id_proyek", id_proyek)
      .order("tanggal_mulai", { ascending: true });

    if (error || !rows) throw error;

    // Ambil master alat berat
    const alatIds = rows.map((r) => r.id_alat);

    const { data: master } = await db
      .from("alat_berat_master")
      .select(
        `
      id_alat,
      kategori,
      merek,
      model,
      tahun,
      status
  `,
      )
      .in("id_alat", alatIds);

    const result = rows.map((r) => ({
      ...r,
      alat_berat:
        master?.find((m: AlatBeratMaster) => m.id_alat === r.id_alat) ?? null,
    }));

    return NextResponse.json(result);
  } catch (e: unknown) {
    console.error("GET ALAT BERAT KONSTRUKSI ERROR:", e);
    return NextResponse.json(
      { error: "Gagal mengambil alat berat proyek" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ProyekAlatBeratRequest = proyekAlatBeratSchema.parse(
      await req.json(),
    );

    validatePositive(body.tarif_sewa_internal, "Tarif Sewa");
    validatePositive(body.jam_operasi, "Jam Operasi");

    const today = new Date();

    const prefix = `ABK-${today.getFullYear()}${String(
      today.getMonth() + 1,
    ).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

    const { data: last } = await db
      .from("proyek_alat_berat_konstruksi")
      .select("no_bukti")
      .like("no_bukti", `${prefix}%`)
      .order("no_bukti", { ascending: false })
      .limit(1);

    let running = 1;

    if (last?.length) {
      running = Number(last[0].no_bukti.slice(-4)) + 1;
    }

    const noBukti = `${prefix}-${String(running).padStart(4, "0")}`;

    if (body.tanggal_selesai && body.tanggal_selesai < body.tanggal_mulai) {
      throw new Error(
        "Tanggal selesai tidak boleh lebih kecil dari tanggal mulai.",
      );
    }

    const { data: proyek, error: proyekError } = await db
      .from("proyek_master")
      .select("status")
      .eq("id", body.id_proyek)
      .single();

    if (proyekError || !proyek) {
      throw new Error("Proyek tidak ditemukan.");
    }

    if (!["OPEN", "BERJALAN"].includes(proyek.status)) {
      throw new Error(
        `Status proyek ${proyek.status} tidak dapat menerima transaksi.`,
      );
    }

    const allowed: StatusAlatBerat[] = ["AKTIF", "SELESAI", "DIBATALKAN"];

    if (!allowed.includes(body.status)) {
      throw new Error("Status alat berat tidak valid.");
    }

    const { data: kategori, error: kategoriError } = await db
      .from("kategori_biaya_proyek")
      .select("id")
      .eq("id", body.id_kategori)
      .single();

    if (kategoriError || !kategori) {
      throw new Error("Kategori biaya proyek tidak ditemukan.");
    }

    const { data: alat, error: alatError } = await db
      .from("alat_berat_master")
      .select("status")
      .eq("id_alat", body.id_alat)
      .single();

    if (alatError || !alat) {
      throw new Error("Alat berat tidak ditemukan.");
    }

    if (alat.status !== "aktif") {
      throw new Error("Alat berat tidak aktif.");
    }

    const payload = {
      id_proyek: body.id_proyek,

      id_alat: body.id_alat,

      id_kategori: body.id_kategori,

      no_bukti: noBukti,

      tanggal_mulai: body.tanggal_mulai,
      tanggal_selesai: body.tanggal_selesai ?? null,

      tarif_sewa_internal: body.tarif_sewa_internal,

      jam_operasi: body.jam_operasi,

      metode_pembayaran: body.metode_pembayaran,

      status: body.status,

      periode: body.periode ?? null,

      keterangan: body.keterangan ?? null,

      created_by: body.created_by ?? null,
    };
    console.log(payload);

    const { data: inserted, error } = await db
      .from("proyek_alat_berat_konstruksi")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!inserted) {
      throw new Error("Data alat berat gagal disimpan.");
    }

    await postProyekAlatBerat({
      id_proyek_alat_berat: inserted.id,
      id_proyek: inserted.id_proyek,
      id_alat: inserted.id_alat,
      id_kategori: inserted.id_kategori,
      no_bukti: inserted.no_bukti,
      tanggal_mulai: inserted.tanggal_mulai,
      tanggal_selesai: inserted.tanggal_selesai,
      tarif_sewa_internal: Number(inserted.tarif_sewa_internal),
      jam_operasi: Number(inserted.jam_operasi),
      metode_pembayaran: inserted.metode_pembayaran,
      status: inserted.status,
      periode: inserted.periode,
      keterangan: inserted.keterangan,
      created_by: inserted.created_by,
    });

    const { error: auditError } = await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_alat_berat_konstruksi",
      aksi: "INSERT",
      id_referensi: inserted.id,
      data: payload,
    });

    if (auditError) {
      console.error("AUDIT LOG:", auditError);
    }

    return NextResponse.json({
      message: "Alat berat proyek berhasil ditambahkan",
    });
  } catch (e: unknown) {
    console.error("POST ALAT BERAT PROYEK:", e);

    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Unknown Error",
      },
      {
        status: 400,
      },
    );
  }
}
