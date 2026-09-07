import React, { Suspense } from "react";

const QrInner = React.lazy(() => import("qrcode.react").then((m) => ({ default: m.QRCodeSVG })));

// QR is only needed in the Seed + Results panel, so it loads on demand
// instead of weighing down the main bundle.
export default function ShareQrCode({ value }) {
  if (!value) return null;
  return (
    <Suspense fallback={<div style={{ width: 96, height: 96 }} aria-busy="true" />}>
      <QrInner value={value} size={96} aria-label="Share link QR code" />
    </Suspense>
  );
}
