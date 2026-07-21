"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, ImageIcon, Loader2, Sparkles, Video } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AssetType = "image" | "video";

interface CreativeStudioResponse {
  success?: boolean;
  status?: "success" | "blocked" | "failed";
  connectorId?: string;
  toolName?: string;
  invocationId?: string;
  confirmationRequired?: boolean;
  output?: unknown;
  outputText?: string;
  error?: string;
  message?: string;
  retryable?: boolean;
  policyReasonCode?: string;
}

export default function CreativeStudioClient() {
  const [assetType, setAssetType] = useState<AssetType>("image");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<CreativeStudioResponse | null>(null);
  const [plannedResult, setPlannedResult] = useState<CreativeStudioResponse | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);

  const handlePlan = async () => {
    await submitWorkflow({ dryRun: true, confirmed: false });
  };

  const handleGenerate = async (confirmed = false) => {
    await submitWorkflow({ dryRun: false, confirmed });
  };

  async function submitWorkflow(options: {
    dryRun: boolean;
    confirmed: boolean;
  }) {
    if (!prompt.trim()) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    if (!options.dryRun) {
      setPlannedResult(null);
    }

    try {
      const response = await fetch("/api/mcp/creative-studio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          style: style.trim() || undefined,
          assetType,
          dryRun: options.dryRun,
          confirmed: options.confirmed,
        }),
      });

      const data = (await response.json()) as CreativeStudioResponse;

      if (response.status === 409 && data.error === "MCP_CONFIRMATION_REQUIRED") {
        setRequiresConfirmation(true);
        setResult(null);
        setErrorMessage(data.message ?? "Confirmation is required.");
        return;
      }

      if (!response.ok) {
        setRequiresConfirmation(false);
        setResult(null);
        setErrorMessage(data.message ?? "Creative Studio request failed.");
        return;
      }

      setRequiresConfirmation(false);
      if (options.dryRun) {
        setPlannedResult(data);
      } else {
        setResult(data);
      }
    } catch (error) {
      setRequiresConfirmation(false);
      setErrorMessage(
        error instanceof Error ? error.message : "Creative Studio request failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-4 md:p-6">
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold md:text-3xl">Creative Studio</h1>
        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
          Plan and run the first MCP-backed creative workflow through the
          Higgsfield connector. Start with a dry run, review the selected tool,
          then confirm execution for generation actions.
        </p>
      </div>

      {errorMessage && (
        <Alert variant={requiresConfirmation ? "default" : "destructive"} className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {requiresConfirmation ? "Confirmation required" : "Request failed"}
          </AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {requiresConfirmation && (
        <div className="mb-4">
          <Button
            onClick={() => handleGenerate(true)}
            disabled={isSubmitting || !prompt.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 animate-spin" />
                Confirming...
              </>
            ) : (
              "Confirm and Run"
            )}
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Creative Request</CardTitle>
            <CardDescription>
              Choose an asset type, define the prompt, and optionally guide the
              style before planning or running the MCP workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={assetType === "image" ? "default" : "outline"}
                className="h-auto py-3"
                onClick={() => setAssetType("image")}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Image
              </Button>
              <Button
                type="button"
                variant={assetType === "video" ? "default" : "outline"}
                className="h-auto py-3"
                onClick={() => setAssetType("video")}
              >
                <Video className="mr-2 h-4 w-4" />
                Video
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prompt</label>
              <Textarea
                placeholder="Describe the creative outcome you want..."
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className="min-h-[220px]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Style</label>
              <Input
                placeholder="Optional style direction, e.g. cinematic, editorial, surreal"
                value={style}
                onChange={(event) => setStyle(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handlePlan}
                disabled={!prompt.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" />
                    Working...
                  </>
                ) : (
                  "Plan Dry Run"
                )}
              </Button>
              <Button
                type="button"
                onClick={() => handleGenerate(false)}
                disabled={!prompt.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" />
                    Working...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Run Workflow
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dry Run Plan</CardTitle>
              <CardDescription>
                Review the selected connector and tool before a mutating
                creative action runs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!plannedResult ? (
                <p className="text-sm text-muted-foreground">
                  No dry-run plan yet. Use "Plan Dry Run" to inspect the planned
                  MCP invocation.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {plannedResult.connectorId ?? "connector"}
                    </Badge>
                    <Badge variant="outline">
                      {plannedResult.toolName ?? "tool"}
                    </Badge>
                  </div>
                  <pre className="overflow-x-auto rounded-lg border bg-muted p-3 text-xs">
                    {JSON.stringify(plannedResult.output, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Execution Result</CardTitle>
              <CardDescription>
                The first live Creative Studio workflow result returned by the
                MCP gateway.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!result ? (
                <p className="text-sm text-muted-foreground">
                  No execution result yet. Run the workflow after planning, then
                  confirm if required.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Workflow completed through the MCP gateway
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {result.connectorId ?? "connector"}
                    </Badge>
                    <Badge variant="outline">{result.toolName ?? "tool"}</Badge>
                    {result.invocationId ? (
                      <Badge variant="outline">{result.invocationId}</Badge>
                    ) : null}
                  </div>
                  {result.outputText ? (
                    <div className="rounded-lg border p-3 text-sm">
                      {result.outputText}
                    </div>
                  ) : null}
                  <pre className="overflow-x-auto rounded-lg border bg-muted p-3 text-xs">
                    {JSON.stringify(result.output, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
