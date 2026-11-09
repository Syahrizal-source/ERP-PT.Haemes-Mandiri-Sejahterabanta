import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

/* =========================================================
   TIPE COA
========================================================= */

const TIPE_COA = [
  "ASET",
  "LIABILITAS",
  "EKUITAS",
  "PENDAPATAN",
  "BEBAN",
] as const;

type TipeCoa = (typeof TIPE_COA)[number];

type CoaRequestBody = Record<string, unknown>;

type CoaUpdate = {
  nama?: string;
  aktif?: boolean;
  is_cash?: boolean;
};

type CoaRow = {
  id_coa: number;
  kode: string;
  nama: string;
  tipe: TipeCoa;
  parent_id: number | null;
  level_coa: number;
  urutan: number;
  is_header: boolean;
  aktif: boolean | null;
  is_cash: boolean | null;
  normal_balance: string | null;
  saldo_awal_2026: number | string;
};

type CoaResponse = CoaRow & {
  aktif: boolean;
  is_cash: boolean;
  parent_kode: string | null;
  parent_nama: string | null;
};

/* =========================================================
   VALIDASI
========================================================= */

function isRecord(value: unknown): value is CoaRequestBody {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTipeCoa(value: unknown): value is TipeCoa {
  return typeof value === "string" && TIPE_COA.some((tipe) => tipe === value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

async function readJson(req: Request): Promise<CoaRequestBody | null> {
  try {
    const value: unknown = await req.json();
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

/* =========================================================
   PEMERIKSAAN PENGGUNAAN COA DI JURNAL
========================================================= */

async function isCoaLocked(
  idCoa: number,
): Promise<{ locked: boolean; error: string | null }> {
  const { count, error } = await db
    .from("jurnal_detail")
    .select("id_coa", {
      count: "exact",
      head: true,
    })
    .eq("id_coa", idCoa);

  if (error) {
    return {
      locked: true,
      error: error.message,
    };
  }

  return {
    locked: (count ?? 0) > 0,
    error: null,
  };
}

/* =========================================================
   URUTAN COA BERIKUTNYA
========================================================= */

async function getNextUrutan(
  parentId: number | null,
): Promise<{ urutan: number | null; error: string | null }> {
  let query = db.from("coa").select("urutan");

  if (parentId === null) {
    query = query.is("parent_id", null);
  } else {
    query = query.eq("parent_id", parentId);
  }

  const { data, error } = await query;

  if (error) {
    return {
      urutan: null,
      error: error.message,
    };
  }

  let maxUrutan = 0;

  for (const row of data ?? []) {
    if (typeof row.urutan === "number" && Number.isFinite(row.urutan)) {
      maxUrutan = Math.max(maxUrutan, row.urutan);
    }
  }

  return {
    urutan: maxUrutan + 10,
    error: null,
  };
}

/* =========================================================
   GET: DAFTAR COA
========================================================= */

export async function GET() {
  const { data, error } = await db
    .from("coa")
    .select(
      [
        "id_coa",
        "kode",
        "nama",
        "tipe",
        "parent_id",
        "level_coa",
        "urutan",
        "is_header",
        "aktif",
        "is_cash",
        "normal_balance",
        "saldo_awal_2026",
      ].join(","),
    )
    .order("urutan", { ascending: true })
    .order("kode", { ascending: true })
    .returns<CoaRow[]>();

  if (error) {
    console.error("GET COA ERROR:", error);

    return NextResponse.json(
      {
        message: "Gagal mengambil data COA.",
        detail: error.message,
      },
      { status: 500 },
    );
  }

  const rows: CoaRow[] = data ?? [];
  const coaById = new Map<number, CoaRow>();

  for (const row of rows) {
    coaById.set(row.id_coa, row);
  }

  const result: CoaResponse[] = rows.map((row) => {
    const parent =
      row.parent_id === null ? undefined : coaById.get(row.parent_id);

    const saldoAwal = Number(row.saldo_awal_2026);

    if (!Number.isFinite(saldoAwal)) {
      throw new Error(`Saldo awal 2026 tidak valid untuk COA ${row.kode}.`);
    }

    return {
      ...row,
      aktif: row.aktif === true,
      is_cash: row.is_cash === true,
      saldo_awal_2026: saldoAwal,
      parent_kode: parent?.kode ?? null,
      parent_nama: parent?.nama ?? null,
    };
  });

  return NextResponse.json(result);
}

/* =========================================================
   POST: TAMBAH COA
========================================================= */

export async function POST(req: Request) {
  const body = await readJson(req);

  if (!body) {
    return NextResponse.json(
      { message: "Body JSON tidak valid" },
      { status: 400 },
    );
  }

  const kode = typeof body.kode === "string" ? body.kode.trim() : "";

  const nama = typeof body.nama === "string" ? body.nama.trim() : "";

  if (!kode || !nama || !isTipeCoa(body.tipe)) {
    return NextResponse.json(
      {
        message: "Kode, nama, dan tipe COA wajib diisi dengan benar",
      },
      { status: 400 },
    );
  }

  const parentId =
    body.parent_id === undefined || body.parent_id === null
      ? null
      : body.parent_id;

  if (parentId !== null && !isPositiveInteger(parentId)) {
    return NextResponse.json(
      { message: "parent_id tidak valid" },
      { status: 400 },
    );
  }

  if (body.aktif !== undefined && typeof body.aktif !== "boolean") {
    return NextResponse.json(
      { message: "aktif harus berupa boolean" },
      { status: 400 },
    );
  }

  if (body.is_cash !== undefined && typeof body.is_cash !== "boolean") {
    return NextResponse.json(
      { message: "is_cash harus berupa boolean" },
      { status: 400 },
    );
  }

  let levelCoa = 1;

  if (parentId !== null) {
    const { data: parent, error: parentError } = await db
      .from("coa")
      .select("id_coa, level_coa")
      .eq("id_coa", parentId)
      .maybeSingle();

    if (parentError) {
      return NextResponse.json(
        { message: parentError.message },
        { status: 500 },
      );
    }

    if (!parent) {
      return NextResponse.json(
        { message: "Induk COA tidak ditemukan" },
        { status: 400 },
      );
    }

    if (
      typeof parent.level_coa !== "number" ||
      !Number.isInteger(parent.level_coa) ||
      parent.level_coa < 1
    ) {
      return NextResponse.json(
        {
          message: "Level induk COA tidak valid. Periksa hierarki COA.",
        },
        { status: 409 },
      );
    }

    levelCoa = parent.level_coa + 1;
  }

  const nextOrder = await getNextUrutan(parentId);

  if (nextOrder.error !== null || nextOrder.urutan === null) {
    return NextResponse.json(
      {
        message: nextOrder.error ?? "Gagal menentukan urutan COA",
      },
      { status: 500 },
    );
  }

  const { data: created, error: createError } = await db
    .from("coa")
    .insert({
      kode,
      nama,
      tipe: body.tipe,
      parent_id: parentId,
      level_coa: levelCoa,
      urutan: nextOrder.urutan,
      is_header: false,
      aktif: body.aktif ?? true,
      is_cash: body.is_cash ?? false,
    })
    .select("id_coa")
    .single();

  if (createError) {
    return NextResponse.json(
      {
        message:
          createError.code === "23505"
            ? "Kode COA sudah digunakan"
            : createError.message,
      },
      {
        status: createError.code === "23505" ? 409 : 500,
      },
    );
  }

  if (parentId !== null) {
    const { error: parentUpdateError } = await db
      .from("coa")
      .update({ is_header: true })
      .eq("id_coa", parentId);

    if (parentUpdateError) {
      return NextResponse.json(
        {
          message: "COA dibuat, tetapi status header induk gagal diperbarui.",
          id_coa: created.id_coa,
          detail: parentUpdateError.message,
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    {
      success: true,
      id_coa: created.id_coa,
    },
    { status: 201 },
  );
}

/* =========================================================
   PATCH: EDIT COA
========================================================= */

export async function PATCH(req: Request) {
  const body = await readJson(req);

  if (!body || !isPositiveInteger(body.id_coa)) {
    return NextResponse.json(
      { message: "id_coa tidak valid" },
      { status: 400 },
    );
  }

  const idCoa = body.id_coa;
  const updates: CoaUpdate = {};

  if (body.nama !== undefined) {
    if (typeof body.nama !== "string" || body.nama.trim().length === 0) {
      return NextResponse.json(
        { message: "Nama COA tidak valid" },
        { status: 400 },
      );
    }

    updates.nama = body.nama.trim();
  }

  if (body.aktif !== undefined) {
    if (typeof body.aktif !== "boolean") {
      return NextResponse.json(
        { message: "aktif harus berupa boolean" },
        { status: 400 },
      );
    }

    updates.aktif = body.aktif;
  }

  if (body.is_cash !== undefined) {
    if (typeof body.is_cash !== "boolean") {
      return NextResponse.json(
        { message: "is_cash harus berupa boolean" },
        { status: 400 },
      );
    }

    updates.is_cash = body.is_cash;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { message: "Tidak ada data yang diubah" },
      { status: 400 },
    );
  }

  const lock = await isCoaLocked(idCoa);

  if (lock.error) {
    return NextResponse.json(
      {
        message: "Gagal memeriksa penggunaan COA",
        detail: lock.error,
      },
      { status: 500 },
    );
  }

  if (lock.locked) {
    return NextResponse.json(
      {
        message:
          "COA sudah dipakai jurnal sehingga tidak boleh diubah melalui API ini.",
      },
      { status: 403 },
    );
  }

  const { data, error } = await db
    .from("coa")
    .update(updates)
    .eq("id_coa", idCoa)
    .select("id_coa")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { message: "COA tidak ditemukan" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
}

/* =========================================================
   DELETE: HAPUS COA

   COA aktif maupun nonaktif dapat dihapus jika:
   1. COA ditemukan.
   2. Tidak memiliki akun anak.
   3. Tidak digunakan pada jurnal.
   4. Tidak ditolak oleh foreign key tabel lain.

   Tidak melakukan cascade atau menghapus jurnal.
========================================================= */

export async function DELETE(req: Request) {
  const body = await readJson(req);

  if (!body || !isPositiveInteger(body.id_coa)) {
    return NextResponse.json(
      { message: "id_coa tidak valid" },
      { status: 400 },
    );
  }

  const idCoa = body.id_coa;

  try {
    const { data: current, error: currentError } = await db
      .from("coa")
      .select("id_coa, kode, nama, parent_id, aktif")
      .eq("id_coa", idCoa)
      .maybeSingle();

    if (currentError) {
      console.error("DELETE COA - LOAD ERROR:", currentError);

      return NextResponse.json(
        {
          message: "Gagal membaca COA sebelum penghapusan.",
          detail: currentError.message,
          code: currentError.code,
        },
        { status: 500 },
      );
    }

    if (!current) {
      return NextResponse.json(
        { message: "COA tidak ditemukan atau sudah dihapus." },
        { status: 404 },
      );
    }

    /*
     * Periksa akun anak sebelum mencoba DELETE.
     */
    const { count: childCount, error: childError } = await db
      .from("coa")
      .select("id_coa", {
        count: "exact",
        head: true,
      })
      .eq("parent_id", idCoa);

    if (childError) {
      console.error("DELETE COA - CHILD CHECK ERROR:", childError);

      return NextResponse.json(
        {
          message: "Gagal memeriksa akun anak COA.",
          detail: childError.message,
          code: childError.code,
        },
        { status: 500 },
      );
    }

    if ((childCount ?? 0) > 0) {
      return NextResponse.json(
        {
          message:
            "COA tidak dapat dihapus karena masih memiliki akun anak. Hapus atau pindahkan akun anak terlebih dahulu.",
          id_coa: current.id_coa,
          kode: current.kode,
          aktif: current.aktif === true,
        },
        { status: 409 },
      );
    }

    /*
     * COA nonaktif juga diperiksa terhadap riwayat jurnal.
     * Status nonaktif tidak menghapus hubungan historis.
     */
    const lock = await isCoaLocked(idCoa);

    if (lock.error) {
      console.error("DELETE COA - JOURNAL CHECK ERROR:", lock.error);

      return NextResponse.json(
        {
          message: "Gagal memeriksa penggunaan COA pada jurnal.",
          detail: lock.error,
        },
        { status: 500 },
      );
    }

    if (lock.locked) {
      return NextResponse.json(
        {
          message:
            "COA tidak dapat dihapus karena sudah digunakan pada jurnal. Status nonaktif tidak menghapus riwayat jurnal. Biarkan COA nonaktif agar laporan historis tetap valid.",
          id_coa: current.id_coa,
          kode: current.kode,
          aktif: current.aktif === true,
        },
        { status: 409 },
      );
    }

    /*
     * Coba hapus hanya akun yang lolos pemeriksaan.
     */
    const { data: deleted, error: deleteError } = await db
      .from("coa")
      .delete()
      .eq("id_coa", idCoa)
      .select("id_coa, kode, nama")
      .maybeSingle();

    if (deleteError) {
      console.error("DELETE COA - DATABASE ERROR:", deleteError);

      /*
       * PostgreSQL 23503 = foreign key violation.
       * Ini dapat berarti COA masih direferensikan tabel lain.
       */
      if (deleteError.code === "23503") {
        return NextResponse.json(
          {
            message:
              "COA tidak dapat dihapus karena masih direferensikan oleh data lain di database. Periksa tabel yang menggunakan COA ini sebelum menghapusnya.",
            detail: deleteError.message,
            code: deleteError.code,
            hint: deleteError.hint,
            details: deleteError.details,
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          message: "Database gagal menghapus COA.",
          detail: deleteError.message,
          code: deleteError.code,
          hint: deleteError.hint,
          details: deleteError.details,
        },
        { status: 500 },
      );
    }

    /*
     * Jika tidak ada baris yang dihapus, periksa kembali.
     * Bisa terjadi jika kebijakan database menolak DELETE.
     */
    if (!deleted) {
      return NextResponse.json(
        {
          message:
            "COA tidak terhapus. Periksa izin DELETE atau kebijakan RLS pada tabel coa.",
        },
        { status: 403 },
      );
    }

    /*
     * Setelah akun anak dihapus, induknya mungkin tidak lagi
     * mempunyai anak. Perbarui is_header induk jika diperlukan.
     */
    if (current.parent_id !== null) {
      const { count: remainingChildren, error: remainingError } = await db
        .from("coa")
        .select("id_coa", {
          count: "exact",
          head: true,
        })
        .eq("parent_id", current.parent_id);

      if (remainingError) {
        console.error(
          "DELETE COA - REMAINING CHILD CHECK ERROR:",
          remainingError,
        );

        return NextResponse.json(
          {
            success: true,
            message:
              "COA berhasil dihapus, tetapi status header induk belum dapat diperiksa.",
            deleted,
            detail: remainingError.message,
          },
          { status: 200 },
        );
      }

      if ((remainingChildren ?? 0) === 0) {
        const { error: parentError } = await db
          .from("coa")
          .update({ is_header: false })
          .eq("id_coa", current.parent_id);

        if (parentError) {
          console.error("DELETE COA - PARENT UPDATE ERROR:", parentError);

          return NextResponse.json(
            {
              success: true,
              message:
                "COA berhasil dihapus, tetapi status header induk gagal diperbarui.",
              deleted,
              detail: parentError.message,
            },
            { status: 200 },
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `COA ${deleted.kode} - ${deleted.nama} berhasil dihapus.`,
      deleted,
    });
  } catch (error: unknown) {
    const detail =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan yang tidak diketahui.";

    console.error("DELETE COA - UNEXPECTED ERROR:", error);

    return NextResponse.json(
      {
        message: "Terjadi kesalahan saat menghapus COA.",
        detail,
      },
      { status: 500 },
    );
  }
}
