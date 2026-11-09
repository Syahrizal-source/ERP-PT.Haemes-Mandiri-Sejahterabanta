"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";

import AutoReversalButton from "@/components/accounting/AutoReversalButton";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface JurnalItem {
  id_jurnal: number;
  tanggal: string;
  no_bukti: string;
  sumber: string;
  keterangan: string;
  id_periode: number;
  is_posted: boolean;
}

interface PeriodeItem {
  id_periode: number;
  nama_periode: string;
  status: "OPEN" | "CLOSED";
}

export default function JurnalListPage() {
  const router = useRouter();

  const [data, setData] = useState<JurnalItem[]>([]);
  const [periodeList, setPeriodeList] = useState<PeriodeItem[]>([]);
  const [selectedPeriode, setSelectedPeriode] = useState<number>(0);
  const [loadingPeriode, setLoadingPeriode] = useState<boolean>(true);
  const [loadingJurnal, setLoadingJurnal] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  /*
   * Mengambil periode yang tersedia.
   * Periode OPEN diprioritaskan, sesuai alur halaman sebelumnya.
   */
  useEffect(() => {
    const controller = new AbortController();

    async function loadPeriode(): Promise<void> {
      setLoadingPeriode(true);
      setErrorMessage("");

      try {
        const response = await fetch("/api/periode", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Gagal mengambil periode. HTTP ${response.status}.`);
        }

        const result: PeriodeItem[] = await response.json();

        if (!Array.isArray(result)) {
          throw new Error("Format data periode dari API tidak valid.");
        }

        setPeriodeList(result);

        const openPeriode = result.find((item) => item.status === "OPEN");

        if (openPeriode) {
          setSelectedPeriode(openPeriode.id_periode);
        } else if (result.length > 0) {
          setSelectedPeriode(result[0].id_periode);
        } else {
          setSelectedPeriode(0);
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("FETCH PERIODE ERROR:", error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat mengambil periode.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingPeriode(false);
        }
      }
    }

    void loadPeriode();

    return () => {
      controller.abort();
    };
  }, []);

  /*
   * Mengambil jurnal berdasarkan periode yang dipilih.
   *
   * Nomor bukti ditampilkan persis seperti yang dikirim API.
   * Tidak membuat nomor baru, tidak mengubah tanggal, dan tidak
   * mengubah nomor bukti otomatis yang dibuat oleh sistem.
   */
  useEffect(() => {
    if (selectedPeriode <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData([]);
      setLoadingJurnal(false);
      return;
    }

    const controller = new AbortController();

    async function loadJurnal(): Promise<void> {
      setLoadingJurnal(true);
      setErrorMessage("");

      try {
        const query = new URLSearchParams({
          periode: String(selectedPeriode),
        });

        const response = await fetch(`/api/jurnal?${query.toString()}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Gagal mengambil jurnal. HTTP ${response.status}.`);
        }

        const result: JurnalItem[] = await response.json();

        if (!Array.isArray(result)) {
          throw new Error("Format data jurnal dari API tidak valid.");
        }

        /*
         * Pertahankan no_bukti dari database/API sebagai teks.
         * Tidak ada penggantian prefix, tanggal, atau nomor urut.
         */
        const safeRows: JurnalItem[] = result.map((item) => ({
          ...item,
          no_bukti: String(item.no_bukti ?? ""),
        }));

        setData(safeRows);
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("FETCH JURNAL ERROR:", error);
        setData([]);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat mengambil jurnal.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingJurnal(false);
        }
      }
    }

    void loadJurnal();

    return () => {
      controller.abort();
    };
  }, [selectedPeriode]);

  const currentPeriode = periodeList.find(
    (item) => item.id_periode === selectedPeriode,
  );

  const isOpen: boolean = currentPeriode?.status === "OPEN";
  const loading: boolean = loadingPeriode || loadingJurnal;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Card title="Jurnal Umum">
        {/* Filter periode dan tombol aksi */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-sm">
            <label
              htmlFor="filter-periode-jurnal"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Periode
            </label>

            <select
              id="filter-periode-jurnal"
              value={selectedPeriode}
              onChange={(event) =>
                setSelectedPeriode(Number(event.target.value))
              }
              disabled={loadingPeriode || periodeList.length === 0}
              className="w-full rounded-lg border bg-white px-3 py-2"
            >
              {periodeList.length === 0 && (
                <option value={0}>Tidak ada periode</option>
              )}

              {periodeList.map((periode) => (
                <option key={periode.id_periode} value={periode.id_periode}>
                  Periode {periode.nama_periode} - {periode.status}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <AutoReversalButton />

            <Button
              onClick={() => router.push("/accounting/jurnal/form")}
              disabled={!isOpen}
            >
              <Plus className="mr-2 h-4 w-4" />
              Tambah Jurnal
            </Button>
          </div>
        </div>

        {/* Status periode */}
        <div className="mb-4 text-sm" aria-live="polite">
          {loadingPeriode ? (
            <span className="text-gray-500">Memuat status periode...</span>
          ) : currentPeriode ? (
            isOpen ? (
              <span className="font-medium text-green-600">
                Periode Aktif: OPEN
              </span>
            ) : (
              <span className="font-medium text-red-600">
                Periode Aktif: CLOSED
              </span>
            )
          ) : (
            <span className="text-gray-500">
              Belum ada periode yang tersedia.
            </span>
          )}
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {errorMessage}
          </div>
        )}

        {/* Tabel jurnal */}
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memuat data...
          </div>
        ) : (
          <div className="w-full overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-3 py-2 text-left">Tanggal</th>
                  <th className="border px-3 py-2 text-left">No Bukti</th>
                  <th className="border px-3 py-2 text-left">Keterangan</th>
                  <th className="border px-3 py-2 text-left">Sumber</th>
                  <th className="border px-3 py-2 text-left">Status</th>
                </tr>
              </thead>

              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="border px-3 py-6 text-center text-gray-500"
                    >
                      Tidak ada data jurnal pada periode ini.
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr
                      key={item.id_jurnal}
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                      onClick={() =>
                        router.push(`/accounting/jurnal/${item.id_jurnal}`)
                      }
                    >
                      <td className="whitespace-nowrap border px-3 py-2">
                        {item.tanggal}
                      </td>

                      <td className="whitespace-nowrap border px-3 py-2 font-mono">
                        {item.no_bukti}
                      </td>

                      <td className="border px-3 py-2">{item.keterangan}</td>

                      <td className="whitespace-nowrap border px-3 py-2">
                        {item.sumber}
                      </td>

                      <td className="whitespace-nowrap border px-3 py-2">
                        {item.is_posted ? (
                          <span className="font-medium text-green-600">
                            Posted
                          </span>
                        ) : (
                          <span className="font-medium text-yellow-600">
                            Draft
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
