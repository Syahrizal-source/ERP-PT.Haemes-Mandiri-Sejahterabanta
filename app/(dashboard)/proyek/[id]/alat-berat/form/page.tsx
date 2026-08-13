"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type AlatMaster = {
  id_alat: string;
  kategori: string;
  merek: string;
  model: string;
  tahun: number;
  status: "aktif" | "nonaktif";
};

type FormState = {
  id_alat: string;
  id_kategori: number;
  no_bukti: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  tarif_sewa_internal: number;
  jam_operasi: number;
  metode_pembayaran: "KAS" | "BANK" | "HUTANG";
  status: "AKTIF" | "SELESAI" | "DIBATALKAN";
  periode: string;
  keterangan: string;
};

export default function FormTambah() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [alatList, setAlatList] = useState<AlatMaster[]>([]);
  const [form, setForm] = useState<FormState>({
    id_alat: "",
    id_kategori: 8,
    no_bukti: "",
    tanggal_mulai: new Date().toISOString().slice(0, 10),
    tanggal_selesai: "",
    tarif_sewa_internal: 0,
    jam_operasi: 0,
    metode_pembayaran: "BANK",
    status: "AKTIF",
    periode: "",
    keterangan: "",
  });

  useEffect(() => {
    async function fetchMaster(): Promise<void> {
      const res = await fetch("/api/alat-berat-master");
      if (!res.ok) return;

      const data: AlatMaster[] = await res.json();
      setAlatList(data.filter((a) => a.status === "aktif"));
    }

    void fetchMaster();
  }, []);

  async function handleSubmit(): Promise<void> {
    if (!form.id_alat) {
      alert("Pilih alat.");
      return;
    }

    if (!form.tanggal_mulai) {
      alert("Tanggal mulai wajib.");
      return;
    }

    if (form.tarif_sewa_internal <= 0) {
      alert("Tarif harus lebih besar dari nol.");
      return;
    }

    if (form.jam_operasi <= 0) {
      alert("Jam operasi harus lebih besar dari nol.");
      return;
    }

    if (form.tanggal_selesai && form.tanggal_selesai < form.tanggal_mulai) {
      alert("Tanggal selesai tidak boleh lebih kecil.");
      return;
    }
    const res = await fetch("/api/proyek/alat-berat-konstruksi", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id_proyek: id,
        id_alat: form.id_alat,
        id_kategori: form.id_kategori,
        no_bukti: form.no_bukti,
        tanggal_mulai: form.tanggal_mulai,
        tanggal_selesai: form.tanggal_selesai || null,
        tarif_sewa_internal: form.tarif_sewa_internal,
        jam_operasi: form.jam_operasi,
        metode_pembayaran: form.metode_pembayaran,
        status: form.status,
        periode: form.periode,
        keterangan: form.keterangan,
      }),
    });
    const result = await res.json();
    console.log(result);
    if (!res.ok) {
      alert(result.error);
      return;
    }
    router.push(`/proyek/${id}/alat-berat`);
    router.refresh();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Tambah Alat Berat">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="No Bukti"
            value={form.no_bukti}
            onChange={(e) =>
              setForm({
                ...form,
                no_bukti: e.target.value,
              })
            }
          />
          <div>
            <label className="text-sm font-medium">Alat</label>
            <select
              className="w-full border rounded p-2"
              value={form.id_alat}
              onChange={(e) => setForm({ ...form, id_alat: e.target.value })}
            >
              <option value="">- Pilih -</option>
              {alatList.map((a) => (
                <option key={a.id_alat} value={a.id_alat}>
                  {a.id_alat} - {a.merek} {a.model}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Status</label>

            <select
              className="w-full rounded border p-2"
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as "AKTIF" | "SELESAI" | "DIBATALKAN",
                })
              }
            >
              <option value="AKTIF">AKTIF</option>
              <option value="SELESAI">SELESAI</option>
              <option value="DIBATALKAN">DIBATALKAN</option>
            </select>
          </div>

          <div>
            <label className="text-sm font medium">Sewa Alat</label>
            <select
              className="w-full rounded border p-2"
              value={form.id_kategori}
              onChange={(e) =>
                setForm({
                  ...form,
                  id_kategori: Number(e.target.value),
                })
              }
            >
              <option value={8}>Sewa Alat</option>
            </select>
          </div>

          <div>
            <label className="text-sm font medium">Pembayaran</label>
            <select
              className="w-full rounded border p-2"
              value={form.metode_pembayaran}
              onChange={(e) =>
                setForm({
                  ...form,
                  metode_pembayaran: e.target.value as
                    | "KAS"
                    | "BANK"
                    | "HUTANG",
                })
              }
            >
              <option value="KAS">Kas</option>
              <option value="BANK">BNI</option>
              <option value="HUTANG">Hutang</option>
            </select>
          </div>

          <Input
            label="Periode"
            placeholder="Agustus 2026"
            value={form.periode}
            onChange={(e) =>
              setForm({
                ...form,
                periode: e.target.value,
              })
            }
          />

          <Input
            type="date"
            label="Tanggal Mulai"
            value={form.tanggal_mulai}
            onChange={(e) =>
              setForm({ ...form, tanggal_mulai: e.target.value })
            }
          />

          <Input
            type="date"
            label="Tanggal Selesai"
            value={form.tanggal_selesai}
            onChange={(e) =>
              setForm({ ...form, tanggal_selesai: e.target.value })
            }
          />

          <Input
            type="number"
            label="Tarif Sewa Internal"
            value={form.tarif_sewa_internal}
            onChange={(e) =>
              setForm({
                ...form,
                tarif_sewa_internal: Number(e.target.value),
              })
            }
            placeholder="Tarif Sewat Internal"
          />

          <Input
            type="number"
            label="Jam Operasi"
            value={form.jam_operasi}
            onChange={(e) =>
              setForm({
                ...form,
                jam_operasi: Number(e.target.value),
              })
            }
            placeholder="Jam Operasi"
          />

          <Input
            label="Keterangan"
            value={form.keterangan}
            onChange={(e) =>
              setForm({
                ...form,
                keterangan: e.target.value,
              })
            }
            placeholder="Keterangan"
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={() => router.back()}>
            Kembali
          </Button>
          <Button onClick={handleSubmit}>Simpan</Button>
        </div>
      </Card>
    </div>
  );
}
