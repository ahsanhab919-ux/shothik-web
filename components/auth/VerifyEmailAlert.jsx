"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "react-toastify";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useSelector } from "react-redux";

const VerifyEmailAlert = () => {
  const { user } = useSelector((state) => state.auth);
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const showVerifyModal = !user?.is_verified;
  const email = user?.email;
  const message = sent
    ? `A verification email has been sent to ${email}. Please check your inbox.`
    : "Your account is not verified yet. Verify your mail to write with confidence.";
  const action = sent ? "Resend" : "Send code";

  const handleVerify = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/auth/send-verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Unable to send verification email.");
      }

      if (result?.success) {
        setSent(true);
        toast.success("Sent a verification email to " + user.email + ".");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sorry, something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!email || !showVerifyModal) return null;

  return (
    <div className="relative mb-4 px-4 sm:px-0">
      <Alert variant="default" className="border-amber-500 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <span className="flex-1 whitespace-normal">{message}</span>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/auth/login?verifyEmail=1&email=${encodeURIComponent(email)}`}>
                Enter code
              </Link>
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={isLoading}
              onClick={handleVerify}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {isLoading ? "Sending..." : action}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default VerifyEmailAlert;
