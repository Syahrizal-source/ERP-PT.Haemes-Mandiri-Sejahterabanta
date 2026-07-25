export type JurnalSumber =
  | "UMUM"
  | "PENYESUAIAN"
  | "PENUTUP"
  | "ARMADA"
  | "KAS_ARMADA"
  | "ALAT_BERAT"
  | "KAS_ALAT_BERAT"
  | "PROYEK"
  | "KAS_PROYEK"
  | "KEBUN"
  | "KAS_KEBUN";

export type JurnalLine = {
  id_coa: number;
  debit: number;
  kredit: number;
};

export interface Jurnal {
  id_jurnal: number;
  tanggal: string;
  no_bukti: string;
  sumber: JurnalSumber;
  keterangan: string;
  id_periode: number;
  id_proyek?: string | null;
  created_at: string;
}

export interface JurnalDetail {
  id_detail: number;
  id_jurnal: number;
  id_coa: number;
  debit: number;
  kredit: number;

  // keterkaitan ASET/PROYEK
  id_alat?: number | null;
  id_proyek?: string | null;

  // COST CONTROL (AMAN)
  id_cost_center?: string | null;
}

export interface JurnalPenutupForm {
  id_periode: number;
}

export interface Periode {
  id_periode: number;
  status: "OPEN" | "CLOSED";
}

export interface JurnalPenyesuaianDetailForm {
  id_coa: number;
  debit: number;
  kredit: number;
  id_alat?: number | null;
}

export interface JurnalForm {
  tanggal: string;
  no_bukti: string;
  keterangan: string;
  id_periode: number;
  details: JurnalPenyesuaianDetailForm[];
}

export interface JurnalPenyesuaianRow {
  id_jurnal: number;
  tanggal: string;
  no_bukti: string;
  keterangan: string;
  id_periode: number;
  sumber: string;
}

export interface JurnalPenyesuaianDetailRow {
  id_jurnal: number;
  id_coa: number;
  debit: number;
  kredit: number;
  id_alat?: number | null;
}

export interface JurnalProyekForm {
  tanggal: string;
  no_bukti: string;
  keterangan: string;
  id_periode: number;
  id_proyek: string; // ⬅️ WAJIB
  details: JurnalProyekDetailForm[];
}

export interface JurnalProyekDetailForm {
  id_coa: number;
  debit: number;
  kredit: number;
  id_cost_center?: string | null;
}
