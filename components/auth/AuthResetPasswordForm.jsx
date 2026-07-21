"use client";
import FormProvider from "@/components/common/FormProvider";
import RHFTextField from "@/components/common/RHFTextField";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { setShowLoginModal } from "@/redux/slices/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { z } from "zod";

// ----------------------------------------------------------------------

export default function AuthResetPasswordForm() {
  const [isSentMail, setIsSentMail] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const dispatch = useDispatch();
  const router = useRouter();

  const ForgotSchema = z.object({
    email: z.string()
      .min(1, "Email is required")
      .email("Email must be a valid email address"),
  });

  const defaultValues = {
    email: "",
  };

  const methods = useForm({
    resolver: zodResolver(ForgotSchema),
    defaultValues,
  });

  const {
    reset,
    setError,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = async (data) => {
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Unable to send reset code.");
      }

      if (result?.success) {
        dispatch(setShowLoginModal(false));
        toast.success(
          "Reset password code sent to your email. Please check.",
        );
        router.push(`/auth/reset-password?email=${encodeURIComponent(data.email)}&sent=1`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred.";
      setErrorMessage(message);
      toast.error(message);
      reset();

      setError("afterSubmit", {
        ...error,
        message,
      });
    } finally {
      setIsSentMail(true);
    }
  };

  return (
    <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4">
        <RHFTextField name="email" label="Email address" />
        {errorMessage && (
          <p className="text-destructive min-h-[1.5em] text-sm">
            {errorMessage}
          </p>
        )}

        <Button
          type="submit"
          className="mt-6 w-full"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Sending..."
            : `${isSentMail ? "Resend" : "Send"} Request`}
        </Button>
      </div>
    </FormProvider>
  );
}
