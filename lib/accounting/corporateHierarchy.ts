export interface CorporateHierarchy {
  id_coa: number;
  level: number;
  virtual_code: string;
  header: boolean;
  section?: string;
}
type CorporateHierarchyDefinition = Omit<CorporateHierarchy, "id_coa">;
export interface CoaReference {
  id_coa: number;
  kode: string;
}
export function getIndentation(level: number): number {
  return level * 2;
}
export function isHeaderRow(header: boolean): boolean {
  return header;
}
function withCoaId(
  id_coa: number,
  definition: CorporateHierarchyDefinition,
): CorporateHierarchy {
  return {
    id_coa,
    ...definition,
  };
}
export function getCorporateHierarchy(
  kode: string,
  id_coa: number = 0,
): CorporateHierarchy {
  const headerMap: Record<string, CorporateHierarchyDefinition> = {
    "10000": {
      level: 1,
      virtual_code: "1000.00.00",
      header: true,
      section: "ASET",
    },
    "11000": {
      level: 1,
      virtual_code: "1100.00.00",
      header: true,
      section: "ASET LANCAR",
    },
    "11001": {
      level: 1,
      virtual_code: "1101.00.00",
      header: true,
      section: "KAS",
    },
    "12000": {
      level: 1,
      virtual_code: "1200.00.00",
      header: true,
      section: "Aset Tidak Lancar",
    },
    "13000": {
      level: 1,
      virtual_code: "1300.00.00",
      header: true,
      section: "ACCOUNTING",
    },
    "14000": {
      level: 1,
      virtual_code: "1400.00.00",
      header: true,
      section: "ACCOUNTING",
    },
    "15000": {
      level: 1,
      virtual_code: "1500.00.00",
      header: true,
      section: "Aset Tidak Lancar",
    },
    "20000": {
      level: 1,
      virtual_code: "2000.00.00",
      header: true,
      section: "LIABILITAS",
    },
    "30000": {
      level: 1,
      virtual_code: "3000.00.00",
      header: true,
      section: "EKUITAS",
    },
    "40000": {
      level: 1,
      virtual_code: "4000.00.00",
      header: true,
      section: "PENDAPATAN",
    },
    "50000": {
      level: 1,
      virtual_code: "5000.00.00",
      header: true,
      section: "HPP",
    },
    "60000": {
      level: 1,
      virtual_code: "6000.00.00",
      header: true,
      section: "Biaya Operasional",
    },
    "70000": {
      level: 1,
      virtual_code: "7000.00.00",
      header: true,
      section: "Biaya Lain-lain",
    },
  };
  if (headerMap[kode]) {
    return withCoaId(id_coa, headerMap[kode]);
  }

  // COA Liabilitas bertingkat yang telah dikonfirmasi di database.
  // virtual_code memakai kode COA aktual agar tidak berbenturan dengan
  // pemetaan virtual_code lama untuk laporan keuangan.
  const dottedLiabilitasMap: Record<string, CorporateHierarchyDefinition> = {
    "20.000": {
      level: 1,
      virtual_code: "20.000",
      header: true,
      section: "LIABILITAS",
    },
    "20.100": {
      level: 2,
      virtual_code: "20.100",
      header: true,
      section: "Liabilitas Jangka Pendek",
    },
    "20.103": {
      level: 3,
      virtual_code: "20.103",
      header: true,
      section: "Utang Sewa Pembiayaan - Jangka Pendek",
    },
    "20.103.01": {
      level: 4,
      virtual_code: "20.103.01",
      header: false,
      section: "Utang Sewa PT Mandiri Tunas Finance - Jangka Pendek",
    },
    "20.103.02": {
      level: 4,
      virtual_code: "20.103.02",
      header: false,
      section: "Utang Sewa PT Astra Sedaya Finance - Jangka Pendek",
    },
    "20.103.03": {
      level: 4,
      virtual_code: "20.103.03",
      header: false,
      section: "Utang Sewa PT Dipo Star Finance - Jangka Pendek",
    },
    "20.200": {
      level: 2,
      virtual_code: "20.200",
      header: true,
      section: "Liabilitas Jangka Panjang",
    },
    "20.201": {
      level: 3,
      virtual_code: "20.201",
      header: true,
      section: "Utang Sewa Pembiayaan - Jangka Panjang",
    },
    "20.201.01": {
      level: 4,
      virtual_code: "20.201.01",
      header: false,
      section: "Utang Sewa PT Mandiri Tunas Finance - Jangka Panjang",
    },
    "20.201.02": {
      level: 4,
      virtual_code: "20.201.02",
      header: false,
      section: "Utang Sewa PT Astra Sedaya Finance - Jangka Panjang",
    },
    "20.201.03": {
      level: 4,
      virtual_code: "20.201.03",
      header: false,
      section: "Utang Sewa PT Dipo Star Finance - Jangka Panjang",
    },
  };

  if (dottedLiabilitasMap[kode]) {
    return withCoaId(id_coa, dottedLiabilitasMap[kode]);
  }
  const bankMap: Record<string, CorporateHierarchyDefinition> = {
    "11200": {
      virtual_code: "11200",
      level: 2,
      header: true,
      section: "BANK",
    },
    "11201": {
      virtual_code: "11201",
      level: 3,
      header: false,
      section: "BNI - 12965308",
    },
    "11202": {
      virtual_code: "11202",
      level: 3,
      header: false,
      section: "DANAMON",
    },
    "11203": {
      virtual_code: "11203",
      level: 3,
      header: false,
      section: "MANDIRI",
    },
    "11204": {
      virtual_code: "11204",
      level: 3,
      header: false,
      section: "ARTHA GRAHA",
    },
    "11205": {
      virtual_code: "11205",
      level: 3,
      header: false,
      section: "BNI - 1918768145",
    },
    "11206": {
      virtual_code: "11206",
      level: 3,
      header: false,
      section: "Giro",
    },
    "11207": {
      virtual_code: "11207",
      level: 3,
      header: false,
      section: "Deposito",
    },
    "11208": {
      virtual_code: "11208",
      level: 3,
      header: false,
      section: "Clearing Bank",
    },
  };
  if (bankMap[kode]) {
    return withCoaId(id_coa, bankMap[kode]);
  }
  const armadaMap: Record<string, CorporateHierarchyDefinition> = {
    "11010": {
      level: 1,
      virtual_code: "1101.01.00",
      header: true,
      section: "KAS ARMADA",
    },
    "41101": {
      level: 2,
      virtual_code: "41101",
      header: false,
      section: "Pendapatan Armada",
    },
    "61101": {
      level: 2,
      virtual_code: "6110.01.00",
      header: false,
      section: "Beban Armada",
    },
    "15006": {
      level: 3,
      virtual_code: "1500.06.00",
      header: false,
      section: "Kendaraan Operasional Armada",
    },
    "15002": {
      level: 2,
      virtual_code: "1500.02.00",
      header: false,
      section: "Kendaraan Operasional",
    },
    "15104": {
      level: 3,
      virtual_code: "1510.04.00",
      header: false,
      section: "Akumulasi Penyusutan Kendaraan Armada",
    },
    "15102": {
      level: 2,
      virtual_code: "1510.02.00",
      header: false,
      section: "Akumulasi Penyusutan Kendaraan",
    },
    "21040": {
      level: 3,
      virtual_code: "2100.40.00",
      header: false,
      section: "Hutang Armada",
    },
  };
  if (armadaMap[kode]) {
    return withCoaId(id_coa, armadaMap[kode]);
  }
  if (kode.startsWith("110110")) {
    const nomor: string = kode.replace("110110", "");
    return withCoaId(id_coa, {
      level: 5,
      virtual_code: `1101.01.01.${nomor}`,
      header: false,
      section: "KAS ARMADA SUPIR",
    });
  }
  const alatBeratMap: Record<string, CorporateHierarchyDefinition> = {
    "11020": {
      level: 2,
      virtual_code: "1101.02.00",
      header: true,
      section: "KAS ALAT BERAT",
    },
    "41001": {
      level: 2,
      virtual_code: "1103.01.00",
      header: false,
      section: "Pendapatan Sewa Alat Berat",
    },
    "41003": {
      level: 2,
      virtual_code: "1103.03.00",
      header: false,
      section: "Pendapatan Penjualan Sparepart",
    },
    "41004": {
      level: 2,
      virtual_code: "1103.04.00",
      header: false,
      section: "Pendapatan Jasa Perawatan",
    },
    "41102": {
      level: 2,
      virtual_code: "41102",
      header: false,
      section: "Pendapatan Alat Berat",
    },
    "13001": {
      level: 2,
      virtual_code: "1105.01.00",
      header: false,
      section: "Persediaan Sparepart",
    },
    "13002": {
      level: 2,
      virtual_code: "1105.02.00",
      header: false,
      section: "Persediaan BBM",
    },
    "21003": {
      level: 2,
      virtual_code: "2100.03.00",
      header: false,
      section: "Hutang Sparepart",
    },
    "21004": {
      level: 2,
      virtual_code: "2100.04.00",
      header: false,
      section: "Hutang BBM",
    },
    "24002": {
      level: 2,
      virtual_code: "2400.02.00",
      header: false,
      section: "Hutang Leasing Alat Berat",
    },
    "61102": {
      level: 2,
      virtual_code: "6110.02.00",
      header: false,
      section: "Beban Alat Berat",
    },
    "51001": {
      level: 2,
      virtual_code: "5100.01.00",
      header: false,
      section: "Biaya BBM Alat Berat",
    },
    "51002": {
      level: 2,
      virtual_code: "5100.02.00",
      header: false,
      section: "Biaya Operator Alat Berat",
    },
    "51003": {
      level: 2,
      virtual_code: "5100.03.00",
      header: false,
      section: "Biaya Mekanik",
    },
    "51004": {
      level: 2,
      virtual_code: "5100.04.00",
      header: false,
      section: "Biaya Sparepart",
    },
    "51006": {
      level: 2,
      virtual_code: "5100.06.00",
      header: false,
      section: "Biaya Overhaul",
    },
    "51007": {
      level: 2,
      virtual_code: "5100.07.00",
      header: false,
      section: "Biaya Rental Alat",
    },
    "51008": {
      level: 2,
      virtual_code: "5100.08.00",
      header: false,
      section: "Biaya Downtime Alat",
    },
  };
  if (alatBeratMap[kode]) {
    return withCoaId(id_coa, alatBeratMap[kode]);
  }
  const proyekMap: Record<string, CorporateHierarchyDefinition> = {
    "11030": {
      level: 2,
      virtual_code: "1101.03.00",
      header: true,
      section: "KAS PROYEK",
    },
    "11502": {
      level: 2,
      virtual_code: "1150.02.00",
      header: true,
      section: "Pekerjaan Proyek Dalam Proses",
    },
    "41002": {
      level: 2,
      virtual_code: "1103.02.00",
      header: false,
      section: "Pendapatan Kontrak Proyek",
    },
    "41103": {
      level: 2,
      virtual_code: "41103",
      header: false,
      section: "Pendapatan Proyek",
    },
    "42001": {
      level: 2,
      virtual_code: "1103.20.00",
      header: false,
      section: "Pendapatan Denda Proyek",
    },
    "13003": {
      level: 2,
      virtual_code: "1105.03.00",
      header: false,
      section: "Persediaan Material Proyek",
    },
    "21002": {
      level: 2,
      virtual_code: "2100.02.00",
      header: false,
      section: "Hutang Subkontraktor",
    },
    "22010": {
      level: 2,
      virtual_code: "2210.01.00",
      header: false,
      section: "Hutang PPN Proyek",
    },
    "22011": {
      level: 2,
      virtual_code: "2210.02.00",
      header: false,
      section: "Hutang PPh21 Proyek",
    },
    "22012": {
      level: 2,
      virtual_code: "2210.03.00",
      header: false,
      section: "Hutang PPh23 Proyek",
    },
    "22013": {
      level: 2,
      virtual_code: "2210.04.00",
      header: false,
      section: "Hutang PPh4 Proyek",
    },
    "61103": {
      level: 2,
      virtual_code: "6110.03.00",
      header: false,
      section: "Beban Proyek",
    },
    "21100": {
      level: 2,
      virtual_code: "2110.00.00",
      header: true,
      section: "PROYEK",
    },
    "22100": {
      level: 2,
      virtual_code: "2210.00.00",
      header: true,
      section: "PROYEK",
    },
    "12002": {
      level: 2,
      virtual_code: "1104.02.00",
      header: false,
      section: "Piutang Retensi",
    },
    "12004": {
      level: 2,
      virtual_code: "1104.04.00",
      header: false,
      section: "Piutang Non Proyek (Pinjaman)",
    },
    "12010": {
      level: 2,
      virtual_code: "1104.10.00",
      header: false,
      section: "Piutang Proyek",
    },
    "12010PPN": {
      level: 2,
      virtual_code: "1104.11.00",
      header: false,
      section: "PPN Masukan Proyek",
    },
    "51005": {
      level: 2,
      virtual_code: "5110.01.00",
      header: false,
      section: "Biaya Subkontraktor",
    },
    "14002": {
      level: 2,
      virtual_code: "1106.02.00",
      header: false,
      section: "Uang Muka Proyek",
    },
    "15004": {
      level: 2,
      virtual_code: "1500.04.00",
      header: false,
      section: "Bangunan",
    },
  };
  if (proyekMap[kode]) {
    return withCoaId(id_coa, proyekMap[kode]);
  }
  const pajakMap: Record<string, CorporateHierarchyDefinition> = {
    "22000": {
      level: 1,
      virtual_code: "2200.00.00",
      header: true,
      section: "PAJAK",
    },
    "62000": {
      level: 2,
      virtual_code: "6200.00.00",
      header: false,
      section: "PAJAK",
    },
    "62001": {
      level: 2,
      virtual_code: "6200.01.00",
      header: false,
      section: "Beban Pajak PPh21",
    },
    "62002": {
      level: 2,
      virtual_code: "6200.02.00",
      header: false,
      section: "Beban Pajak PPh23",
    },
    "62003": {
      level: 2,
      virtual_code: "6200.03.00",
      header: false,
      section: "Beban Pajak PPh4",
    },
    "62004": {
      level: 2,
      virtual_code: "6200.04.00",
      header: false,
      section: "Beban Pajak PPN",
    },
    "62005": {
      level: 2,
      virtual_code: "6200.05.00",
      header: false,
      section: "Beban Pajak PPh25",
    },
    "61199": {
      level: 2,
      virtual_code: "6110.99.00",
      header: false,
      section: "Beban Pajak Final",
    },
    "71002": {
      level: 2,
      virtual_code: "71002.00.00",
      header: false,
      section: "Biaya Denda Pajak",
    },
    "12020": {
      level: 2,
      virtual_code: "1104.20.00",
      header: false,
      section: "PPN Masukan",
    },
    "22001": {
      level: 2,
      virtual_code: "2200.01.00",
      header: false,
      section: "Hutang Pajak PPN",
    },
    "22002": {
      level: 2,
      virtual_code: "2200.02.00",
      header: false,
      section: "Hutang Pajak PPh 21",
    },
    "22003": {
      level: 2,
      virtual_code: "2200.03.00",
      header: false,
      section: "Hutang Pajak PPh 23",
    },
    "22004": {
      level: 2,
      virtual_code: "2200.04.00",
      header: false,
      section: "Hutang Pajak PPh4",
    },
    "22005": {
      level: 2,
      virtual_code: "2200.05.00",
      header: false,
      section: "Hutang Pajak PPh25",
    },
  };
  if (pajakMap[kode]) {
    return withCoaId(id_coa, pajakMap[kode]);
  }
  const piutangMap: Record<string, CorporateHierarchyDefinition> = {
    "12001": {
      virtual_code: "1104.01.00",
      level: 2,
      header: false,
      section: "Piutang Usaha",
    },
    "12003": {
      virtual_code: "1104.03.00",
      level: 2,
      header: false,
      section: "Piutang Karyawan",
    },
    "12005": {
      virtual_code: "1104.05.00",
      level: 2,
      header: false,
      section: "Piutang Direksi",
    },
    "12006": {
      virtual_code: "1104.06.00",
      level: 2,
      header: false,
      section: "Piutang Karyawan Internal",
    },
    "12007": {
      virtual_code: "1104.07.00",
      level: 2,
      header: false,
      section: "Pinjaman Internal",
    },
  };
  if (piutangMap[kode]) {
    return withCoaId(id_coa, piutangMap[kode]);
  }
  const ekuitasMap: Record<string, CorporateHierarchyDefinition> = {
    "3001": {
      virtual_code: "3000.01.00",
      level: 2,
      header: false,
      section: "Retained Earnings",
    },
    "3002": {
      virtual_code: "3000.10.00",
      level: 2,
      header: false,
      section: "Prive / Dividen",
    },
    "30002": {
      virtual_code: "3000.02.00",
      level: 2,
      header: false,
      section: "Modal / Saldo Laba",
    },
    "31001": {
      virtual_code: "3100.01.00",
      level: 2,
      header: false,
      section: "Modal Disetor",
    },
    "31002": {
      virtual_code: "3100.02.00",
      level: 2,
      header: false,
      section: "Tambahan Modal Disetor",
    },
    "31010": {
      virtual_code: "3100.10.00",
      level: 2,
      header: false,
      section: "Modal Alat Berat",
    },
    "32001": {
      virtual_code: "3200.01.00",
      level: 2,
      header: false,
      section: "Laba Ditahan",
    },
    "33001": {
      virtual_code: "3300.01.00",
      level: 2,
      header: false,
      section: "Laba Tahun Berjalan",
    },
    "3999": {
      virtual_code: "3999.00.00",
      level: 2,
      header: false,
      section: "Ikhtisar Laba/Rugi",
    },
  };
  if (ekuitasMap[kode]) {
    return withCoaId(id_coa, ekuitasMap[kode]);
  }
  if (kode.startsWith("72") || kode.startsWith("73")) {
    return withCoaId(id_coa, {
      level: 1,
      virtual_code: `${kode.substring(0, 2)}00.${kode.substring(3, 5)}.00`,
      header: false,
      section: "ACCOUNTING",
    });
  }
  if (kode === "210ROOT") {
    return withCoaId(id_coa, {
      level: 1,
      virtual_code: "2100.00.00",
      header: true,
      section: "ACCOUNTING",
    });
  }
  if (kode === "220ROOT") {
    return withCoaId(id_coa, {
      level: 1,
      virtual_code: "2200.00.00",
      header: true,
      section: "ACCOUNTING",
    });
  }
  if (kode === "221ROOT") {
    return withCoaId(id_coa, {
      level: 1,
      virtual_code: "2210.00.00",
      header: true,
      section: "ACCOUNTING",
    });
  }
  if (kode === "99999") {
    return withCoaId(id_coa, {
      level: 0,
      virtual_code: "99999.00.00",
      header: true,
      section: "Suspense Account",
    });
  }
  if (kode === "11040") {
    return withCoaId(id_coa, {
      level: 0,
      virtual_code: "1101.04.00",
      header: true,
      section: "KAS KEBUN SAWIT",
    });
  }
  if (kode === "11041") {
    return withCoaId(id_coa, {
      virtual_code: "1101.04.01",
      level: 1,
      header: true,
      section: "KAS KEBUN SAWIT KALIMANTAN",
    });
  }
  if (kode === "11042") {
    return withCoaId(id_coa, {
      virtual_code: "1101.04.02",
      level: 1,
      header: true,
      section: "KAS KEBUN SAWIT DURI",
    });
  }
  if (kode === "11043") {
    return withCoaId(id_coa, {
      virtual_code: "1101.04.03",
      level: 1,
      header: true,
      section: "KAS KEBUN SAWIT BALAM",
    });
  }
  if (kode === "41104") {
    return withCoaId(id_coa, {
      level: 2,
      virtual_code: "1110.00.00",
      header: true,
      section: "Pendapatan Kebun Sawit",
    });
  }
  if (kode === "11500") {
    return withCoaId(id_coa, {
      level: 2,
      virtual_code: "1115.00.00",
      header: true,
      section: "KEBUN SAWIT",
    });
  }
  if (kode === "61100") {
    return withCoaId(id_coa, {
      level: 1,
      virtual_code: "6110.00.00",
      header: true,
      section: "KEBUN SAWIT",
    });
  }
  const kebunMap: Record<string, CorporateHierarchyDefinition> = {
    "41110": {
      virtual_code: "1110.01.00",
      level: 2,
      header: false,
      section: "Pendapatan Panen TBS - Kalimantan",
    },
    "11310": {
      virtual_code: "1115.01.00",
      level: 2,
      header: false,
      section: "Persediaan TBS - Kalimantan",
    },
    "51110": {
      virtual_code: "51110.00.00",
      level: 2,
      header: false,
      section: "Beban Pupuk - Kalimantan",
    },
    "51140": {
      virtual_code: "51140.00.00",
      level: 2,
      header: false,
      section: "Beban Pestisida - Kalimantan",
    },
    "51170": {
      virtual_code: "51170.00.00",
      level: 2,
      header: false,
      section: "Beban Operasional Kebun - Kalimantan",
    },
    "41120": {
      virtual_code: "1110.04.00",
      level: 2,
      header: false,
      section: "Pendapatan Panen TBS - Duri",
    },
    "11320": {
      virtual_code: "1115.02.00",
      level: 2,
      header: false,
      section: "Persediaan TBS - Duri",
    },
    "51120": {
      virtual_code: "51120.00.00",
      level: 2,
      header: false,
      section: "Beban Pupuk - Duri",
    },
    "51150": {
      virtual_code: "51150.00.00",
      level: 2,
      header: false,
      section: "Beban Pestisida - Duri",
    },
    "51180": {
      virtual_code: "51180.00.00",
      level: 2,
      header: false,
      section: "Beban Operasional Kebun - Duri",
    },
    "41130": {
      virtual_code: "1110.05.00",
      level: 2,
      header: false,
      section: "Pendapatan Panen TBS - Balam",
    },
    "11330": {
      virtual_code: "1115.03.00",
      level: 2,
      header: false,
      section: "Persediaan TBS - Balam",
    },
    "51130": {
      virtual_code: "51130.00.00",
      level: 2,
      header: false,
      section: "Beban Pupuk - Balam",
    },
    "51160": {
      virtual_code: "51160.00.00",
      level: 2,
      header: false,
      section: "Beban Pestisida - Balam",
    },
    "51190": {
      virtual_code: "51190.00.00",
      level: 2,
      header: false,
      section: "Beban Operasional Kebun - Balam",
    },
    "41111": {
      virtual_code: "1110.02.00",
      level: 2,
      header: false,
      section: "Pendapatan Brondolan",
    },
    "41112": {
      virtual_code: "1110.03.00",
      level: 2,
      header: false,
      section: "Pendapatan Lain Kebun",
    },
    "11340": {
      virtual_code: "1115.04.00",
      level: 2,
      header: false,
      section: "Persediaan Pupuk Kebun",
    },
    "11350": {
      virtual_code: "1115.05.00",
      level: 2,
      header: false,
      section: "Persediaan Obat & Pestisida Kebun",
    },
    "11501": {
      virtual_code: "1115.06.00",
      level: 2,
      header: false,
      section: "Produksi Kebun Ditangguhkan (WIP)",
    },
    "21020": {
      virtual_code: "2110.02.00",
      level: 2,
      header: false,
      section: "Hutang Vendor Kebun",
    },
    "21030": {
      virtual_code: "2110.03.00",
      level: 2,
      header: false,
      section: "Hutang Gaji Kebun",
    },
    "61104": {
      virtual_code: "6110.04.00",
      level: 2,
      header: false,
      section: "Beban Kebun Sawit",
    },
    "61110": {
      virtual_code: "6110.10.00",
      level: 2,
      header: false,
      section: "Beban Panen",
    },
    "61120": {
      virtual_code: "6110.20.00",
      level: 2,
      header: false,
      section: "Beban Pemupukan",
    },
    "61130": {
      virtual_code: "6110.30.00",
      level: 2,
      header: false,
      section: "Beban Perawatan",
    },
    "61140": {
      virtual_code: "6110.40.00",
      level: 2,
      header: false,
      section: "Beban Hama & Penyakit",
    },
    "61150": {
      virtual_code: "6110.50.00",
      level: 2,
      header: false,
      section: "Beban Replanting",
    },
    "61160": {
      virtual_code: "6110.60.00",
      level: 2,
      header: false,
      section: "Beban Gaji & Premi Kebun",
    },
  };
  if (kebunMap[kode]) {
    return withCoaId(id_coa, kebunMap[kode]);
  }
  return withCoaId(id_coa, {
    level: 1,
    virtual_code: kode,
    header: false,
  });
}
