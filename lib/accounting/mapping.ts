export type DealContext = {
  sumber: string | null;
};

export type CoaMapping = {
  kas: number;
  pendapatan: number;
};

/* =========================
   SMART COA MAPPING
========================= */
export function getCoaMapping(ctx: DealContext): CoaMapping {
  const sumber = ctx.sumber?.toUpperCase();

  // DEFAULT
  let kas = 3; // 11001 Kas
  const pendapatan = 872; // 41103 Pendapatan Proyek

  if (sumber === "PROYEK" || sumber === "KAS_PROYEK") {
    kas = 5; // contoh: 11030 Kas Proyek (sesuaikan ID DB kamu)
  }

  if (sumber === "ARMADA" || sumber === "KAS_ARMADA") {
    kas = 4; // contoh: 11010 Kas Armada
  }

  return { kas, pendapatan };
}
