export interface CorporateHierarchy {
  level: number;
  virtual_code: string;
  header: boolean;
  division?: string;
  section?: string;
}

export function getIndentation(level: number) {
  return level * 2;
}

export function isHeaderRow(header: boolean) {
  return header;
}

export function getCorporateHierarchy(kode: string): CorporateHierarchy {
  const kasMap: Record<string, CorporateHierarchy> = {
    "11011": {
      virtual_code: "1101.01.01",
      level: 4,
      header: true,
      division: "ARMADA",
      section: "KAS ARMADA SUPIR",
    },
  };

  if (kasMap[kode]) {
    return kasMap[kode];
  }

  const headerMap: Record<string, CorporateHierarchy> = {
    "10000": {
      level: 1,
      virtual_code: "1000.00.00",
      header: true,
      division: "ACCOUNTING",
      section: "ASET",
    },
    "11001": {
      level: 1,
      virtual_code: "1101.00.00",
      header: true,
      division: "ACCOUNTING",
      section: "KAS",
    },
    "11000": {
      level: 1,
      virtual_code: "1100.00.00",
      header: true,
      division: "ACCOUNTING",
      section: "ASET LANCAR",
    },
    "12000": {
      level: 1,
      virtual_code: "1200.00.00",
      header: true,
      division: "JASA CUT & FILL DAN PENGURUGAN TANAH",
      section: "ACCOUNTING",
    },
    "13000": {
      level: 1,
      virtual_code: "1300.00.00",
      header: true,
      division: "JASA CUT & FILL DAN PENGURUGAN TANAH",
      section: "ACCOUNTING",
    },
    "14000": {
      level: 1,
      virtual_code: "1400.00.00",
      header: true,
      division: "JASA CUT & FILL DAN PENGURUGAN TANAH",
      section: "ACCOUNTING",
    },

    "40000": {
      level: 1,
      virtual_code: "4000.00.00",
      header: true,
      division: "ACCOUNTING",
      section: "PENDAPATAN",
    },

    "15000": {
      level: 1,
      virtual_code: "1500.00.00",
      header: true,
      division: "ACCOUNTING",
      section: "Aset Tidak Lancar",
    },

    "20000": {
      level: 1,
      virtual_code: "2000.00.00",
      header: true,
      division: "ACCOUNTING",
      section: "LIABILITAS",
    },

    "30000": {
      level: 1,
      virtual_code: "3000.00.00",
      header: true,
      division: "ACCOUNTING",
      section: "EKUITAS",
    },

    "50000": {
      level: 1,
      virtual_code: "5000.00.00",
      header: true,
      division: "ACCOUNTING",
      section: "HPP",
    },

    "60000": {
      level: 1,
      virtual_code: "6000.00.00",
      header: true,
      division: "ACCOUNTING",
      section: "Biaya Operasional",
    },

    "70000": {
      level: 1,
      virtual_code: "7000.00.00",
      header: true,
      division: "ACCOUNTING",
      section: "Biaya Lain-lain",
    },
  };
  if (headerMap[kode]) {
    return headerMap[kode];
  }

  /* =========================
     ARMADA
  ========================= */
  const armadaMap: Record<string, CorporateHierarchy> = {
    "11010": {
      level: 1,
      virtual_code: "1101.01.00",
      header: true,
      division: "ARMADA",
      section: "KAS ARMADA",
    },
    "41101": {
      level: 2,
      virtual_code: "1103.10.00",
      header: false,
      division: "ARMADA",
      section: "Pendapatan Armada",
    },
    "61101": {
      level: 2,
      virtual_code: "6110.01.00",
      header: false,
      division: "ARMADA",
      section: "Beban Armada",
    },
    "15006": {
      virtual_code: "1500.06.00",
      level: 3,
      header: false,
      division: "ARMADA",
      section: "Kendaraan Operasional Armada",
    },
    "15002": {
      virtual_code: "1500.02.00",
      level: 2,
      header: false,
      division: "ARMADA",
      section: "Kendaraan Operasional",
    },
    "15104": {
      virtual_code: "1510.04.00",
      level: 3,
      header: false,
      division: "ARMADA",
      section: "Akumulasi Penyusutan Kendaraan Armada",
    },
    "15102": {
      virtual_code: "1510.02.00",
      level: 2,
      header: false,
      division: "ARMADA",
      section: "Akumulasi Penyusutan Kendaraan",
    },
    "21040": {
      virtual_code: "2100.40.00",
      level: 3,
      header: false,
      division: "ARMADA",
      section: "Hutang Armada",
    },
  };
  if (armadaMap[kode]) {
    return armadaMap[kode];
  }
  /* =========================
   KAS ARMADA SUPIR CHILD
========================= */

  if (kode.startsWith("110110")) {
    const nomor = kode.replace("110110", "");

    return {
      level: 5,
      virtual_code: `1101.01.01.${nomor}`,
      header: false,
      division: "ARMADA",
      section: "KAS ARMADA SUPIR",
    };
  }

  /* =========================
     ALAT BERAT
  ========================= */
  if (kode === "15001") {
    return {
      level: 2,
      virtual_code: "1500.01.00",
      header: false,
      division: "ALAT BERAT",
      section: "Alat Berat",
    };
  }

  const alatBeratMap: Record<string, CorporateHierarchy> = {
    "11020": {
      level: 2,
      virtual_code: "1101.02.00",
      header: true,
      division: "ALAT BERAT",
      section: "KAS ALAT BERAT",
    },
    "41001": {
      level: 2,
      virtual_code: "1103.01.00",
      header: false,
      division: "ALAT BERAT",
      section: "Pendapatan Sewa Alat Berat",
    },
    "41003": {
      level: 2,
      virtual_code: "1103.03.00",
      header: false,
      division: "ALAT BERAT",
      section: "Pendapatan Penjualan Sparepart",
    },
    "41004": {
      level: 2,
      virtual_code: "1103.04.00",
      header: false,
      division: "ALAT BERAT",
      section: "Pendapatan Jasa Perawatan",
    },
    "41102": {
      level: 2,
      virtual_code: "1103.11.00",
      header: false,
      division: "ALAT BERAT",
      section: "Pendapatan Alat Berat",
    },
    "13001": {
      level: 2,
      virtual_code: "1105.01.00",
      header: false,
      division: "ALAT BERAT",
      section: "Persediaan Sparepart",
    },
    "13002": {
      level: 2,
      virtual_code: "1105.02.00",
      header: false,
      division: "ALAT BERAT",
      section: "Persediaan BBM",
    },
    "21003": {
      level: 2,
      virtual_code: "2100.03.00",
      header: false,
      division: "ALAT BERAT",
      section: "Hutang Sparepart",
    },
    "21004": {
      level: 2,
      virtual_code: "2100.04.00",
      header: false,
      division: "ALAT BERAT",
      section: "Hutang BBM",
    },
    "24002": {
      level: 2,
      virtual_code: "2400.02.00",
      header: false,
      division: "ALAT BERAT",
      section: "Hutang Leasing Alat Berat",
    },
    "61102": {
      level: 2,
      virtual_code: "6110.02.00",
      header: false,
      division: "ALAT BERAT",
      section: "Beban Alat Berat",
    },
    "51001": {
      level: 2,
      virtual_code: "5100.01.00",
      header: false,
      division: "ALAT BERAT",
      section: "Biaya BBM Alat Berat",
    },
    "51002": {
      level: 2,
      virtual_code: "5100.02.00",
      header: false,
      division: "ALAT BERAT",
      section: "Biaya Operator Alat Berat",
    },
    "51003": {
      level: 2,
      virtual_code: "5100.03.00",
      header: false,
      division: "ALAT BERAT",
      section: "Biaya Mekanik",
    },
    "51004": {
      level: 2,
      virtual_code: "5100.04.00",
      header: false,
      division: "ALAT BERAT",
      section: "Biaya Sparepart",
    },
    "51006": {
      level: 2,
      virtual_code: "5100.06.00",
      header: false,
      division: "ALAT BERAT",
      section: "Biaya Overhaul",
    },
    "51007": {
      level: 2,
      virtual_code: "5100.07.00",
      header: false,
      division: "ALAT BERAT",
      section: "Biaya Rental Alat",
    },
    "51008": {
      level: 2,
      virtual_code: "5100.08.00",
      header: false,
      division: "ALAT BERAT",
      section: "Biaya Downtime Alat",
    },
  };
  if (alatBeratMap[kode]) {
    return alatBeratMap[kode];
  }

  if (kode === "51000") {
    return {
      level: 1,
      virtual_code: "5100.00.00",
      header: true,
      division: "JASA CUT & FILL DAN PENGURUGAN TANAH",
      section: "ALAT BERAT",
    };
  }

  /* =========================
     PROYEK
  ========================= */

  if (kode === "21010") {
    return {
      level: 2,
      virtual_code: "2110.01.00",
      header: false,
      division: "PROYEK",
      section: "Hutang Proyek",
    };
  }

  if (kode === "51100") {
    return {
      level: 1,
      virtual_code: "5110.00.00",
      header: true,
      division: "JASA CUT & FILL DAN PENGURUGAN TANAH",
      section: "PROYEK",
    };
  }

  const proyekMap: Record<string, CorporateHierarchy> = {
    "11030": {
      level: 2,
      virtual_code: "1101.03.00",
      header: true,
      division: "PROYEK",
      section: "KAS PROYEK",
    },
    "11502": {
      level: 2,
      virtual_code: "1150.02.00",
      header: true,
      division: "PROYEK",
      section: "Pekerjaan Proyek Dalam Proses",
    },
    "41002": {
      level: 2,
      virtual_code: "1103.02.00",
      header: false,
      division: "PROYEK",
      section: "Pendapatan Kontrak Proyek",
    },
    "41103": {
      level: 2,
      virtual_code: "1103.12.00",
      header: false,
      division: "PROYEK",
      section: "Pendapatan Proyek",
    },
    "42001": {
      level: 2,
      virtual_code: "1103.20.00",
      header: false,
      division: "PROYEK",
      section: "Pendapatan Denda Proyek",
    },
    "13003": {
      level: 2,
      virtual_code: "1105.03.00",
      header: false,
      division: "PROYEK",
      section: "Persediaan Material Proyek",
    },
    "21002": {
      level: 2,
      virtual_code: "2100.02.00",
      header: false,
      division: "PROYEK",
      section: "Hutang Subkontraktor",
    },
    "22010": {
      level: 2,
      virtual_code: "2210.01.00",
      header: false,
      division: "PROYEK",
      section: "Hutang PPN Proyek",
    },
    "22011": {
      level: 2,
      virtual_code: "2210.02.00",
      header: false,
      division: "PROYEK",
      section: "Hutang PPh21 Proyek",
    },
    "22012": {
      level: 2,
      virtual_code: "2210.03.00",
      header: false,
      division: "PROYEK",
      section: "Hutang PPh23 Proyek",
    },
    "22013": {
      level: 2,
      virtual_code: "2210.04.00",
      header: false,
      division: "PROYEK",
      section: "Hutang PPh4 Proyek",
    },
    "61103": {
      level: 2,
      virtual_code: "6110.03.00",
      header: false,
      division: "PROYEK",
      section: "Beban Proyek",
    },
    "21100": {
      level: 2,
      virtual_code: "2110.00.00",
      header: true,
      division: "JASA CUT & FILL DAN PENGURUGAN TANAH",
      section: "PROYEK",
    },
    "22100": {
      level: 2,
      virtual_code: "2210.00.00",
      header: true,
      division: "JASA CUT & FILL DAN PENGURUGAN TANAH",
      section: "PROYEK",
    },
    "12002": {
      level: 2,
      virtual_code: "1104.02.00",
      header: false,
      division: "PROYEK",
      section: "Piutang Retensi",
    },
    "12004": {
      level: 2,
      virtual_code: "1104.04.00",
      header: false,
      division: "PROYEK",
      section: "Piutang Non Proyek (Pinjaman)",
    },
    "12010": {
      level: 2,
      virtual_code: "1104.10.00",
      header: false,
      division: "PROYEK",
      section: "Piutang Proyek",
    },
    "12010PPN": {
      level: 2,
      virtual_code: "1104.11.00",
      header: false,
      division: "PROYEK",
      section: "PPN Masukan Proyek",
    },
    "51005": {
      level: 2,
      virtual_code: "5110.01.00",
      header: false,
      division: "PROYEK",
      section: "Biaya Subkontraktor ",
    },
    "14002": {
      virtual_code: "1106.02.00",
      level: 2,
      header: false,
      division: "PROYEK",
      section: "Uang Muka Proyek",
    },
    "15004": {
      virtual_code: "1500.04.00",
      level: 2,
      header: false,
      division: "PROYEK",
      section: "Bangunan",
    },
  };
  if (proyekMap[kode]) {
    return proyekMap[kode];
  }

  /* =========================
    PAJAK
 ========================= */
  const pajakMap: Record<string, CorporateHierarchy> = {
    "22000": {
      level: 1,
      virtual_code: "2200.00.00",
      header: true,
      division: "JASA CUT & FILL DAN PENGURUGAN TANAH",
      section: "PAJAK",
    },
    "62000": {
      level: 2,
      virtual_code: "6200.00.00",
      header: false,
      division: "JASA CUT & FILL DAN PENGURUGAN TANAH",
      section: "PAJAK",
    },
    "62001": {
      level: 2,
      virtual_code: "6200.01.00",
      header: false,
      division: "PAJAK",
      section: "Beban Pajak PPh21",
    },
    "62002": {
      level: 2,
      virtual_code: "6200.02.00",
      header: false,
      division: "PAJAK",
      section: "Beban Pajak PPh23",
    },
    "62003": {
      level: 2,
      virtual_code: "6200.03.00",
      header: false,
      division: "PAJAK",
      section: "Beban Pajak PPh4",
    },
    "62004": {
      level: 2,
      virtual_code: "6200.04.00",
      header: false,
      division: "PAJAK",
      section: "Beban Pajak PPN",
    },
    "62005": {
      level: 2,
      virtual_code: "6200.05.00",
      header: false,
      division: "PAJAK",
      section: "Beban Pajak PPh25",
    },
    "61199": {
      level: 2,
      virtual_code: "6110.99.00",
      header: false,
      division: "PAJAK",
      section: "Beban Pajak Final",
    },
    "71002": {
      level: 2,
      virtual_code: "71002.00.00",
      header: false,
      division: "PAJAK",
      section: "Biaya Denda Pajak",
    },
    "12020": {
      virtual_code: "1104.20.00",
      level: 2,
      header: false,
      division: "PAJAK",
      section: "PPN Masukan",
    },
    "22001": {
      virtual_code: "2200.01.00",
      level: 2,
      header: false,
      division: "PAJAK",
      section: "Hutang Pajak PPN",
    },
    "22002": {
      virtual_code: "2200.02.00",
      level: 2,
      header: false,
      division: "PAJAK",
      section: "Hutang Pajak PPh 21",
    },
    "22003": {
      virtual_code: "2200.03.00",
      level: 2,
      header: false,
      division: "PAJAK",
      section: "Hutang Pajak PPh 23",
    },
    "22004": {
      virtual_code: "2200.04.00",
      level: 2,
      header: false,
      division: "PAJAK",
      section: "Hutang Pajak PPh4",
    },

    "22005": {
      virtual_code: "2200.05.00",
      level: 2,
      header: false,
      division: "PAJAK",
      section: "Hutang Pajak PPh25",
    },
  };
  if (pajakMap[kode]) {
    return pajakMap[kode];
  }

  /* =========================
      ACCOUNTING
   ========================= */
  const headerAsetMap: Record<string, CorporateHierarchy> = {
    "15003": {
      virtual_code: "1500.03.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Mesin & Peralatan",
    },
    "15103": {
      virtual_code: "1510.03.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Akumulasi Penyusutan Mesin",
    },
    "15005": {
      virtual_code: "1500.05.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Peralatan Kantor",
    },
  };

  if (headerAsetMap[kode]) {
    return headerAsetMap[kode];
  }

  const headerAkumulasiMap: Record<string, CorporateHierarchy> = {
    "15100": {
      virtual_code: "1510.00.00",
      level: 1,
      header: true,
      division: "JASA CUT & FILL DAN PENGURUGAN TANAH",
      section: "ALAT BERAT",
    },

    "15101": {
      virtual_code: "1510.01.00",
      level: 2,
      header: false,
      division: "ALAT BERAT",
      section: "Akumulasi Penyusutan Alat Berat",
    },
  };

  if (headerAkumulasiMap[kode]) {
    return headerAkumulasiMap[kode];
  }

  const bankMap: Record<string, CorporateHierarchy> = {
    "11002": {
      virtual_code: "1102.00.00",
      level: 1,
      header: true,
      division: "ACCOUNTING",
      section: "BANK",
    },
    "1010": {
      virtual_code: "1102.01.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "BNI - 12965308",
    },
    "1011": {
      virtual_code: "1102.02.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "DANAMON",
    },
    "1012": {
      virtual_code: "1102.03.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "MANDIRI",
    },
    "1013": {
      virtual_code: "1102.04.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "ARTHA GRAHA",
    },
    "1014": {
      virtual_code: "1102.05.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "BNI - 1918768145",
    },
    "11003": {
      virtual_code: "1102.06.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Giro",
    },
    "11004": {
      virtual_code: "1102.07.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Deposito",
    },
    "11999": {
      virtual_code: "1102.08.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Clearing Bank",
    },
    "23010": {
      virtual_code: "2300.10.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Hutang Non Bank",
    },
    "24001": {
      virtual_code: "2400.01.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Hutang Bank Jangka Panjang",
    },
    "61010": {
      virtual_code: "6100.10.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Beban Bunga",
    },
    "62010": {
      virtual_code: "6200.10.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Biaya Administrasi Bank",
    },
    "62011": {
      virtual_code: "6200.11.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Pajak Bank",
    },
    "71001": {
      virtual_code: "71001.00.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Biaya Bunga Bank",
    },
    "71010": {
      virtual_code: "71010.01.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Beban Bunga Leasing",
    },
  };
  if (bankMap[kode]) {
    return bankMap[kode];
  }

  const headerPendapatanMap: Record<string, CorporateHierarchy> = {
    "43001": {
      virtual_code: "1103.30.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Pendapatan Lain-lain",
    },
  };
  if (headerPendapatanMap[kode]) {
    return headerPendapatanMap[kode];
  }

  const headerLiabilitasMap: Record<string, CorporateHierarchy> = {
    "21000": {
      virtual_code: "2100.00.00",
      level: 1,
      header: true,
      division: "JASA CUT & FILL DAN PENGURUGAN TANAH",
      section: "ACCOUNTING",
    },
    "21001": {
      virtual_code: "2100.01.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Hutang Usaha",
    },
    "23001": {
      virtual_code: "2300.01.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Hutang Gaji",
    },
    "23002": {
      virtual_code: "2300.02.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Hutang BPJS",
    },
    "24003": {
      virtual_code: "2400.03.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Hutang Investasi",
    },
    "24010": {
      virtual_code: "2400.10.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Hutang Leasing Jangka Pendek",
    },
    "24011": {
      virtual_code: "2400.11.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Hutang Leasing Jangka Panjang",
    },
    "24012": {
      virtual_code: "2400.12.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Hutang Leasing Accrued",
    },
  };
  if (headerLiabilitasMap[kode]) {
    return headerLiabilitasMap[kode];
  }

  const headerBebanMap: Record<string, CorporateHierarchy> = {
    "61000": {
      virtual_code: "6100.00.00",
      level: 1,
      header: true,
      division: "JASA CUT & FILL DAN PENGURUGAN TANAH",
      section: "ACCOUNTING",
    },
    "61001": {
      virtual_code: "6100.01.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Biaya Gaji Staff",
    },
    "61002": {
      virtual_code: "6100.02.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Biaya Listrik & Air",
    },
    "61003": {
      virtual_code: "6100.03.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Biaya ATK",
    },
    "61004": {
      virtual_code: "6100.04.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Biaya Internet & Komunikasi",
    },
    "61005": {
      virtual_code: "6100.05.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Biaya Transportasi",
    },
    "61006": {
      virtual_code: "6100.06.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Biaya Penyusutan Kantor",
    },
  };
  if (headerBebanMap[kode]) {
    return headerBebanMap[kode];
  }

  const headerUangMukaMap: Record<string, CorporateHierarchy> = {
    "14001": {
      virtual_code: "1106.01.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Uang Muka Pembelian",
    },
    "14010": {
      virtual_code: "1106.03.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Uang Muka Leasing",
    },
  };
  if (headerUangMukaMap[kode]) {
    return headerUangMukaMap[kode];
  }

  const headerPiutangMap: Record<string, CorporateHierarchy> = {
    "12001": {
      virtual_code: "1104.01.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Piutang Usaha",
    },
    "12003": {
      virtual_code: "1104.03.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Piutang Karyawan",
    },
    "12005": {
      virtual_code: "1104.05.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Piutang Direksi",
    },
    "12006": {
      virtual_code: "1104.06.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Piutang Karyawan Internal",
    },
    "12007": {
      virtual_code: "1104.07.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Pinjaman Internal",
    },
  };
  if (headerPiutangMap[kode]) {
    return headerPiutangMap[kode];
  }

  const headerEkuitasMap: Record<string, CorporateHierarchy> = {
    "3001": {
      virtual_code: "3000.01.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Retained Earnings",
    },
    "3002": {
      virtual_code: "3000.10.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Prive / Dividen",
    },
    "30002": {
      virtual_code: "3000.02.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Modal / Saldo Laba",
    },
    "31001": {
      virtual_code: "3100.01.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Modal Disetor",
    },
    "31002": {
      virtual_code: "3100.02.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Tambahan Modal Disetor",
    },
    "31010": {
      virtual_code: "3100.10.00",
      level: 2,
      header: false,
      division: "ALAT BERAT",
      section: "Modal Alat Berat",
    },
    "32001": {
      virtual_code: "3200.01.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Laba Ditahan",
    },
    "33001": {
      virtual_code: "3300.01.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Laba Tahun Berjalan",
    },
    "3999": {
      virtual_code: "3999.00.00",
      level: 2,
      header: false,
      division: "ACCOUNTING",
      section: "Ikhtisar Laba/Rugi",
    },
  };
  if (headerEkuitasMap[kode]) {
    return headerEkuitasMap[kode];
  }

  /* =========================
     BEBAN NON OPERASIONAL
  ========================= */
  if (kode.startsWith("72") || kode.startsWith("73")) {
    return {
      level: 1,
      virtual_code: `${kode.substring(0, 2)}00.${kode.substring(3, 5)}.00`,
      header: false,
      division: "JASA CUT & FILL DAN PENGURUGAN TANAH",
      section: "ACCOUNTING",
    };
  }

  if (kode === "210ROOT") {
    return {
      level: 1,
      virtual_code: "2100.00.00",
      header: true,
      division: "JASA CUT & FILL DAN PENGURUGAN TANAH",
      section: "ACCOUNTING",
    };
  }

  if (kode === "220ROOT") {
    return {
      level: 1,
      virtual_code: "2200.00.00",
      header: true,
      division: "JASA CUT & FILL DAN PENGURUGAN TANAH",
      section: "ACCOUNTING",
    };
  }

  if (kode === "221ROOT") {
    return {
      level: 1,
      virtual_code: "2210.00.00",
      header: true,
      division: "JASA CUT & FILL DAN PENGURUGAN TANAH",
      section: "ACCOUNTING",
    };
  }

  if (kode === "99999") {
    return {
      level: 0,
      virtual_code: "99999.00.00",
      header: true,
      division: "ACCOUNTING",
      section: "Suspense Account",
    };
  }
  /* =========================
     PERKEBUNAN
  ========================= */
  if (kode === "11040") {
    return {
      level: 0,
      virtual_code: "1101.04.00",
      header: true,
      division: "JASA PERKEBUNAN",
      section: "KAS KEBUN SAWIT",
    };
  }
  /* =========================
     PERKEBUNAN KALIMANTAN
  ========================= */
  const headerKebunKalimantanMap: Record<string, CorporateHierarchy> = {
    "11041": {
      virtual_code: "1101.04.01",
      level: 1,
      header: true,
      division: "JASA PERKEBUNAN KALIMANTAN",
      section: "KAS KEBUN SAWIT KALIMANTAN",
    },
    "41110": {
      virtual_code: "1110.01.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN KALIMANTAN",
      section: "Pendapatan Panen TBS - Kalimantan",
    },
    "11310": {
      virtual_code: "1115.01.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN KALIMANTAN",
      section: "Persediaan TBS - Kalimantan",
    },
    "51110": {
      virtual_code: "51110.00.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN KALIMANTAN",
      section: "Beban Pupuk - Kalimantan",
    },
    "51140": {
      virtual_code: "51140.00.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN KALIMANTAN",
      section: "Beban Pestisida - Kalimantan",
    },
    "51170": {
      virtual_code: "51170.00.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN KALIMANTAN",
      section: "Beban Operasional Kebun - Kalimantan",
    },
  };
  if (headerKebunKalimantanMap[kode]) {
    return headerKebunKalimantanMap[kode];
  }

  /* =========================
     PERKEBUNAN DURI
  ========================= */
  const headerKebunDuriMap: Record<string, CorporateHierarchy> = {
    "11042": {
      virtual_code: "1101.04.02",
      level: 1,
      header: true,
      division: "JASA PERKEBUNAN DURI",
      section: "KAS KEBUN SAWIT DURI",
    },
    "41120": {
      virtual_code: "1110.04.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN DURI",
      section: "Pendapatan Panen TBS - Duri",
    },
    "11320": {
      virtual_code: "1115.02.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN DURI",
      section: "Persediaan TBS - Duri",
    },
    "51120": {
      virtual_code: "51120.00.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN DURI",
      section: "Beban Pupuk - Duri",
    },
    "51150": {
      virtual_code: "51150.00.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN DURI",
      section: "Beban Pestisida - Duri",
    },
    "51180": {
      virtual_code: "51180.00.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN DURI",
      section: "Beban Operasional Kebun - Duri",
    },
  };
  if (headerKebunDuriMap[kode]) {
    return headerKebunDuriMap[kode];
  }

  /* =========================
     PERKEBUNAN BALAM
  ========================= */
  const headerKebunBalamMap: Record<string, CorporateHierarchy> = {
    "11043": {
      virtual_code: "1101.04.03",
      level: 1,
      header: true,
      division: "JASA PERKEBUNAN BALAM",
      section: "KAS KEBUN SAWIT BALAM",
    },
    "41130": {
      virtual_code: "1110.05.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN BALAM",
      section: "Pendapatan Panen TBS - Balam",
    },
    "11330": {
      virtual_code: "1115.03.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN BALAM",
      section: "Persediaan TBS - Balam",
    },
    "51130": {
      virtual_code: "51130.00.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN BALAM",
      section: "Beban Pupuk - Balam",
    },
    "51160": {
      virtual_code: "51160.00.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN BALAM",
      section: "Beban Pestisida - Balam",
    },
    "51190": {
      virtual_code: "51190.00.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN BALAM",
      section: "Beban Operasional Kebun - Balam",
    },
  };
  if (headerKebunBalamMap[kode]) {
    return headerKebunBalamMap[kode];
  }

  /* =========================
     PENDAPATAN PERKEBUNAN
  ========================= */

  if (kode === "41104") {
    return {
      level: 2,
      virtual_code: "1110.00.00",
      header: true,
      division: "JASA PERKEBUNAN",
      section: "Pendapatan Kebun Sawit",
    };
  }

  const PendapatanKebunUmum: Record<string, CorporateHierarchy> = {
    "41111": {
      virtual_code: "1110.02.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN",
      section: "Pendapatan Brondolan",
    },
    "41112": {
      virtual_code: "1110.03.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN",
      section: "Pendapatan Lain Kebun",
    },
  };
  if (PendapatanKebunUmum[kode]) {
    return PendapatanKebunUmum[kode];
  }

  /* =========================
     PERSEDIAAN PERKEBUNAN
  ========================= */

  if (kode === "11500") {
    return {
      level: 2,
      virtual_code: "1115.00.00",
      header: true,
      division: "JASA PERKEBUNAN",
      section: "KEBUN SAWIT",
    };
  }

  const headerpersediaanKebunUmumMap: Record<string, CorporateHierarchy> = {
    "11340": {
      virtual_code: "1115.04.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN",
      section: "Persediaan Pupuk Kebun",
    },
    "11350": {
      virtual_code: "1115.05.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN",
      section: "Persediaan Obat & Pestisida Kebun",
    },
    "11501": {
      virtual_code: "1115.06.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN",
      section: "Produksi Kebun Ditangguhkan (WIP)",
    },
  };
  if (headerpersediaanKebunUmumMap[kode]) {
    return headerpersediaanKebunUmumMap[kode];
  }

  /* =========================
    HUTANG PERKEBUNAN
  ========================= */
  const headerHutangKebunMap: Record<string, CorporateHierarchy> = {
    "21020": {
      virtual_code: "2110.02.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN",
      section: "Hutang Vendor Kebun",
    },
    "21030": {
      virtual_code: "2110.03.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN",
      section: "Hutang Gaji Kebun",
    },
  };
  if (headerHutangKebunMap[kode]) {
    return headerHutangKebunMap[kode];
  }

  /* =========================
     BEBAN PERKEBUNAN
  ========================= */
  if (kode === "61100") {
    return {
      level: 1,
      virtual_code: "6110.00.00",
      header: true,
      division: "JASA PERKEBUNAN",
      section: "KEBUN SAWIT",
    };
  }

  const headerBebanKebunMap: Record<string, CorporateHierarchy> = {
    "61104": {
      virtual_code: "6110.04.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN",
      section: "Beban Kebun Sawit",
    },
    "61110": {
      virtual_code: "6110.10.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN",
      section: "Beban Panen",
    },
    "61120": {
      virtual_code: "6110.20.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN",
      section: "Beban Pemupukan",
    },
    "61130": {
      virtual_code: "6110.30.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN",
      section: "Beban Perawatan",
    },
    "61140": {
      virtual_code: "6110.40.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN",
      section: "Beban Hama & Penyakit",
    },
    "61150": {
      virtual_code: "6110.50.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN",
      section: "Beban Replanting",
    },
    "61160": {
      virtual_code: "6110.60.00",
      level: 2,
      header: false,
      division: "JASA PERKEBUNAN",
      section: "Beban Gaji & Premi Kebun",
    },
  };
  if (headerBebanKebunMap[kode]) {
    return headerBebanKebunMap[kode];
  }

  /* =========================
     DEFAULT
  ========================= */

  return {
    level: 1,
    virtual_code: kode,
    header: false,
  };
}
