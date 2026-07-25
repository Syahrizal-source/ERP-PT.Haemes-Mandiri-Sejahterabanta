"use client";

import { useEffect, useRef } from "react";
import Swal from "sweetalert2";

type ReminderItem = {
  id: number;
  no: string;
  nama: string;
  nominal: number;
  tanggal_jatuh_tempo: string;
  sumber: "INVOICE" | "HUTANG";
};

export default function ReminderChecker(): null {
  const hasShown = useRef<boolean>(false);

  useEffect(() => {
    async function run(): Promise<void> {
      try {
        const res = await fetch("/api/reminder/all", {
          cache: "no-store",
        });

        if (!res.ok) return;

        const data: ReminderItem[] = await res.json();

        if (data.length === 0) return;
        if (hasShown.current) return;

        hasShown.current = true;

        /* =========================
           SORT PRIORITAS
        ========================= */
        const sorted = data.sort((a, b) => {
          const dateA = new Date(a.tanggal_jatuh_tempo).getTime();
          const dateB = new Date(b.tanggal_jatuh_tempo).getTime();
          return dateA - dateB;
        });

        /* =========================
           FORMAT HTML (FIX TOTAL)
        ========================= */
        const htmlList: string = sorted
          .map((item) => {
            if (!item.id || item.id === 0) return "";

            const tanggal = new Date(
              item.tanggal_jatuh_tempo,
            ).toLocaleDateString("id-ID");

            const nominal = Number(item.nominal).toLocaleString("id-ID");

            const warna = item.sumber === "HUTANG" ? "#dc2626" : "#2563eb";

            return `
              <div style="margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #eee;">
                <div style="font-weight:bold;color:${warna}">
                  ${item.no} (${item.sumber})
                </div>
                <div>${item.nama}</div>
                <div style="font-size:12px;color:#666;">
                  ${tanggal}
                </div>
                <div style="text-align:right;font-weight:bold;">
                  ${nominal}
                </div>
              </div>
            `;
          })
          .join("");

        /* =========================
           POPUP
        ========================= */
        await Swal.fire({
          icon: "warning",
          title: "Reminder (Invoice & Hutang)",
          html: htmlList,
          confirmButtonText: "OK",
          width: 600,
        });

        /* =========================
           SOUND (SETELAH KLIK)
        ========================= */
        try {
          const audio = new Audio("/sounds/notification.mp3");
          audio.volume = 1;
          await audio.play();
        } catch {
          // ignore
        }
      } catch (error) {
        console.error("REMINDER ERROR:", error);
      }
    }

    run();
  }, []);

  return null;
}
