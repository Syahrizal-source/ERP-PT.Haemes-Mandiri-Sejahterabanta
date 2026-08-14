"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Swal from "sweetalert2";

type AsetRow = {
  id_aset: number;
  kategori_aset: string;
  nama: string;
  nilai_perolehan: number;
  tanggal_perolehan: string;
  umur_manfaat: number;
  metode: string;
  tarif_penyusutan: number;
  depresiasi_bulanan: number;
  depresiasi_tahunan: number;
  akumulasi_depresiasi: number;
  nilai_buku: number;
  last_depresiasi: string | null;
};

export default function AsetPage() {
  const [rows, setRows] = useState<AsetRow[]>([]);
  const router = useRouter();
  const [nama, setNama] = useState<string>("");
  const [nilai, setNilai] = useState<string>("");
  const [tanggal, setTanggal] = useState<string>("");
  const [umur, setUmur] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [loadingDepresiasi, setLoadingDepresiasi] = useState<boolean>(false);
  const [kategori, setKategori] = useState<string>("ALAT_BERAT");

  async function fetchData(): Promise<void> {
    try {
      console.log("FETCH DATA ASET");

      const res = await fetch("/api/aset", {
        cache: "no-store",
      });

      console.log("STATUS:", res.status);

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data: AsetRow[] = await res.json();

      console.log("DATA:", data);

      setRows(data);
    } catch (e) {
      console.error("FETCH ERROR:", e);
    }
  }

  useEffect(() => {
    async function load(): Promise<void> {
      await fetchData();
    }

    void load();
  }, []);

  /* =========================
     SUBMIT ASET
  ========================= */

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/aset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kategori_aset: kategori,
        nama,
        nilai_perolehan: Number(nilai),
        tanggal_perolehan: tanggal,
        umur_manfaat: Number(umur),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan aset",
      });
      return;
    }
    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Aset Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/accounting/aset");
      router.refresh();
    });

    setNama("");
    setNilai("");
    setTanggal("");
    setUmur("");

    await fetchData();
  }

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Aset ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/aset/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      Swal.fire("Gagal", "Gagal menghapus", "error");
      return;
    }

    Swal.fire("Berhasil", "Data berhasil dihapus", "success");

    fetchData();
  }

  /* =========================
     DEPRESIASI
  ========================= */

  async function handleDepresiasi(): Promise<void> {
    const confirm = await Swal.fire({
      title: "Proses Depresiasi",
      text: "Yakin ingin menjalankan depresiasi bulan ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Proses",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    setLoadingDepresiasi(true);

    const res = await fetch("/api/aset/depresiasi", {
      method: "POST",
    });

    setLoadingDepresiasi(false);

    if (!res.ok) {
      Swal.fire("Gagal", "Gagal proses depresiasi", "error");
      return;
    }

    const result: { message: string } = await res.json();

    await Swal.fire({
      icon: "success",
      title: "Berhasil",
      text: result.message,
    });

    await fetchData();
  }

  /* =========================
     STATUS ASET
  ========================= */

  function getStatus(nilaiBuku: number): string {
    if (nilaiBuku <= 0) return "HABIS";
    return "AKTIF";
  }

  function getStatusColor(nilaiBuku: number): string {
    if (nilaiBuku <= 0) return "text-red-600 font-semibold";
    return "text-green-600 font-semibold";
  }

  return (
    <Card title="Manajemen Aset">
      {/* =========================
         FORM
      ========================= */}
      <form onSubmit={handleSubmit} className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm mb-1">Kategori Aset</label>
            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              className="w-full border px-3 py-2 text-sm"
            >
              <option value="ALAT_BERAT">Alat Berat</option>
              <option value="ARMADA">Armada</option>
              <option value="KENDARAAN">Kendaraan</option>
              <option value="PERALATAN">Peralatan</option>
              <option value="INVENTARIS">Inventaris</option>
              <option value="BANGUNAN">Bangunan</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Nama Aset</label>
            <input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
              className="w-full border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Nilai Perolehan</label>
            <input
              type="number"
              min={1}
              value={nilai}
              onChange={(e) => setNilai(e.target.value)}
              required
              className="w-full border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Tanggal Perolehan</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              required
              className="w-full border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Umur Manfaat</label>
            <input
              type="number"
              min={1}
              value={umur}
              onChange={(e) => setUmur(e.target.value)}
              required
              className="w-full border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan Aset"}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={handleDepresiasi}
            disabled={loadingDepresiasi}
          >
            {loadingDepresiasi ? "Memproses..." : "Proses Depresiasi"}
          </Button>
        </div>
      </form>

      {/* =========================
         TABLE
      ========================= */}
      <div className="overflow-x-auto">
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Nama</th>
              <th className="border p-2 text-right">Nilai</th>
              <th className="border p-2">Tanggal</th>
              <th className="border p-2 text-center">Umur</th>
              <th className="border p-2 text-right">Depresiasi</th>
              <th className="border p-2 text-right">Akumulasi</th>
              <th className="border p-2 text-right">Nilai Buku</th>
              <th className="border p-2">Kategori</th>
              <th className="border p-2">Metode</th>
              <th className="border p-2">% Tarif</th>
              <th className="border p-2 text-right">Depresiasi</th>
              <th className="border p-2 text-center">Status</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={13} className="border p-4 text-center">
                  Belum ada data aset
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id_aset}>
                  <td className="border p-2">{r.nama}</td>
                  <td className="border p-2 text-right">
                    {r.nilai_perolehan.toLocaleString("id-ID")}
                  </td>

                  <td className="border p-2">
                    {new Date(r.tanggal_perolehan).toLocaleDateString("id-ID")}
                  </td>

                  <td className="border p-2 text-center">{r.umur_manfaat}</td>

                  <td className="border p-2 text-right">
                    {r.depresiasi_bulanan.toLocaleString("id-ID")}
                  </td>

                  <td className="border p-2 text-right">
                    {(r.akumulasi_depresiasi ?? 0).toLocaleString("id-ID")}
                  </td>

                  <td className="border p-2 text-right">
                    {(r.nilai_buku ?? r.nilai_perolehan).toLocaleString(
                      "id-ID",
                    )}
                  </td>
                  <td className="border p-2">{r.kategori_aset}</td>

                  <td className="border p-2">{r.metode ?? "GARIS_LURUS"}</td>

                  <td className="border p-2 text-center">
                    {Number(r.tarif_penyusutan ?? 0).toFixed(2)}%
                  </td>

                  <td className="border p-2 text-right">
                    {Number(r.depresiasi_tahunan ?? 0).toLocaleString("id-ID")}
                  </td>
                  <td
                    className={`border p-2 text-center ${getStatusColor(
                      r.nilai_buku ?? r.nilai_perolehan,
                    )}`}
                  >
                    {getStatus(r.nilai_buku ?? r.nilai_perolehan)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
