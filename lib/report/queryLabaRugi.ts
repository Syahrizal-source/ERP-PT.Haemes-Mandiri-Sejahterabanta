export type LabaRugiRow = {
  kode: string;
  nama: string;
  total: number;
};

export const queryLabaRugi = `
SELECT
c.kode,
c.nama,
SUM(jd.kredit - jd.debit) AS total
FROM jurnal_detail jd
JOIN coa c ON c.id_coa = jd.id_coa
JOIN jurnal j ON j.id_jurnal = jd.id_jurnal
WHERE c.tipe IN ('PENDAPATAN','BEBAN')
AND j.id_periode = $1
GROUP BY c.kode, c.nama
ORDER BY c.kode;
`;
