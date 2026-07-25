"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type Jenis = "MASUK" | "KELUAR" | "BIAYA_BANK" | "PAJAK_BANK";

type RekeningBank = {
  id: number;
  nama_bank: string;
  no_rekening: string;
  nama_pemilik: string;
};

interface FormState {
  id_rekening: number;
  tanggal: string;
  deskripsi: string;
  debit: number;
  kredit: number;
  jenis: Jenis;
}

export default function CreateRekeningKoranPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    id_rekening: 1,
    tanggal: "",
    deskripsi: "",
    debit: 0,
    kredit: 0,
    jenis: "MASUK",
  });

  const [rekeningList, setRekeningList] = useState<RekeningBank[]>([]);

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  /* =========================
     AUTO RULE JENIS
  ========================= */

  function handleJenis(jenis: Jenis): void {
    if (jenis === "MASUK") {
      setForm((p) => ({ ...p, jenis, kredit: 0 }));
    }

    if (
      jenis === "KELUAR" ||
      jenis === "BIAYA_BANK" ||
      jenis === "PAJAK_BANK"
    ) {
      setForm((p) => ({ ...p, jenis, debit: 0 }));
    }
  }

  function autoJenis(deskripsi: string): Jenis {
    const text = deskripsi.toLowerCase();

    if (text.includes("fee") || text.includes("admin")) {
      return "BIAYA_BANK";
    }

    if (text.includes("tax")) {
      return "PAJAK_BANK";
    }

    return "MASUK";
  }

  useEffect(() => {
    fetch("/api/rekening-bank")
      .then((res) => res.json())
      .then((data: RekeningBank[]) => {
        setRekeningList(data);

        if (data.length > 0) {
          setForm((prev) => ({
            ...prev,
            id_rekening: data[0].id,
          }));
        }
      });
  }, []);
  const debit = Math.max(0, form.debit);
  const kredit = Math.max(0, form.kredit);

  async function handleSubmit(): Promise<void> {
    const res = await fetch("/api/rekening-koran", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...form,
        debit,
        kredit,
        saldo: 0,
      }),
    });

    const result = await res.json();

    if (!form.id_rekening || form.id_rekening <= 0) {
      Swal.fire("Error", "Pilih rekening terlebih dahulu", "error");
      return;
    }

    if (debit > 0 && kredit > 0) {
      Swal.fire("Error", "Debit dan kredit tidak boleh bersamaan", "error");
      return;
    }

    if (debit <= 0 && kredit <= 0) {
      Swal.fire("Error", "Isi debit atau kredit", "error");
      return;
    }

    Swal.fire("Sukses", result.message, "success").then(() => {
      router.push("/accounting/rekening-koran");
      router.refresh();
    });
  }

  return (
    <Card title="Tambah Rekening Koran">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Tanggal"
          type="date"
          value={form.tanggal}
          onChange={(e) => handleChange("tanggal", e.target.value)}
        />

        <Input
          label="Deskripsi"
          value={form.deskripsi}
          onChange={(e) => {
            const val = e.target.value;
            const jenis = autoJenis(val);

            setForm((prev) => ({
              ...prev,
              deskripsi: val,
              jenis,
              debit: jenis === "MASUK" ? prev.debit : 0,
              kredit: jenis !== "MASUK" ? prev.kredit : 0,
            }));
          }}
        />

        <div>
          <label>Jenis</label>
          <select
            className="w-full border p-2 rounded"
            value={form.jenis}
            onChange={(e) => handleJenis(e.target.value as Jenis)}
          >
            <option value="MASUK">MASUK</option>
            <option value="KELUAR">KELUAR</option>
            <option value="BIAYA_BANK">BIAYA BANK</option>
            <option value="PAJAK_BANK">PAJAK BANK</option>
          </select>
        </div>

        <div>
          <label className="text-sm">Rekening Bank</label>
          <select
            className="w-full border p-2 rounded"
            value={form.id_rekening}
            onChange={(e) =>
              handleChange("id_rekening", Number(e.target.value))
            }
          >
            {rekeningList.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nama_bank} - {r.no_rekening}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Debit"
          type="number"
          value={form.debit}
          onChange={(e) => handleChange("debit", Number(e.target.value))}
        />

        <Input
          label="Kredit"
          type="number"
          value={form.kredit}
          onChange={(e) => handleChange("kredit", Number(e.target.value))}
        />
      </div>

      <div className="mt-4 text-sm">
        <p>Debit: {debit.toLocaleString("id-ID")}</p>
        <p>Kredit: {kredit.toLocaleString("id-ID")}</p>
      </div>

      <Button className="mt-4" onClick={handleSubmit}>
        Simpan
      </Button>
    </Card>
  );
}
