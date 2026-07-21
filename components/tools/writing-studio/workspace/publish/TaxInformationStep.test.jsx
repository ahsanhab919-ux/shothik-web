import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaxInformationStep } from "./TaxInformationStep";

vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({
      auth: {
        user: {
          _id: "user-1",
        },
      },
    }),
}));

describe("TaxInformationStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads an existing tax profile and saves updates through the route", async () => {
    const updateFormData = vi.fn();

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          taxProfile: {
            country: "BD",
            legalName: "Ahsan Habib",
            address: "Dhaka Road 1",
            city: "Dhaka",
            postalCode: "1207",
            treatyBenefit: false,
            taxIdOnFile: true,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          taxProfile: {
            country: "US",
            legalName: "Ahsan Habib",
            address: "Dhaka Road 1",
            city: "Dhaka",
            postalCode: "1207",
            treatyBenefit: false,
            taxIdOnFile: true,
          },
        }),
      });

    const { container } = render(
      <TaxInformationStep
        formData={{}}
        updateFormData={updateFormData}
      />,
    );

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith("/api/publish/tax", {
        credentials: "include",
      }),
    );

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "US" },
    });
    fireEvent.change(screen.getByPlaceholderText(/XXX-XX-XXXX/i), {
      target: { value: "123-45-6789" },
    });
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    fireEvent.click(checkboxes[checkboxes.length - 1]);

    fireEvent.click(
      screen.getByRole("button", { name: /Save tax information securely/i }),
    );

    await waitFor(() =>
      expect(global.fetch).toHaveBeenLastCalledWith(
        "/api/publish/tax",
        expect.objectContaining({
          method: "POST",
          credentials: "include",
        }),
      ),
    );

    expect(updateFormData).toHaveBeenCalledWith(
      expect.objectContaining({
        taxSaved: true,
        taxCountry: "US",
        taxFormType: "W-9",
      }),
    );
  });
});
