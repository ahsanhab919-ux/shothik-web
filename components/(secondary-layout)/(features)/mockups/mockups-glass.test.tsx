import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AnalysisMockup from "./AnalysisMockup";
import CanvasMockup from "./CanvasMockup";
import DashboardMockup from "./DashboardMockup";
import LaunchMockup from "./LaunchMockup";
import MediaMockup from "./MediaMockup";

describe("secondary-layout mockup glass system", () => {
  it("uses the shared glass hero overlay across the secondary mockup family", () => {
    const { container } = render(
      <>
        <AnalysisMockup accentColor="#1877F2" />
        <LaunchMockup accentColor="#1877F2" />
        <MediaMockup accentColor="#1877F2" />
        <CanvasMockup accentColor="#1877F2" />
        <DashboardMockup accentColor="#1877F2" />
      </>,
    );

    expect(container.querySelectorAll(".glass-hero")).toHaveLength(5);
  });
});
