import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/* ===============================
   SETUP SUPABASE
================================ */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
);

/* ===============================
   TYPES
================================ */
type PeriodeStatus = "OPEN" | "CLOSED";

interface PeriodeJurnal {
  id_jurnal: number;
}

interface PeriodeRow {
  id_periode: string;
  nama_periode: string;
  status: PeriodeStatus;
  created_at: string;
  is_closed: boolean | null;
  closed_at?: string | null;
  tanggal_mulai?: string | null;
  tanggal_selesai?: string | null;
  jurnal?: PeriodeJurnal[];
}

interface CreatePeriodeInput {
  nama_periode: string;
  status?: PeriodeStatus;
}

interface UpdatePeriodeInput {
  id_periode: string;
  nama_periode: string;
  status: PeriodeStatus;
}

/* ===============================
   VALIDATION
================================ */
function isValidStatus(value: unknown): value is PeriodeStatus {
  return value === "OPEN" || value === "CLOSED";
}

function isValidNamaPeriode(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 10;
}

/* ===============================
   GET: LIST SEMUA PERIODE
================================ */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("periode")
      .select(
        `
        id_periode,
        nama_periode,
        status,
        created_at,
        is_closed,
        closed_at,
        tanggal_mulai,
        tanggal_selesai,
        jurnal (
          id_jurnal
        )
      `,
      )
      .order("tanggal_mulai", {
        ascending: true,
        nullsFirst: false,
      })
      .order("created_at", {
        ascending: true,
      })
      .returns<PeriodeRow[]>();

    if (error) {
      console.error("GET PERIODE SUPABASE ERROR:", error.message);
      throw error;
    }

    /*
      PENTING:
      Tidak ada filter berdasarkan status atau jumlah jurnal.

      Semua periode ditampilkan:
      - OPEN
      - CLOSED yang memiliki jurnal
      - CLOSED yang belum memiliki jurnal
      - Semua periode bulanan 2027
    */

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("GET PERIODE ERROR:", err);

    return NextResponse.json(
      {
        message: "Gagal ambil data periode",
      },
      {
        status: 500,
      },
    );
  }
}

/* ===============================
   POST: CREATE PERIODE
================================ */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreatePeriodeInput;

    if (!isValidNamaPeriode(body.nama_periode)) {
      return NextResponse.json(
        {
          message: "nama_periode tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    const status: PeriodeStatus = body.status ?? "OPEN";

    if (!isValidStatus(status)) {
      return NextResponse.json(
        {
          message: "Status periode tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    /*
      Cegah pembuatan periode OPEN kedua.
      Database juga memiliki unique partial index
      sebagai perlindungan terakhir.
    */
    if (status === "OPEN") {
      const { data: periodeAktif, error: activeError } = await supabase
        .from("periode")
        .select("id_periode")
        .eq("status", "OPEN")
        .limit(1);

      if (activeError) {
        throw activeError;
      }

      if (periodeAktif && periodeAktif.length > 0) {
        return NextResponse.json(
          {
            message:
              "Masih ada periode OPEN. Tutup periode aktif terlebih dahulu.",
          },
          {
            status: 409,
          },
        );
      }
    }

    const isClosed = status === "CLOSED";

    const { data, error } = await supabase
      .from("periode")
      .insert([
        {
          nama_periode: body.nama_periode.trim(),
          status,
          is_closed: isClosed,
          closed_at: null,
        },
      ])
      .select("id_periode")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        success: true,
        id_periode: data.id_periode,
      },
      {
        status: 201,
      },
    );
  } catch (err) {
    console.error("POST PERIODE ERROR:", err);

    return NextResponse.json(
      {
        message: "Gagal simpan periode",
      },
      {
        status: 500,
      },
    );
  }
}

/* ===============================
   PATCH: EDIT PERIODE
================================ */
export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as UpdatePeriodeInput;

    if (!body.id_periode) {
      return NextResponse.json(
        {
          message: "id_periode wajib diisi",
        },
        {
          status: 400,
        },
      );
    }

    if (!isValidNamaPeriode(body.nama_periode)) {
      return NextResponse.json(
        {
          message: "nama_periode tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    if (!isValidStatus(body.status)) {
      return NextResponse.json(
        {
          message: "Status periode tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    const { data: periode, error: fetchError } = await supabase
      .from("periode")
      .select("id_periode, status")
      .eq("id_periode", body.id_periode)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (!periode) {
      return NextResponse.json(
        {
          message: "Periode tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    if (periode.status === "CLOSED") {
      return NextResponse.json(
        {
          message: "Periode CLOSED tidak bisa diubah",
        },
        {
          status: 403,
        },
      );
    }

    /*
      Jangan izinkan membuka periode baru
      jika masih ada periode OPEN lainnya.
    */
    if (body.status === "OPEN") {
      const { data: periodeAktif, error: activeError } = await supabase
        .from("periode")
        .select("id_periode")
        .eq("status", "OPEN")
        .neq("id_periode", body.id_periode)
        .limit(1);

      if (activeError) {
        throw activeError;
      }

      if (periodeAktif && periodeAktif.length > 0) {
        return NextResponse.json(
          {
            message:
              "Periode lain masih OPEN. Selesaikan periode aktif terlebih dahulu.",
          },
          {
            status: 409,
          },
        );
      }
    }

    const isClosed = body.status === "CLOSED";

    const { error: updateError } = await supabase
      .from("periode")
      .update({
        nama_periode: body.nama_periode.trim(),
        status: body.status,
        is_closed: isClosed,
        closed_at: isClosed ? new Date().toISOString() : null,
      })
      .eq("id_periode", body.id_periode);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    console.error("PATCH PERIODE ERROR:", err);

    return NextResponse.json(
      {
        message: "Gagal update periode",
      },
      {
        status: 500,
      },
    );
  }
}

/* ===============================
   DELETE: DELETE PERIODE
================================ */
export async function DELETE(req: Request) {
  try {
    const body = (await req.json()) as {
      id_periode: string;
    };

    if (!body.id_periode) {
      return NextResponse.json(
        {
          message: "id_periode wajib diisi",
        },
        {
          status: 400,
        },
      );
    }

    const { data: periode, error: fetchError } = await supabase
      .from("periode")
      .select("id_periode, status")
      .eq("id_periode", body.id_periode)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (!periode) {
      return NextResponse.json(
        {
          message: "Periode tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    if (periode.status === "CLOSED") {
      return NextResponse.json(
        {
          message: "Periode CLOSED tidak bisa dihapus",
        },
        {
          status: 403,
        },
      );
    }

    /*
      Cegah penghapusan periode yang masih memiliki jurnal.
    */
    const { count, error: jurnalError } = await supabase
      .from("jurnal")
      .select("id_jurnal", {
        count: "exact",
        head: true,
      })
      .eq("id_periode", body.id_periode);

    if (jurnalError) {
      throw jurnalError;
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          message: "Periode masih memiliki jurnal dan tidak bisa dihapus.",
        },
        {
          status: 409,
        },
      );
    }

    const { error: deleteError } = await supabase
      .from("periode")
      .delete()
      .eq("id_periode", body.id_periode);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    console.error("DELETE PERIODE ERROR:", err);

    return NextResponse.json(
      {
        message: "Gagal hapus periode",
      },
      {
        status: 500,
      },
    );
  }
}
