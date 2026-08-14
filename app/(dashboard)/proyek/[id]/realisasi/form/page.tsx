"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";

type MetodePembayaran = "KAS" | "KAS_BESAR" | "KAS_KECIL" | "BANK" | "HUTANG";

type RAPItem = {
  id: string;
  id_rab: string;
  id_proyek: string;
  id_kategori: number;
  uraian: string;
  qty: number;
  satuan: string;
  harga: number;
  total: number;
  kategori: {
    id: number;
    kode: string;
    nama: string;
    jenis: "BIAYA" | "MATERIAL";
  };
};

type FormState = {
  tanggal: string;
  no_bukti: string;
  id_rab: string | null;
  id_kategori: number;
  uraian: string;
  qty: number;
  satuan: string;
  harga: number;
  metode_pembayaran: MetodePembayaran;
  keterangan: string;
};

type RAPResponse = {
  data: RAPItem[];
};

export default function CreateRealisasiPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const idProyek = params.id as string;

  const [rapList, setRapList] = useState<RAPItem[]>([]);
  const [loadingRAP, setLoadingRAP] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [form, setForm] = useState<FormState>({
    tanggal: new Date().toISOString().slice(0, 10),
    no_bukti: "",
    id_rab: null,
    id_kategori: 0,
    uraian: "",
    qty: 0,
    satuan: "",
    harga: 0,
    metode_pembayaran: "KAS",
    keterangan: "",
  });

  const selectedRAP = useMemo<RAPItem | null>(() => {
    if (!form.id_rab) {
      return null;
    }

    return rapList.find((item) => item.id_rab === form.id_rab) ?? null;
  }, [form.id_rab, rapList]);

  const total = useMemo<number>(() => {
    return Number(form.qty) * Number(form.harga);
  }, [form.qty, form.harga]);

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleRAPChange(value: string): void {
    const rap = rapList.find((item) => item.id_rab === value);

    if (!rap) {
      setForm((prev) => ({
        ...prev,
        id_rab: null,
        id_kategori: 0,
        uraian: "",
        qty: 0,
        satuan: "",
        harga: 0,
      }));

      return;
    }

    setForm((prev) => ({
      ...prev,
      id_rab: rap.id_rab,
      id_kategori: rap.id_kategori,
      uraian: rap.uraian,
      satuan: rap.satuan,
      harga: Number(rap.harga),
      qty: 0,
    }));
  }

  async function handleSubmit(): Promise<void> {
    if (!form.id_rab) {
      showToast("Pilih Item RAP terlebih dahulu.", "error");
      return;
    }

    if (form.id_kategori <= 0) {
      showToast("Kategori biaya tidak valid.", "error");
      return;
    }

    if (!form.tanggal) {
      showToast("Tanggal wajib diisi.", "error");
      return;
    }

    if (!form.no_bukti.trim()) {
      showToast("Nomor bukti wajib diisi.", "error");
      return;
    }

    if (!form.uraian.trim()) {
      showToast("Uraian wajib diisi.", "error");
      return;
    }

    if (form.qty <= 0) {
      showToast("Qty harus lebih besar dari 0.", "error");
      return;
    }

    if (!form.satuan.trim()) {
      showToast("Satuan wajib diisi.", "error");
      return;
    }

    if (form.harga < 0) {
      showToast("Harga tidak boleh negatif.", "error");
      return;
    }

    if (total <= 0) {
      showToast("Total realisasi harus lebih besar dari 0.", "error");
      return;
    }

    if (selectedRAP && form.qty > Number(selectedRAP.qty)) {
      showToast("Qty realisasi melebihi Qty RAP.", "error");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/proyek/realisasi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_proyek: idProyek,
          id_rab: form.id_rab,
          id_kategori: form.id_kategori,
          tanggal: form.tanggal,
          no_bukti: form.no_bukti.trim(),
          uraian: form.uraian.trim(),
          qty: form.qty,
          satuan: form.satuan.trim(),
          harga: form.harga,
          metode_pembayaran: form.metode_pembayaran,
          keterangan: form.keterangan.trim() || null,
        }),
      });

      const result: {
        message?: string;
        error?: string;
        id_jurnal?: number;
      } = await response.json();

      if (!response.ok) {
        showToast(result.error ?? "Gagal menyimpan realisasi.", "error");
        return;
      }

      showToast(
        result.message ?? "Realisasi proyek berhasil disimpan.",
        "success",
      );

      router.push(`/proyek/${idProyek}/realisasi`);

      router.refresh();
    } catch (error: unknown) {
      showToast(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menyimpan realisasi.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    async function loadRAP(): Promise<void> {
      try {
        setLoadingRAP(true);

        const response = await fetch(
          `/api/proyek/rap?id_proyek=${encodeURIComponent(idProyek)}`,
        );

        if (!response.ok) {
          showToast("Gagal mengambil data RAP.", "error");
          return;
        }

        const result: unknown = await response.json();

        if (typeof result === "object" && result !== null && "data" in result) {
          const responseData = result as RAPResponse;

          setRapList(Array.isArray(responseData.data) ? responseData.data : []);

          return;
        }

        if (Array.isArray(result)) {
          setRapList(result as RAPItem[]);
          return;
        }

        setRapList([]);
      } catch (error: unknown) {
        showToast(
          error instanceof Error ? error.message : "Gagal mengambil data RAP.",
          "error",
        );
      } finally {
        setLoadingRAP(false);
      }
    }

    void loadRAP();
  }, [idProyek, showToast]);

  return (
    <div className="mx-auto max-w-4xl">
      <Card title="Tambah Realisasi Proyek">
        <div className="grid grid-cols-2 gap-4">
          {/* RAP */}
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium">Item RAP</label>

            <select
              className="w-full rounded-md border border-gray-300 p-2"
              value={form.id_rab ?? ""}
              disabled={loadingRAP || saving}
              onChange={(event) => handleRAPChange(event.target.value)}
            >
              <option value="">
                {loadingRAP ? "Memuat RAP..." : "-- Pilih Item RAP --"}
              </option>

              {rapList.map((item) => (
                <option key={item.id} value={item.id_rab}>
                  {item.kategori.nama} - {item.uraian}
                </option>
              ))}
            </select>
          </div>

          {/* INFO RAP */}
          {selectedRAP && (
            <div className="col-span-2 rounded-md border bg-gray-50 p-4">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Kategori</div>
                  <div className="font-medium">{selectedRAP.kategori.kode}</div>
                </div>

                <div>
                  <div className="text-gray-500">Qty RAP</div>
                  <div className="font-medium">
                    {Number(selectedRAP.qty).toLocaleString("id-ID")}{" "}
                    {selectedRAP.satuan}
                  </div>
                </div>

                <div>
                  <div className="text-gray-500">Harga RAP</div>
                  <div className="font-medium">
                    Rp {Number(selectedRAP.harga).toLocaleString("id-ID")}
                  </div>
                </div>

                <div>
                  <div className="text-gray-500">Total RAP</div>
                  <div className="font-semibold text-blue-600">
                    Rp {Number(selectedRAP.total).toLocaleString("id-ID")}
                  </div>
                </div>
              </div>
            </div>
          )}

          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(event) => handleChange("tanggal", event.target.value)}
          />

          <Input
            label="Nomor Bukti"
            value={form.no_bukti}
            placeholder="Contoh: REAL-001"
            onChange={(event) => handleChange("no_bukti", event.target.value)}
          />

          <Input
            label="Kategori"
            value={selectedRAP?.kategori.nama ?? ""}
            readOnly
          />

          <Input label="Uraian" value={form.uraian} readOnly />

          <Input
            label="Qty"
            type="number"
            value={form.qty}
            min={0}
            step="0.01"
            onChange={(event) =>
              handleChange("qty", Number(event.target.value))
            }
          />

          <Input label="Satuan" value={form.satuan} readOnly />

          <Input label="Harga" type="number" value={form.harga} readOnly />

          {/* METODE PEMBAYARAN */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Metode Pembayaran
            </label>

            <select
              className="w-full rounded-md border border-gray-300 p-2"
              value={form.metode_pembayaran}
              disabled={saving}
              onChange={(event) =>
                handleChange(
                  "metode_pembayaran",
                  event.target.value as MetodePembayaran,
                )
              }
            >
              <option value="KAS">Kas Proyek</option>

              <option value="KAS_BESAR">Kas Besar</option>

              <option value="KAS_KECIL">Kas Kecil</option>

              <option value="BANK">Bank</option>

              <option value="HUTANG">Hutang Supplier</option>
            </select>
          </div>

          <Input
            label="Keterangan"
            value={form.keterangan}
            onChange={(event) => handleChange("keterangan", event.target.value)}
          />

          <Input
            label="Total Realisasi"
            value={`Rp ${total.toLocaleString("id-ID")}`}
            readOnly
          />
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={saving || loadingRAP || !form.id_rab}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Simpan
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
