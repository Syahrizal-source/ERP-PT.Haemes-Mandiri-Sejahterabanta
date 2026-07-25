"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

import { armadaSchema, type ArmadaInput } from "@/lib/validators/armada";

function toSafeNumber(value: string): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 0;
  if (parsed < 0) return 0;
  return parsed;
}

export default function CreateArmadaPage() {
  const router = useRouter();

  const [form, setForm] = useState<ArmadaInput>({
    tanggal: "",
    kode_transaksi: "",
    no_polisi: "",
    no_pintu: "",
    supir: "",
    hp: "",
    buangan_galian: "",
    m3: 0,
    rit: 0,
    tagihan: 0,
    uang_jalan: 0,
    belanja: 0,
    do_qty: 0,
    mel: 0,
    tambal_ban: 0,
    inap_um: 0,
    sub_bak_besar: 0,
    perg_solar: 0,
    kaca_film_bemper: 0,
    sparepart: 0,
    koordinasi: 0,
    adm: 0,
    stnk_kir: 0,
  });

  const [errorMessage, setErrorMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  function handleChange(field: keyof ArmadaInput, value: string): void {
    setForm((prev) => ({
      ...prev,
      [field]: typeof prev[field] === "number" ? toSafeNumber(value) : value,
    }));
  }

  async function handleSubmit(): Promise<void> {
    setErrorMessage("");

    const parsed = armadaSchema.safeParse(form);

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      if (first) setErrorMessage(first.message);
      return;
    }

    setLoading(true);

    const jumlah_tagihan = form.m3 * form.tagihan;

    const jumlah_uang_jalan =
      form.uang_jalan +
      form.belanja +
      form.mel +
      form.tambal_ban +
      form.inap_um +
      form.sub_bak_besar +
      form.perg_solar +
      form.kaca_film_bemper +
      form.sparepart +
      form.koordinasi +
      form.adm +
      form.stnk_kir;

    const jumlah_do = form.do_qty;
    const bersih = jumlah_tagihan - jumlah_uang_jalan;

    const payload = {
      ...parsed.data,
      user_id: 2,
      jumlah_tagihan,
      jumlah_uang_jalan,
      jumlah_do,
      bersih,
    };

    const res = await fetch("/api/armada", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal menyimpan armada",
      });
      return;
    }

    const result = await res.json();

    Swal.fire({
      position: "center",
      icon: "success",
      title: "Armada Berhasil Masuk",
      text: result.message,
      showConfirmButton: false,
      timer: 1500,
    }).then(() => {
      router.push("/transaksi/armada");
      router.refresh();
    });
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card title="Tambah Armada">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => handleChange("tanggal", e.target.value)}
          />

          <Input
            label="Kode Transaksi"
            value={form.kode_transaksi}
            onChange={(e) => handleChange("kode_transaksi", e.target.value)}
          />

          <Input
            label="No Polisi"
            value={form.no_polisi}
            onChange={(e) => handleChange("no_polisi", e.target.value)}
          />

          <Input
            label="No Pintu"
            value={form.no_pintu}
            onChange={(e) => handleChange("no_pintu", e.target.value)}
          />

          <Input
            label="Supir"
            value={form.supir}
            onChange={(e) => handleChange("supir", e.target.value)}
          />

          <Input
            label="HP"
            value={form.hp ?? ""}
            onChange={(e) => handleChange("hp", e.target.value)}
          />

          <Input
            label="Buangan / Galian"
            value={form.buangan_galian}
            onChange={(e) => handleChange("buangan_galian", e.target.value)}
          />

          <Input
            label="M3"
            type="number"
            value={form.m3}
            onChange={(e) => handleChange("m3", e.target.value)}
          />

          <Input
            label="Rit"
            type="number"
            value={form.rit}
            onChange={(e) => handleChange("rit", e.target.value)}
          />

          <Input
            label="Tagihan"
            type="number"
            value={form.tagihan}
            onChange={(e) => handleChange("tagihan", e.target.value)}
          />

          <Input
            label="Uang Jalan"
            type="number"
            value={form.uang_jalan}
            onChange={(e) => handleChange("uang_jalan", e.target.value)}
          />

          <Input
            label="Belanja"
            type="number"
            value={form.belanja}
            onChange={(e) => handleChange("belanja", e.target.value)}
          />

          <Input
            label="DO Qty"
            type="number"
            value={form.do_qty}
            onChange={(e) => handleChange("do_qty", e.target.value)}
          />

          <Input
            label="Mel"
            type="number"
            value={form.mel}
            onChange={(e) => handleChange("mel", e.target.value)}
          />

          <Input
            label="Tambal Ban"
            type="number"
            value={form.tambal_ban}
            onChange={(e) => handleChange("tambal_ban", e.target.value)}
          />

          <Input
            label="Inap UM"
            type="number"
            value={form.inap_um}
            onChange={(e) => handleChange("inap_um", e.target.value)}
          />

          <Input
            label="Sub Bak Besar"
            type="number"
            value={form.sub_bak_besar}
            onChange={(e) => handleChange("sub_bak_besar", e.target.value)}
          />

          <Input
            label="Perg Solar"
            type="number"
            value={form.perg_solar}
            onChange={(e) => handleChange("perg_solar", e.target.value)}
          />

          <Input
            label="Kaca Film Bemper"
            type="number"
            value={form.kaca_film_bemper}
            onChange={(e) => handleChange("kaca_film_bemper", e.target.value)}
          />

          <Input
            label="Sparepart"
            type="number"
            value={form.sparepart}
            onChange={(e) => handleChange("sparepart", e.target.value)}
          />

          <Input
            label="Koordinasi"
            type="number"
            value={form.koordinasi}
            onChange={(e) => handleChange("koordinasi", e.target.value)}
          />

          <Input
            label="ADM"
            type="number"
            value={form.adm}
            onChange={(e) => handleChange("adm", e.target.value)}
          />

          <Input
            label="STNK / KIR"
            type="number"
            value={form.stnk_kir}
            onChange={(e) => handleChange("stnk_kir", e.target.value)}
          />
        </div>

        {errorMessage && <p className="text-red-600 mt-4">{errorMessage}</p>}

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/transaksi/armada")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Simpan
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
