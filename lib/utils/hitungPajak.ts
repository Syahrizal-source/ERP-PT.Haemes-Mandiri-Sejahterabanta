import { JenisTransaksi } from "@/lib/enums/jenisTransaksi";

export function hitungPajak(jenis: JenisTransaksi, nilai: number) {
  let ppn = 0;
  let pph21 = 0;
  let pph23 = 0;
  let pphFinal = 0;

  switch (jenis) {
    case "PEMUPUKAN":
    case "HAMA_PENYAKIT":
    case "OPERASIONAL_KEBUN":
      ppn = nilai * 0.11;
      pph23 = nilai * 0.02;
      break;

    case "GAJI":
      pph21 = nilai * 0.05; // contoh
      break;

    case "PANEN_TBS":
      pphFinal = nilai * 0.0025; // contoh PPh 4(2)
      break;
  }

  return { ppn, pph21, pph23, pphFinal };
}
