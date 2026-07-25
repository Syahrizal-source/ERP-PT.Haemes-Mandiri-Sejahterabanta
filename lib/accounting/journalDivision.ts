import { getCorporateHierarchy } from "@/lib/accounting/corporateHierarchy";

export type JournalDivision =
  | "ARMADA"
  | "ALAT BERAT"
  | "PROYEK"
  | "ACCOUNTING"
  | "PAJAK"
  | "KEBUN SAWIT";

export function getJournalDivision(kodeCoa: string): JournalDivision {
  const hierarchy = getCorporateHierarchy(kodeCoa);

  const division = hierarchy.division?.trim().toUpperCase() ?? "";

  if (division.startsWith("JASA PERKEBUNAN")) {
    return "KEBUN SAWIT";
  }

  switch (division) {
    case "ARMADA":
      return "ARMADA";

    case "ALAT BERAT":
      return "ALAT BERAT";

    case "PROYEK":
      return "PROYEK";

    case "PAJAK":
      return "PAJAK";

    case "ACCOUNTING":
      return "ACCOUNTING";

    default:
      return "ACCOUNTING";
  }
}
