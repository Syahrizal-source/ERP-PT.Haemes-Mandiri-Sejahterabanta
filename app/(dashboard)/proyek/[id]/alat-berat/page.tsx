"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type AlatBeratMaster = {
  id_alat: string;
  kategori: string;
  merek: string;
  model: string;
  tahun: number;
  status: string;
};

type StatusAlatBerat = "AKTIF" | "SELESAI" | "DIBATALKAN";

type MetodePembayaran = "KAS" | "BANK" | "HUTANG";

type ProyekAlatBeratItem = {
  id: string;
  id_proyek: string;
  id_alat: string;
  id_kategori: number;
  no_bukti: string;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  tarif_sewa_internal: number;
  jam_operasi: number;
  metode_pembayaran: MetodePembayaran;
  status: StatusAlatBerat;
  periode: string | null;
  id_jurnal: number | null;
  created_by: string | null;
  keterangan: string | null;
  created_at?: string;
  updated_at?: string;
  alat_berat: AlatBeratMaster | null;
};

export default function AlatBeratPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<ProyekAlatBeratItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/proyek/alat-berat-konstruksi?id_proyek=${id}`,
      );

      if (!res.ok) {
        throw new Error();
      }

      const result = await res.json();

      setData(result);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(itemId: string): Promise<void> {
    const confirm = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah Anda yakin menghapus Alat Berat Proyek ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/proyek/alat-berat-konstruksi/${itemId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      Swal.fire("Gagal", "Gagal menghapus", "error");
      return;
    }

    Swal.fire("Berhasil", "Data berhasil dihapus", "success");

    fetchData();
  }

  const summary = useMemo(() => {
    return data.reduce(
      (acc, item) => {
        const total = item.jam_operasi * item.tarif_sewa_internal;
        acc.unit += 1;
        acc.jam += item.jam_operasi;
        acc.total += total;
        return acc;
      },
      {
        unit: 0,
        jam: 0,
        total: 0,
      },
    );
  }, [data]);

  return (
    <div className="max-w-7xl mx-auto">
      <Card title="Alat Berat Konstruksi Proyek">
        <div className="flex justify-between mb-4">
          <Button
            variant="secondary"
            onClick={() => router.push(`/proyek/${id}`)}
          >
            Kembali
          </Button>

          <Button onClick={() => router.push(`/proyek/${id}/alat-berat/form`)}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah
          </Button>
        </div>

        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2 w-14">No</th>
              <th className="border px-3 py-2">No Bukti</th>
              <th className="border px-3 py-2">Alat Berat</th>
              <th className="border px-3 py-2">Kategori</th>
              <th className="border px-3 py-2">Tanggal Mulai</th>
              <th className="border px-3 py-2">Tanggal Selesai</th>
              <th className="border px-3 py-2 text-right">Jam Operasi</th>
              <th className="border px-3 py-2 text-right">Tarif Internal</th>
              <th className="border px-3 py-2">Total</th>
              <th className="border px-3 py-2">Pembayaran</th>
              <th className="border px-3 py-2 text-center">Status</th>
              <th className="border px-3 py-2 text-center">Jurnal</th>
              <th className="border px-3 py-2">Periode</th>
              <th className="border px-3 py-2">Keterangan</th>
              <th className="border px-3 py-2">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={15} className="text-center py-4">
                  Belum ada data
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={item.id}>
                  <td className="border px-3 py-2 text-center">{index + 1}</td>
                  <td className="border px-3 py-2">{item.no_bukti}</td>
                  <td className="border px-3 py-2">
                    <div className="font-medium">
                      {item.alat_berat?.id_alat}
                    </div>{" "}
                    <div className=" text-gray-500 text-xs">
                      {item.alat_berat?.merek} {item.alat_berat?.model}
                    </div>
                  </td>
                  <td className="border px-3 py-2">
                    {item.alat_berat?.kategori}
                  </td>
                  <td className="border px-3 py-2">
                    {new Date(item.tanggal_mulai).toLocaleDateString("id-ID")}
                  </td>
                  <td className="border px-3 py-2">
                    {item.tanggal_selesai
                      ? new Date(item.tanggal_selesai).toLocaleDateString(
                          "id-ID",
                        )
                      : "-"}
                  </td>
                  <td className="border px-3 py-2 text-right">
                    {item.jam_operasi}
                  </td>
                  <td className="border px-3 py-2 text-right">
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      maximumFractionDigits: 0,
                    }).format(item.tarif_sewa_internal)}
                  </td>
                  <td className="border px-3 py-2 text-right">
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      maximumFractionDigits: 0,
                    }).format(item.jam_operasi * item.tarif_sewa_internal)}
                  </td>
                  <td className="border px-3 py-2 text-center">
                    {item.metode_pembayaran}
                  </td>
                  <td className="border px-3 py-2 text-center">
                    <span
                      className={
                        item.status === "AKTIF"
                          ? "rounded bg-green-100 px-2 py-1 text-green-700"
                          : item.status === "SELESAI"
                            ? "rounded bg-blue-100 px-2 py-1 text-blue-700"
                            : "rounded bg-red-100 px-2 py-1 text-red-700"
                      }
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="border px-3 py-2 text-center">
                    {item.id_jurnal ? (
                      <span className="rounded bg-green-100 px-2 py-1 text-green-700">
                        Posted
                      </span>
                    ) : (
                      <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-700">
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="border px-3 py-2">{item.periode}</td>
                  <td className="border px-3 py-2">{item.keterangan ?? "-"}</td>
                  <td className="border px-3 py-2">
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          router.push(
                            `/proyek/${id}/alat-berat/${item.id}/edit`,
                          )
                        }
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="mt-6 flex justify-end">
          <table className="text-sm">
            <tbody>
              <tr>
                <td className="pr-6 font-medium">Jumlah Alat</td>
                <td>{data.length} Unit</td>
              </tr>

              <tr>
                <td className="pr-6 font-medium">Total Jam</td>
                <td>{summary.jam.toLocaleString("id-ID")}</td>
              </tr>

              <tr>
                <td className="pr-6 font-medium">Total Tarif</td>

                <td className="text-right font-semibold">
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(summary.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
