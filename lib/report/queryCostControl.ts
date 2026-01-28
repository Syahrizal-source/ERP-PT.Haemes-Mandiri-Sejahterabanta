export type CostControlRow = {
  jenis_transaksi: string;
  total_biaya: number;
};

export const queryCostControl = `
SELECT
  cmd.jenis_transaksi,
  SUM(jd.debit) AS total_biaya
FROM jurnal_detail jd
JOIN jurnal j ON j.id_jurnal = jd.id_jurnal
JOIN coa_mapping_detail cmd ON cmd.id_coa = jd.id_coa
WHERE j.id_periode = $1
  AND cmd.jenis_transaksi IN ('PEMUPUKAN','HAMA_PENYAKIT','OPERASIONAL_KEBUN')
GROUP BY cmd.jenis_transaksi;
`;
