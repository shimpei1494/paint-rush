/**
 * Self-contained QR code display. Renders an <img> against a public QR
 * generation API instead of pulling in a QR-rendering dependency. Kept
 * isolated in this one file so it can be swapped for `qrcode.react` (or any
 * other client-side renderer) later without touching call sites.
 */
export default function JoinQr({ url }: { url: string }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`;

  return (
    <div className="inline-flex flex-col items-center gap-2 rounded-xl bg-white p-3">
      {/* External, dynamically-sized image — plain <img> is intentional here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="参加用QRコード"
        width={240}
        height={240}
        className="h-auto w-full max-w-[240px]"
      />
    </div>
  );
}
