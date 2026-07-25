"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  Lock,
  Unlock,
  CheckCircle,
} from "lucide-react";

type Periode = {
  id_periode: number;
  is_closed: boolean;
  status: "OPEN" | "CLOSED";
};

export default function TutupBukuPage() {
  const [periode, setPeriode] =
    useState<Periode | null>(null);

  const [loading, setLoading] =
    useState<boolean>(false);

  const [
    activePeriodeId,
    setActivePeriodeId,
  ] = useState<number>(0);

  /* =========================
     LOAD PERIODE
  ========================= */
  async function fetchPeriode(): Promise<void> {
    try {
      const res = await fetch(
        "/api/periode",
      );

      if (!res.ok) {
        throw new Error(
          "Gagal load periode",
        );
      }

      const data: Periode[] =
        await res.json();

      /* =========================
         PRIORITAS OPEN
      ========================= */
      const active =
        data.find(
          (item) =>
            item.status === "OPEN",
        ) ?? data[0];

      if (!active) {
        throw new Error(
          "Periode tidak ditemukan",
        );
      }

      setPeriode(active);

      setActivePeriodeId(
        active.id_periode,
      );
    } catch {
      await Swal.fire(
        "Error",
        "Gagal load periode",
        "error",
      );
    }
  }

  useEffect(() => {
    void fetchPeriode();
  }, []);

  /* =========================
     TUTUP BUKU
  ========================= */
  async function handleTutupBuku(): Promise<void> {
    if (!periode) {
      return;
    }

    if (periode.status === "CLOSED") {
      await Swal.fire(
        "Info",
        "Periode sudah ditutup",
        "info",
      );

      return;
    }

    const confirm = await Swal.fire({
      title: "Tutup Buku?",
      text:
        "Periode akan dikunci & dibuat periode baru otomatis",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText:
        "Ya, Tutup",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        "/api/laporan/tutup-buku",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id_periode:
              activePeriodeId,
          }),
        },
      );

      const data =
        await res.json();

      if (!res.ok) {
        await Swal.fire(
          "Gagal",
          data.error || "Error",
          "error",
        );

        return;
      }

      await Swal.fire(
        "Berhasil",
        "Tutup buku + opening balance berhasil",
        "success",
      );

      await fetchPeriode();
    } catch {
      await Swal.fire(
        "Error",
        "Terjadi kesalahan",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     BUKA BUKU
  ========================= */
  async function handleBukaBuku(): Promise<void> {
    if (!periode) {
      return;
    }

    if (periode.status === "OPEN") {
      await Swal.fire(
        "Info",
        "Masih ada periode OPEN",
        "info",
      );

      return;
    }

    const confirm = await Swal.fire({
      title: "Buka Buku?",
      text:
        "Periode akan dibuka kembali tanpa menghapus jurnal",
      icon: "question",
      showCancelButton: true,
      confirmButtonText:
        "Ya, Buka",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        "/api/laporan/buka-buku",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id_periode:
              activePeriodeId,
          }),
        },
      );

      const data =
        await res.json();

      if (!res.ok) {
        await Swal.fire(
          "Gagal",
          data.error || "Error",
          "error",
        );

        return;
      }

      await Swal.fire(
        "Berhasil",
        "Periode berhasil dibuka",
        "success",
      );

      await fetchPeriode();
    } catch {
      await Swal.fire(
        "Error",
        "Terjadi kesalahan",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!periode) {
    return (
      <div className="p-6">
        Loading...
      </div>
    );
  }

  const isOpen: boolean =
    periode.status === "OPEN";

  return (
    <div className="p-6 space-y-6">
      {/* =========================
          TITLE
      ========================= */}
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <CheckCircle className="w-6 h-6" />
        Manajemen Tutup Buku
      </h1>

      {/* =========================
          STATUS
      ========================= */}
      <div className="p-5 rounded-xl border shadow-sm flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-500">
            Periode Aktif
          </p>

          <p className="text-lg font-semibold">
            ID:
            {" "}
            {periode.id_periode}
          </p>
        </div>

        <span
          className={`px-4 py-2 rounded-full text-sm font-semibold ${isOpen
              ? "bg-green-100 text-green-600"
              : "bg-red-100 text-red-600"
            }`}
        >
          {isOpen
            ? "OPEN"
            : "CLOSED"}
        </span>
      </div>

      {/* =========================
          BUTTON
      ========================= */}
      <div className="flex gap-4">
        {/* TUTUP BUKU */}
        <button
          type="button"
          onClick={
            handleTutupBuku
          }
          disabled={
            loading || !isOpen
          }
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-white transition-all ${loading || !isOpen
              ? "bg-red-400 opacity-50 cursor-not-allowed"
              : "bg-red-600 hover:bg-red-700"
            }`}
        >
          <Lock className="w-4 h-4" />
          Tutup Buku
        </button>

        {/* BUKA BUKU */}
        <button
          type="button"
          onClick={
            handleBukaBuku
          }
          disabled={
            loading || isOpen
          }
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-white transition-all ${loading || isOpen
              ? "bg-green-400 opacity-50 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
            }`}
        >
          <Unlock className="w-4 h-4" />
          Buka Buku
        </button>
      </div>
    </div>
  );
}