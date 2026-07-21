import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockConvexProviderWithAuth = vi.fn(({ children }) => (
  <div data-testid="convex-provider">{children}</div>
));
const MockConvexReactClient = vi.fn(function MockConvexReactClient(url) {
  this.url = url;
});

vi.mock("convex/react", () => ({
  ConvexProviderWithAuth: mockConvexProviderWithAuth,
  ConvexReactClient: MockConvexReactClient,
}));

vi.mock("./AuthProvider", () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isLoading: false,
    user: null,
  }),
}));

describe("ConvexClientProvider", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_CONVEX_URL;
    vi.resetModules();
    mockConvexProviderWithAuth.mockClear();
  });

  it("renders children without a Convex provider when the Convex URL is absent", async () => {
    const module = await import("./ConvexClientProvider");
    const ConvexClientProvider = module.default;

    render(
      <ConvexClientProvider>
        <span>Child content</span>
      </ConvexClientProvider>,
    );

    expect(screen.getByText("Child content")).toBeInTheDocument();
    expect(screen.queryByTestId("convex-provider")).not.toBeInTheDocument();
  });

  it("restores the Convex provider wrapper when the Convex URL is configured", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://dashing-mandrill-233.convex.cloud";

    const module = await import("./ConvexClientProvider");
    const ConvexClientProvider = module.default;

    render(
      <ConvexClientProvider>
        <span>Child content</span>
      </ConvexClientProvider>,
    );

    expect(screen.getByTestId("convex-provider")).toBeInTheDocument();
    expect(mockConvexProviderWithAuth).toHaveBeenCalled();
  });
});
