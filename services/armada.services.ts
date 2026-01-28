import { db } from "@/lib/supabase/server";
import { Armada } from "@/types/armada";

/**
 * Ambil semua data armada
 */
export async function getArmada(): Promise<Armada[]> {
  const { data, error } = await db
    .from("armada")
    .select("id, kode_unit, jenis_alat, merek, model");

  if (error) {
    throw new Error(`getArmada failed: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return data as Armada[];
}

/**
 * Simpan data armada baru
 */
export async function createArmada(armada: Armada): Promise<void> {
  const { error } = await db.from("armada").insert([
    {
      id: armada.id,
      kode_unit: armada.kode_unit,
      jenis_alat: armada.jenis_alat,
      merek: armada.merek,
      model: armada.model,
    },
  ]);

  if (error) {
    throw new Error(`createArmada failed: ${error.message}`);
  }
}
