export type CashFlowRow = {
  kode: string;
  nama: string;
  arus: number;
};

export const queryCashFlow = `
SELECT
  c.kode,
  c.nama,
  SUM(jd.debit - jd.kredit) AS arus
FROM jurnal_detail jd
JOIN coa c ON c.id_coa = jd.id_coa
JOIN jurnal j ON j.id_jurnal = jd.id_jurnal
WHERE c.tipe = 'KAS'
  AND j.id_periode = $1
GROUP BY c.kode, c.nama;
`;
