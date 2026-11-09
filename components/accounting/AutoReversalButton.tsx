"use client";

import Swal from "sweetalert2";
import { RefreshCw } from "lucide-react";
import { JSX } from "react";

export default function AutoReversalButton(): JSX.Element {
  async function handleClick(): Promise<void> {
    const confirm = await Swal.fire({
      title: "Auto Reversal?",
      text: "Jurnal lama akan dibalik (tidak dihapus)",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, lanjutkan",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch("/api/jurnal/auto-reversal", {
      method: "POST",
    });

    const json = await res.json();

    if (!res.ok) {
      Swal.fire("Error", json.error, "error");
      return;
    }

    Swal.fire("Sukses", `Berhasil reversal ${json.total} jurnal`, "success");

    window.location.reload();
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded"
    >
      <RefreshCw className="w-4 h-4" />
      Auto Reversal
    </button>
  );
}
