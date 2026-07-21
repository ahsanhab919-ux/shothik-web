import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetAuthenticatedUser, mockGetTaxProfileForUser, mockSaveTaxProfileForUser } =
  vi.hoisted(() => ({
    mockGetAuthenticatedUser: vi.fn(),
    mockGetTaxProfileForUser: vi.fn(),
    mockSaveTaxProfileForUser: vi.fn(),
  }));

vi.mock("@/lib/server-auth", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/lib/books/http", () => ({
  readJsonBody: (request) => request.json(),
  handleBookRouteError: (error, fallbackMessage) =>
    Response.json(
      {
        error: "INTERNAL_ERROR",
        message: fallbackMessage,
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    ),
}));

vi.mock("@/lib/books/insforge-publishing-service", () => ({
  getTaxProfileForUser: mockGetTaxProfileForUser,
  saveTaxProfileForUser: mockSaveTaxProfileForUser,
}));

import { GET, POST } from "./route";

describe("publish tax route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated GET requests", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("UNAUTHORIZED");
  });

  it("returns the saved tax profile for the authenticated user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetTaxProfileForUser.mockResolvedValue({ country: "BD", taxIdOnFile: true });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetTaxProfileForUser).toHaveBeenCalledWith("user-1");
    expect(data.taxProfile).toEqual({ country: "BD", taxIdOnFile: true });
  });

  it("rejects incomplete POST payloads", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/publish/tax", {
        method: "POST",
        body: JSON.stringify({ formType: "W-8BEN" }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("INVALID_REQUEST");
    expect(mockSaveTaxProfileForUser).not.toHaveBeenCalled();
  });

  it("saves the tax profile for the authenticated user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockSaveTaxProfileForUser.mockResolvedValue({ country: "BD", taxIdOnFile: true });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/publish/tax", {
        method: "POST",
        body: JSON.stringify({
          formType: "W-8BEN",
          country: "BD",
          taxId: "123456789",
          legalName: "Ahsan Habib",
          address: "Dhaka Road 1",
          city: "Dhaka",
          postalCode: "1207",
          treatyBenefit: false,
          withholdingRate: 0.3,
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockSaveTaxProfileForUser).toHaveBeenCalledWith({
      userId: "user-1",
      formType: "W-8BEN",
      country: "BD",
      taxId: "123456789",
      legalName: "Ahsan Habib",
      address: "Dhaka Road 1",
      city: "Dhaka",
      postalCode: "1207",
      treatyBenefit: false,
      treatyCountry: undefined,
      withholdingRate: 0.3,
    });
    expect(data.taxProfile).toEqual({ country: "BD", taxIdOnFile: true });
  });
});
