import { getCorporateHierarchy } from "@/lib/accounting/corporateHierarchy";

export type JournalDivision =
  | "ARMADA"
  | "ALAT BERAT"
  | "PROYEK"
  | "ACCOUNTING"
  | "PAJAK";

export function getJournalDivision(kodeCoa: string): JournalDivision {
  const hierarchy = getCorporateHierarchy(kodeCoa);

  const division = hierarchy.section?.trim().toUpperCase() ?? "";

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
