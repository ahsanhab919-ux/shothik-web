"use client";
import FormProvider from "@/components/common/FormProvider";
import RHFTextField from "@/components/common/RHFTextField";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { setShowLoginModal } from "@/redux/slices/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Circle, Eye, EyeOff } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { z } from "zod";

// ----------------------------------------------------------------------
const commonPasswords = [
  "password",
  "123456",
  "12345678",
  "admin",
  "welcome",
  "qwerty",
  "letmein",
  "football",
  "iloveyou",
  "abc123",
  "monkey",
  "123123",
  "sunshine",
  "princess",
  "dragon",
];

export default function AuthForgotPasswordForm() {
  const { push } = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const routeToken = typeof params?.token === "string" ? params.token : "";
  const initialCode = routeToken || searchParams.get("code") || "";
  const email = searchParams.get("email") || "";
  const sent = searchParams.get("sent") === "1";
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();

  const ResetSchema = z.object({
    code: z.string().min(6, "Enter the reset code from your email"),
    password: z.string()
      .min(8, "Password must be at least 8 characters long")
      .max(20, "Password must not exceed 20 characters")
      .refine(
        (val) => !commonPasswords.includes(val),
        "This password is too common. Please choose a stronger one."
      ),
  });

  const defaultValues = {
    code: initialCode,
    password: "",
  };

  const methods = useForm({
    resolver: zodResolver(ResetSchema),
    defaultValues,
  });

  const {
    reset,
    setError,
    setValue,
    handleSubmit,
    formState: { errors },
    watch,
  } = methods;

  const password = watch().password;

  useEffect(() => {
    if (initialCode) {
      setValue("code", initialCode);
    }
  }, [initialCode, setValue]);

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      setApiError("");
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: data.code,
          password: data.password,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Unable to reset password.");
      }

      if (result?.success) {
        toast.success("Update success! Please login");
        push(`/auth/login?reset=1${email ? `&email=${encodeURIComponent(email)}` : ""}`);
        dispatch(setShowLoginModal(true));
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to reset password.";
      setApiError(message);

      reset();

      setError("afterSubmit", {
        ...error,
        message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-6">
        {!!errors.afterSubmit && (
          <Alert variant="destructive">
            <AlertDescription>{errors.afterSubmit.message}</AlertDescription>
          </Alert>
        )}

        {!!apiError && (
          <Alert variant="destructive">
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}

        {sent && email && (
          <Alert>
            <AlertDescription>
              We sent a reset code to {email}. Enter that code and choose a new password.
            </AlertDescription>
          </Alert>
        )}

        <RHFTextField
          name="code"
          label="Reset code"
          placeholder="Enter the code from your email"
        />

        <RHFTextField
          name="password"
          label="Password"
          type={showPassword ? "text" : "password"}
          endAdornment={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowPassword(!showPassword)}
              className="h-8 w-8"
            >
              {showPassword ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          }
        />

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {password.length >= 8 ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <Circle className="text-muted-foreground h-5 w-5" />
            )}
            <span className="text-muted-foreground text-sm">
              Must be at least 8 characters
            </span>
          </div>
        </div>

        <Button
          type="submit"
          className="from-primary to-primary/80 h-11 w-full bg-gradient-to-r"
          disabled={isLoading}
        >
          {isLoading ? "Updating..." : "Update Password"}
        </Button>
      </div>
    </FormProvider>
  );
}
