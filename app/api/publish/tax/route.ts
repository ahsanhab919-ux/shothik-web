import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { handleBookRouteError, readJsonBody } from "@/lib/books/http";
import {
  getTaxProfileForUser,
  saveTaxProfileForUser,
} from "@/lib/books/insforge-publishing-service";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const taxProfile = await getTaxProfileForUser(user.id);
    return NextResponse.json({ taxProfile });
  } catch (error) {
    return handleBookRouteError(error, "Failed to load tax information.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const body = (await readJsonBody(request)) as {
      formType?: "W-9" | "W-8BEN";
      country?: string;
      taxId?: string;
      legalName?: string;
      address?: string;
      city?: string;
      postalCode?: string;
      treatyBenefit?: boolean;
      treatyCountry?: string;
      withholdingRate?: number;
    };

    if (
      (body.formType !== "W-9" && body.formType !== "W-8BEN") ||
      typeof body.country !== "string" ||
      typeof body.taxId !== "string" ||
      typeof body.legalName !== "string" ||
      typeof body.address !== "string" ||
      typeof body.city !== "string" ||
      typeof body.postalCode !== "string" ||
      typeof body.withholdingRate !== "number"
    ) {
      return NextResponse.json(
        {
          error: "INVALID_REQUEST",
          message: "A complete tax profile payload is required.",
        },
        { status: 400 },
      );
    }

    const taxProfile = await saveTaxProfileForUser({
      userId: user.id,
      formType: body.formType,
      country: body.country,
      taxId: body.taxId,
      legalName: body.legalName,
      address: body.address,
      city: body.city,
      postalCode: body.postalCode,
      treatyBenefit: body.treatyBenefit,
      treatyCountry: body.treatyCountry,
      withholdingRate: body.withholdingRate,
    });

    return NextResponse.json({ taxProfile });
  } catch (error) {
    return handleBookRouteError(error, "Failed to save tax information.");
  }
}
