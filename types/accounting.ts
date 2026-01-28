export interface CoaRow {
  id_coa: number;
  kode: string;
}

export interface JurnalDetailJoinCoa {
  debit: number;
  kredit: number;
  coa: {
    kode: string;
  };
}

export interface CoaIdOnly {
  id_coa: number;
}
