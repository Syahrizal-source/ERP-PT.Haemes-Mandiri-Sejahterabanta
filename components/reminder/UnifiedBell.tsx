"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";

type ReminderItem = {
  id: number;
  no: string;
  nama: string;
  nominal: number;
  tanggal_jatuh_tempo: string;
  sumber: "INVOICE" | "HUTANG";
};

export default function UnifiedBell() {
  const [data, setData] = useState<ReminderItem[]>([]);
  const [open, setOpen] = useState<boolean>(false);

  const prevIds = useRef<string[]>([]);
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
    const res = await fetch("/api/reminder/all", {
      cache: "no-store",
    });

    if (!res.ok) return;

    const result: ReminderItem[] = await res.json();

    const ids = result.map((r) => r.id + r.sumber);

    const hasNew =
      ids.length > prevIds.current.length ||
      ids.some((i) => !prevIds.current.includes(i));

    if (hasNew && soundEnabled.current && audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
      } catch {}
    }

    prevIds.current = ids;
    setData(result);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    const i = setInterval(fetchData, 30000);
    return () => clearInterval(i);
  }, []);

  function handleClick(item: ReminderItem): void {
    setOpen(false);

    if (item.sumber === "INVOICE") {
      router.push(`/accounting/invoice/${item.id}`);
    } else {
      router.push(`/accounting/hutang/${item.id}`);
    }
  }

  function getColor(dateStr: string): string {
    const diff =
      // eslint-disable-next-line react-hooks/purity
      (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24);

    if (diff < 0) return "bg-red-50 border-l-4 border-red-500";
    if (diff <= 3) return "bg-yellow-50 border-l-4 border-yellow-500";
    return "";
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
          <div className="p-3 border-b font-semibold">
            Reminder (Invoice & Hutang)
          </div>

          <div className="max-h-80 overflow-y-auto">
            {data.length === 0 ? (
              <div className="p-4 text-center text-sm">Tidak ada data</div>
            ) : (
              data.map((item, i) => (
                <div
                  key={i}
                  onClick={() => handleClick(item)}
                  className={`p-3 border-b cursor-pointer ${getColor(
                    item.tanggal_jatuh_tempo,
                  )}`}
                >
                  <div className="font-semibold">
                    {item.no} ({item.sumber})
                  </div>

                  <div className="text-sm">{item.nama}</div>

                  <div className="text-xs">
                    {new Date(item.tanggal_jatuh_tempo).toLocaleDateString(
                      "id-ID",
                    )}
                  </div>

                  <div className="text-right font-semibold">
                    {item.nominal.toLocaleString("id-ID")}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
