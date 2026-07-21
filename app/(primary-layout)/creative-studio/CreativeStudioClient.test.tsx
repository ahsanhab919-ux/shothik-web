import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CreativeStudioClient from "./CreativeStudioClient";

describe("CreativeStudioClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the dry-run planning result", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        success: true,
        connectorId: "higgsfield:user-1",
        toolName: "generate_image",
        output: {
          planned: true,
          connectorId: "higgsfield:user-1",
          toolName: "generate_image",
          arguments: {
            prompt: "Create a cinematic teaser image",
            assetType: "image",
          },
        },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<CreativeStudioClient />);

    fireEvent.change(
      screen.getByPlaceholderText("Describe the creative outcome you want..."),
      {
        target: { value: "Create a cinematic teaser image" },
      },
    );

    fireEvent.click(screen.getByRole("button", { name: /plan dry run/i }));

    await waitFor(() => {
      expect(screen.getByText("higgsfield:user-1")).toBeInTheDocument();
    });

    expect(screen.getByText("generate_image")).toBeInTheDocument();
    expect(screen.getByText(/"planned": true/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/mcp/creative-studio",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          prompt: "Create a cinematic teaser image",
          style: undefined,
          assetType: "image",
          dryRun: true,
          confirmed: false,
        }),
      }),
    );
  });

  it("shows a confirmation prompt when the workflow requires confirmation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 409,
      ok: false,
      json: async () => ({
        error: "MCP_CONFIRMATION_REQUIRED",
        message: "This Creative Studio action requires explicit confirmation before execution.",
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<CreativeStudioClient />);

    fireEvent.change(
      screen.getByPlaceholderText("Describe the creative outcome you want..."),
      {
        target: { value: "Create a cinematic teaser image" },
      },
    );

    fireEvent.click(screen.getByRole("button", { name: /run workflow/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /confirm and run/i }),
      ).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/mcp/creative-studio",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("renders the execution result after a successful workflow run", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        success: true,
        connectorId: "higgsfield:user-1",
        toolName: "generate_video",
        invocationId: "invoke-1",
        outputText: "Queued generation request",
        output: {
          jobId: "job-1",
          status: "queued",
        },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<CreativeStudioClient />);

    fireEvent.click(screen.getByRole("button", { name: /^video$/i }));
    fireEvent.change(
      screen.getByPlaceholderText("Describe the creative outcome you want..."),
      {
        target: { value: "Create a teaser video" },
      },
    );

    fireEvent.click(screen.getByRole("button", { name: /run workflow/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Workflow completed through the MCP gateway"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("generate_video")).toBeInTheDocument();
    expect(screen.getByText("invoke-1")).toBeInTheDocument();
    expect(screen.getByText("Queued generation request")).toBeInTheDocument();
    expect(screen.getByText(/"jobId": "job-1"/)).toBeInTheDocument();
  });
});
