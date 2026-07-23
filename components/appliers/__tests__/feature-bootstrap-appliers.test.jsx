import React from "react";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import FeatureEndpointsApplier from "../FeatureEndpointsApplier";
import FeaturePopupApplier from "../FeaturePopupApplier";

const useQueryMock = vi.fn(() => ({
  data: null,
  isLoading: false,
}));

let currentPathname = "/auth/login";

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options) => useQueryMock(options),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("react-redux", () => ({
  useDispatch: () => vi.fn(),
  useSelector: (selector) =>
    selector({
      features_with_credentials: {
        features: [],
      },
    }),
}));

vi.mock("@/lib/api-payment", () => ({
  hasPaymentSystemBaseUrl: true,
}));

describe("feature bootstrap appliers", () => {
  beforeEach(() => {
    useQueryMock.mockClear();
    currentPathname = "/auth/login";
  });

  it("disables payment feature bootstrap queries on auth routes", () => {
    render(
      <>
        <FeatureEndpointsApplier />
        <FeaturePopupApplier />
      </>,
    );

    expect(useQueryMock).toHaveBeenCalledTimes(2);
    expect(useQueryMock.mock.calls[0][0].enabled).toBe(false);
    expect(useQueryMock.mock.calls[1][0].enabled).toBe(false);
  });

  it("keeps payment feature bootstrap queries enabled on non-auth routes", () => {
    currentPathname = "/marketplace";

    render(
      <>
        <FeatureEndpointsApplier />
        <FeaturePopupApplier />
      </>,
    );

    expect(useQueryMock).toHaveBeenCalledTimes(2);
    expect(useQueryMock.mock.calls[0][0].enabled).toBe(true);
    expect(useQueryMock.mock.calls[1][0].enabled).toBe(true);
  });
});
