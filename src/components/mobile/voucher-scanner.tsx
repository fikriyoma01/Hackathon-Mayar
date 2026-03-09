"use client";

import { Camera, CameraOff, ScanLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type BarcodeDetectorResult = {
  rawValue?: string;
};

type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<BarcodeDetectorResult[]>;
};

declare global {
  interface Window {
    BarcodeDetector?: new (options?: {
      formats?: string[];
    }) => BarcodeDetectorInstance;
  }
}

function normalizeVoucherCode(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith("iftarrelay://voucher/")) {
    return trimmed.split("/").pop()?.toUpperCase() ?? trimmed.toUpperCase();
  }

  if (trimmed.includes("/voucher/")) {
    return trimmed.split("/").pop()?.toUpperCase() ?? trimmed.toUpperCase();
  }

  return trimmed.toUpperCase();
}

export function VoucherScanner({
  onDetect,
}: {
  onDetect: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const frameRef = useRef<number | null>(null);

  const [isSupported] = useState(
    () =>
      typeof window !== "undefined" &&
      Boolean(window.BarcodeDetector) &&
      Boolean(navigator.mediaDevices?.getUserMedia),
  );
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const stopScanner = () => {
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
  };

  useEffect(() => () => stopScanner(), []);

  const scanFrame = async () => {
    const detector = detectorRef.current;
    const video = videoRef.current;

    if (!detector || !video || video.readyState < 2) {
      frameRef.current = window.requestAnimationFrame(() => {
        void scanFrame();
      });
      return;
    }

    try {
      const results = await detector.detect(video);
      const rawValue = results[0]?.rawValue;

      if (rawValue) {
        const normalized = normalizeVoucherCode(rawValue);
        setLastResult(normalized);
        onDetect(normalized);
        stopScanner();
        return;
      }
    } catch {
      setError("Kamera aktif, tetapi QR belum bisa dibaca. Arahkan ke kode voucher.");
    }

    frameRef.current = window.requestAnimationFrame(() => {
      void scanFrame();
    });
  };

  const startScanner = async () => {
    if (!window.BarcodeDetector) {
      setError("Browser ini belum mendukung scanner QR berbasis kamera.");
      return;
    }

    setError(null);

    try {
      detectorRef.current = new window.BarcodeDetector({
        formats: ["qr_code"],
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment",
          },
        },
        audio: false,
      });

      streamRef.current = stream;
      setIsScanning(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      void scanFrame();
    } catch {
      setError("Izin kamera ditolak atau perangkat tidak memiliki kamera belakang.");
      stopScanner();
    }
  };

  return (
    <div className="space-y-3 rounded-[24px] border border-[var(--line)] bg-[rgba(19,35,29,0.03)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            Scan QR voucher
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">
            Buka kamera untuk membaca QR voucher asli dari halaman publik atau layar penerima.
          </p>
        </div>
        <button
          type="button"
          disabled={!isSupported}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            if (isScanning) {
              stopScanner();
              return;
            }

            void startScanner();
          }}
        >
          {isScanning ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {isScanning ? "Matikan kamera" : "Buka kamera"}
        </button>
      </div>

      {isScanning ? (
        <video
          ref={videoRef}
          muted
          playsInline
          className="h-56 w-full rounded-[20px] bg-black object-cover"
        />
      ) : (
        <div className="flex h-28 items-center justify-center rounded-[20px] border border-dashed border-[var(--line)] bg-white text-center text-xs text-[var(--ink-soft)]">
          {isSupported
            ? "Kamera siap dipakai untuk scan QR voucher."
            : "Browser ini belum mendukung BarcodeDetector. Gunakan input manual."}
        </div>
      )}

      {lastResult ? (
        <p className="inline-flex items-center gap-2 text-xs text-emerald-700">
          <ScanLine className="h-4 w-4" />
          QR terbaca: {lastResult}
        </p>
      ) : null}

      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
