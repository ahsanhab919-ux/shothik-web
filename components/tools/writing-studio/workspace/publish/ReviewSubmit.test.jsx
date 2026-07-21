import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReviewSubmit } from "./ReviewSubmit";

const baseFormData = {
  manuscript: { restored: true },
  manuscriptName: "book.epub",
  manuscriptSize: 2048,
  manuscriptFormat: "EPUB",
  title: "The Midnight Protocol",
  subtitle: "",
  description:
    "This is a sufficiently long publishing description that satisfies the review requirements for submission.",
  language: "en",
  category: "fiction_thriller",
  keywords: ["thriller", "future", "mystery"],
  coverFile: { size: 2048, type: "image/jpeg" },
  coverPreview: "https://example.com/cover.jpg",
  coverDimensions: { width: 1600, height: 2400 },
  listPrice: "9.99",
  currency: "USD",
  distributionOptIn: false,
  agreementAccepted: true,
  agreementName: "Jane Doe",
  agreementScrolled: true,
};

describe("ReviewSubmit", () => {
  it("lets the author opt into distribution from the review step", () => {
    const updateFormData = vi.fn();

    render(
      <ReviewSubmit
        formData={baseFormData}
        updateFormData={updateFormData}
        goBack={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting={false}
        submitError=""
      />,
    );

    fireEvent.click(
      screen.getByRole("checkbox", { name: /enable distribution opt-in/i }),
    );

    expect(updateFormData).toHaveBeenCalledWith({
      distributionOptIn: true,
    });
    expect(
      screen.getByText(/including distribution consent/i),
    ).toBeInTheDocument();
  });
});
