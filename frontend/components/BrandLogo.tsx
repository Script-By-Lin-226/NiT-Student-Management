"use client";

import { useState } from "react";

export default function BrandLogo({ className }: { className?: string }) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <img
      src="/icons/logo_png.png"
      alt="NiT Portal"
      className={className}
      onError={() => setVisible(false)}
    />
  );
}

