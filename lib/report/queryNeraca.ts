export type NeracaRow = {
  kode: string;
  nama: string;
  saldo: number;
};

export const queryNeraca = `
SELECT
  c.kode,
  c.nama,
  SUM(jd.debit - jd.kredit) AS saldo
FROM jurnal_detail jd
JOIN coa c ON c.id_coa = jd.id_coa
JOIN jurnal j ON j.id_jurnal = jd.id_jurnal
WHERE c.tipe IN ('ASET','KEWAJIBAN','EKUITAS')
  AND j.id_periode = $1
  AND ($2::text IS NULL OR c.nama ILIKE '%' || $2 || '%')
GROUP BY c.kode, c.nama
ORDER BY c.kode;
`;
