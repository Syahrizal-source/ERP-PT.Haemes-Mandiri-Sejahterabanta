"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";

type InvoiceReminder = {
  id: number;
  no_invoice: string;
  customer: string;
  nominal: number;
  tanggal_jatuh_tempo: string;
  status: string;
};

export default function NotificationBell() {
  const [data, setData] = useState<InvoiceReminder[]>([]);
  const [open, setOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  const prevIds = useRef<number[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const router = useRouter();

  /* =========================
     INIT AUDIO (FIX UTAMA)
  ========================= */
  useEffect(() => {
    const audio = new Audio("/sounds/notification.mp3");
    audio.preload = "auto";
    audio.volume = 1;

    audioRef.current = audio;
  }, []);

  /* =========================
     ENABLE SOUND (WAJIB)
  ========================= */
  useEffect(() => {
    function enable(): void {
      setSoundEnabled(true);
      window.removeEventListener("click", enable);
    }

    window.addEventListener("click", enable);

    return () => window.removeEventListener("click", enable);
  }, []);

  /* =========================
     FETCH DATA
  ========================= */
  async function fetchData(): Promise<void> {
    try {
      const res = await fetch("/api/invoice/reminder", {
        cache: "no-store",
      });

      if (!res.ok) return;

      const result: InvoiceReminder[] = await res.json();

      /* =========================
         DETEKSI DATA BARU (FIX)
      ========================= */
      const newIds = result.map((r) => r.id);

      const hasNew =
        newIds.length > prevIds.current.length ||
        newIds.some((id) => !prevIds.current.includes(id));

      if (hasNew && soundEnabled && audioRef.current) {
        try {
          audioRef.current.currentTime = 0;
          await audioRef.current.play();
        } catch {
          // ignore autoplay block
        }
      }

      prevIds.current = newIds;
      setData(result);
    } catch (error) {
      console.error("NOTIFICATION ERROR:", error);
    }
  }

  /* =========================
     AUTO REFRESH
  ========================= */
  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 30000);

    return () => clearInterval(interval);
  }, [soundEnabled]);

  /* =========================
     WARNA STATUS
  ========================= */
  function getStatusColor(dateStr: string): string {
    const today = new Date();
    const due = new Date(dateStr);

    const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    if (diff < 0) return "bg-red-50 border-l-4 border-red-500";
    if (diff <= 3) return "bg-yellow-50 border-l-4 border-yellow-500";

    return "";
  }

  /* =========================
     CLICK
  ========================= */
  function handleClick(id: number): void {
    setOpen(false);
    router.push(`/accounting/invoice/${id}`);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 hover:bg-gray-100 rounded"
      >
        <Bell className="w-5 h-5" />

        {data.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 rounded-full">
            {data.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white border rounded shadow-lg z-50">
          <div className="p-3 border-b font-semibold">Reminder Invoice</div>

          <div className="max-h-80 overflow-y-auto">
            {data.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">
                Tidak ada tagihan
              </div>
            ) : (
              data.map((item) => {
                const tanggal = new Date(
                  item.tanggal_jatuh_tempo,
                ).toLocaleDateString("id-ID");

                return (
                  <div
                    key={item.id}
                    onClick={() => handleClick(item.id)}
                    className={`p-3 border-b text-sm cursor-pointer hover:bg-gray-50 ${getStatusColor(
                      item.tanggal_jatuh_tempo,
                    )}`}
                  >
                    <div className="font-semibold">{item.no_invoice}</div>

                    <div className="text-gray-600">{item.customer}</div>

                    <div className="text-xs">Jatuh tempo: {tanggal}</div>

                    <div className="text-right font-semibold">
                      {item.nominal.toLocaleString("id-ID")}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
