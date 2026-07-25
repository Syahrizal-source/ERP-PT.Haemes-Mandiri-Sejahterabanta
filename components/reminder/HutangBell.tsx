"use client";

import { useEffect, useRef, useState } from "react";
import { Wallet } from "lucide-react";
import { useRouter } from "next/navigation";

type HutangReminder = {
  id: number;
  no_invoice: string;
  supplier: string;
  nominal: number;
  tanggal_jatuh_tempo: string;
};

export default function HutangBell() {
  const [data, setData] = useState<HutangReminder[]>([]);
  const [open, setOpen] = useState<boolean>(false);

  const prevIds = useRef<number[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const soundEnabled = useRef<boolean>(false);

  const router = useRouter();

  useEffect(() => {
    const audio = new Audio("/sounds/notification.mp3");
    audio.volume = 1;
    audioRef.current = audio;
  }, []);

  useEffect(() => {
    function enable(): void {
      soundEnabled.current = true;
      window.removeEventListener("click", enable);
    }

    window.addEventListener("click", enable);
    return () => window.removeEventListener("click", enable);
  }, []);

  async function fetchData(): Promise<void> {
    const res = await fetch("/api/hutang/reminder", {
      cache: "no-store",
    });

    if (!res.ok) return;

    const result: HutangReminder[] = await res.json();

    const newIds = result.map((r) => r.id);

    const hasNew =
      newIds.length > prevIds.current.length ||
      newIds.some((id) => !prevIds.current.includes(id));

    if (hasNew && soundEnabled.current && audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
      } catch {}
    }

    prevIds.current = newIds;
    setData(result);
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  function getColor(dateStr: string): string {
    const today = new Date();
    const due = new Date(dateStr);

    const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    if (diff < 0) return "bg-red-50 border-l-4 border-red-500";
    if (diff <= 3) return "bg-yellow-50 border-l-4 border-yellow-500";

    return "";
  }

  function handleClick(id: number): void {
    if (!id || id === 0) return; // 🔥 anti null

    setOpen(false);
    router.push(`/accounting/hutang/${id}`);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 hover:bg-gray-100 rounded"
      >
        <Wallet className="w-5 h-5" />

        {data.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 rounded-full">
            {data.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white border rounded shadow-lg z-50">
          <div className="p-3 border-b font-semibold">Reminder Hutang</div>

          <div className="max-h-80 overflow-y-auto">
            {data.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">
                Tidak ada hutang
              </div>
            ) : (
              data.map((item) => {
                if (!item.id || item.id === 0) return null; // 🔥 PROTEKSI

                const tanggal = new Date(
                  item.tanggal_jatuh_tempo,
                ).toLocaleDateString("id-ID");

                return (
                  <div
                    key={`hutang-${item.id}`} // 🔥 FIX KEY
                    onClick={() => handleClick(item.id)}
                    className={`p-3 border-b cursor-pointer ${getColor(
                      item.tanggal_jatuh_tempo,
                    )}`}
                  >
                    <div className="font-semibold">{item.no_invoice}</div>

                    <div className="text-sm text-gray-600">{item.supplier}</div>

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
