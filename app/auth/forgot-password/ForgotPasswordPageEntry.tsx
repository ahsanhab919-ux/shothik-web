"use client";

import dynamic from "next/dynamic";

const ForgotPasswordPageClient = dynamic(
  () => import("./ForgotPasswordPageClient"),
  { ssr: false },
);

export default function ForgotPasswordPageEntry() {
  return <ForgotPasswordPageClient />;
}
