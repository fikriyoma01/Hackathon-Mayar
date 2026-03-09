import Image from "next/image";
import QRCode from "qrcode";

export async function QrGrid({
  value,
  size = 280,
}: {
  value: string;
  size?: number;
}) {
  const dataUrl = await QRCode.toDataURL(value, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: size,
    color: {
      dark: "#102822",
      light: "#ffffff",
    },
  });

  return (
    <div className="rounded-[28px] border border-[var(--line)] bg-white p-4">
      <Image
        src={dataUrl}
        alt={`QR ${value}`}
        width={size}
        height={size}
        className="mx-auto h-auto w-full max-w-[280px] rounded-[20px]"
      />
      <p className="mt-4 break-all text-center text-xs text-[var(--ink-soft)]">{value}</p>
    </div>
  );
}
