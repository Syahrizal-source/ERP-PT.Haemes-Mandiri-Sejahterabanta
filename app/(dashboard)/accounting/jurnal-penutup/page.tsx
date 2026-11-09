"use client";

import { useEffect, useState } from "react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Swal from "sweetalert2";

type PeriodeRow = {
  id_periode: number;
  nama_periode: string;
  status: "OPEN" | "CLOSED";
};

export default function JurnalPenutupPage() {
  const [periode, setPeriode] = useState<PeriodeRow[]>([]);

  const [idPeriode, setIdPeriode] = useState<number>(0);

  const [loading, setLoading] =
    useState<boolean>(false); /* =========================
     LOAD PERIODE
  ========================= */

  useEffect(() => {
    async function fetchPeriode(): Promise<void> {
      try {
        const res = await fetch("/api/periode");

        if (!res.ok) {
          return;
        }

        const data: PeriodeRow[] = await res.json();

        setPeriode(data); /* =========================
           AUTO PILIH OPEN
        ========================= */

        const openPeriode = data.find((item) => item.status === "OPEN");

        if (openPeriode) {
          setIdPeriode(openPeriode.id_periode);
        }
      } catch (error) {
        console.error("FETCH PERIODE ERROR:", error);
      }
    }

    void fetchPeriode();
  }, []); /* =========================
     CURRENT PERIODE
  ========================= */

  const currentPeriode = periode.find((item) => item.id_periode === idPeriode);

  const isOpen: boolean =
    currentPeriode?.status === "OPEN"; /* =========================
     HANDLE CLOSING
  ========================= */

  async function handleClosing(): Promise<void> {
    if (idPeriode === 0) {
      await Swal.fire({
        icon: "warning",
        title: "Periode belum dipilih",
        text: "Pilih periode terlebih dahulu",
      });

      return;
    }

    if (!isOpen) {
      await Swal.fire({
        icon: "warning",
        title: "Periode CLOSED",
        text: "Hanya periode OPEN yang dapat ditutup",
      });

      return;
    }

    const confirm = await Swal.fire({
      title: "Jalankan Jurnal Penutup?",
      text: "Proses closing akan membuat jurnal penutup otomatis",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Jalankan",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) {
      return;
    }

    try {
      setLoading(true);

      const tanggal: string = new Date().toISOString().split("T")[0];

      const res = await fetch("/api/jurnal-penutup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_periode: idPeriode,
          tanggal,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        await Swal.fire({
          icon: "error",
          title: "Jurnal Penutup Gagal",
          text: data.error ?? "Terjadi kesalahan",
        });

        return;
      }

      await Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Jurnal penutup berhasil dibuat",
      });
    } catch (error) {
      console.error("JURNAL PENUTUP ERROR:", error);

      await Swal.fire({
        icon: "error",
        title: "System Error",
        text: "Terjadi kesalahan sistem",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Jurnal Penutup">
           {" "}
      <div className="space-y-4">
               {" "}
        {/* =========================
            SELECT PERIODE
        ========================= */}
               {" "}
        <div>
                   {" "}
          <label className="block mb-2 text-sm font-medium">
                        Periode          {" "}
          </label>
                   {" "}
          <select
            value={idPeriode}
            onChange={(e) => setIdPeriode(Number(e.target.value))}
            className="border p-2 w-full rounded-lg"
          >
                       {" "}
            <option value={0}>              Pilih Periode             </option> 
                     {" "}
            {periode.map((item) => (
              <option key={item.id_periode} value={item.id_periode}>
                                Periode                 {item.nama_periode}    
                            - {item.status}             {" "}
              </option>
            ))}
                     {" "}
          </select>
                 {" "}
        </div>
               {" "}
        {/* =========================
            STATUS
        ========================= */}
               {" "}
        <div className="text-sm">
                   {" "}
          {isOpen ? (
            <span className="text-green-600 font-medium">
                            Status:                             OPEN          
               {" "}
            </span>
          ) : (
            <span className="text-red-600 font-medium">
                            Status:                             CLOSED          
               {" "}
            </span>
          )}
                 {" "}
        </div>
               {" "}
        {/* =========================
            BUTTON
        ========================= */}
               {" "}
        <Button
          onClick={handleClosing}
          disabled={loading || !isOpen || idPeriode === 0}
        >
                    {loading ? "Memproses..." : "Jalankan Jurnal Penutup"}     
           {" "}
        </Button>
             {" "}
      </div>
         {" "}
    </Card>
  );
}
