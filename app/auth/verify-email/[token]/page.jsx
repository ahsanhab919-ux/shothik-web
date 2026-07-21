"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "react-toastify";

export default function VerifyEmailPage() {
  const { token } = useParams();
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      return;
    }
    toast.info("Email verification now uses a code sent to your inbox. Request a new code if needed.");
    router.replace("/auth/login?verifyEmail=1");
  }, [router, token]);

  return null;
}
