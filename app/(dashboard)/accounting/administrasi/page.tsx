"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Swal from "sweetalert2";

type AdministrasiRow = {
  id: number;
  tanggal: string;
  deskripsi: string;
  periode: string;
  created_at: string;
  updated_at: string;
};

export default function AdministrasiPage() {
  const [rows, setRows] = useState<AdministrasiRow[]>([]);
  const router = useRouter();
  const [tanggal, setTanggal] = useState<string>("");
  const [deskripsi, setDeskripsi] = useState<string>("");
  const [periode, setPeriode] = useState<string>("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  async function fetchData(): Promise<void> {
    const res = await fetch("/api/administrasi");
    if (!res.ok) return;

    const data: AdministrasiRow[] = await res.json();
    setRows(data);
  }

  useEffect(() => {
    async function loadData(): Promise<void> {
      await fetchData();
    }

    void loadData();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/administrasi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tanggal,
        deskripsi,
        periode,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan administrasi",
      });
      return;
    }
    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Administrasi Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/accounting/administrasi");
      router.refresh();
    });

    setTanggal("");
    setDeskripsi("");
    setPeriode("");

    await fetchData();
  }

  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Administrasi ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/administrasi/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      Swal.fire("Gagal", "Gagal menghapus", "error");
      return;
    }

    Swal.fire("Berhasil", "Data berhasil dihapus", "success");

    fetchData();
  }

  return (
    <Card title="Administrasi & Setting">
      {/* FORM INPUT */}
      <form onSubmit={handleSubmit} className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Tanggal</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              required
              className="w-full border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Periode</label>
            <input
              type="text"
              placeholder="2026"
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              required
              className="w-full border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Deskripsi</label>
            <input
              type="text"
              placeholder="Deskripsi"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              required
              className="w-full border px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <Button type="submit" disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan Administrasi"}
          </Button>
        </div>
      </form>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Tanggal</th>
              <th className="border p-2">Periode</th>
              <th className="border p-2">Deskripsi</th>
              <th className="border p-2">Updated</th>
              <th className="border p-2 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="border p-4 text-center text-gray-500"
                >
                  Belum ada data administrasi
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="border p-2">{r.tanggal}</td>
                  <td className="border p-2">{r.periode}</td>
                  <td className="border p-2">{r.deskripsi}</td>
                  <td className="border p-2">
                    {new Date(r.updated_at).toLocaleString()}
                  </td>
                  <td className="border p-2 text-center">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 text-xs rounded"
                    >
                      Hapus
                    </button>
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
