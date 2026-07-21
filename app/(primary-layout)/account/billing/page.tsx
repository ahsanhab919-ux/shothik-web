"use client";

import dynamic from "next/dynamic";
import BillingPage from "@/components/subscription/BillingPage";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";

function BillingRoute() {
  const { push } = useRouter();
  const { user, accessToken } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!accessToken || !user) {
      push("/");
    }
  }, [accessToken, user, push]);

  useEffect(() => {
    document.title = "Billing & Subscription | Shothik AI";
  }, []);

  return (
    <div className="px-3 py-6 sm:px-4 pb-24 md:pb-6">
      <Breadcrumb className="mb-4 sm:mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/account/settings">Account</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Billing</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-2xl font-bold mb-6">Billing & Subscription</h1>
      <BillingPage />
    </div>
  );
}

export default dynamic(() => Promise.resolve(BillingRoute), { ssr: false });
