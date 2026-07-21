import { defineRoute, z } from "@/lib/api-validation";
import { completeForTool } from "@/lib/llm/gateway";
import { CircuitBreaker } from "@/lib/resiliency";

// Global circuit breaker for planner generation.
const plannerCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeoutMs: 30000,
});

type PlannerSource = { title?: string; url?: string; text?: string };

interface PlannerChapter {
  id?: string;
  title?: string;
  synopsis?: string;
}

interface PlannerPlan {
  title: string;
  genre: string;
  logline: string;
  chapters: PlannerChapter[];
  researchNotes: {
    comparables: string[];
    themes: string[];
    settingNotes: string;
    characterArchetypes: string[];
    keyConflicts: string[];
  };
}

function buildPrompt(
  type: "book" | "research" | "assignment",
  description: string,
  sources: PlannerSource[]
): string {
  const sourceBlock =
    sources.length > 0
      ? `\n\nUser-provided reference sources:\n${sources
          .map(
            (s, i) =>
              `Source ${i + 1}: ${s.title || s.url || "Untitled"}\n${s.text ? s.text.slice(0, 800) : ""}`
          )
          .join("\n\n")}`
      : "";

  if (type === "book") {
    return `You are a world-class literary agent and developmental editor. A writer has come to you with a concept for a book.

Concept: "${description}"${sourceBlock}

Generate a detailed book development plan in this EXACT JSON format (no markdown, no code fences, raw JSON only):
{
  "title": "A compelling working title",
  "genre": "Specific genre (e.g., Literary Fiction, Hard Sci-Fi, Psychological Thriller)",
  "logline": "One powerful sentence that captures the essence, stakes, and hook of this book",
  "chapters": [
    {
      "id": "ch-1",
      "title": "Chapter title",
      "synopsis": "2-3 sentences describing what happens, what's at stake, and how character changes"
    }
  ],
  "researchNotes": {
    "comparables": ["Book A by Author X", "Book B by Author Y"],
    "themes": ["Core theme 1", "Core theme 2", "Core theme 3"],
    "settingNotes": "Detailed notes on the world, time period, atmosphere, and physical environment",
    "characterArchetypes": ["Protagonist archetype and trait", "Antagonist archetype and trait"],
    "keyConflicts": ["External conflict", "Internal conflict", "Interpersonal conflict"]
  }
}

Generate 8-12 chapters. Each chapter synopsis should be rich and specific — avoid vague descriptions like "things get complicated." Make the chapter progression feel like a real narrative arc with escalating tension.`;
  }

  if (type === "research") {
    return `You are a senior academic advisor and research methodology expert. A researcher has come to you with a research idea.

Research concept: "${description}"${sourceBlock}

Generate a structured research paper plan in this EXACT JSON format (no markdown, no code fences, raw JSON only):
{
  "title": "A precise, academic working title",
  "genre": "Academic discipline and paper type (e.g., Empirical Study in Cognitive Psychology, Systematic Review in Machine Learning)",
  "logline": "One sentence thesis statement — the central argument or finding this paper will establish",
  "chapters": [
    {
      "id": "sec-1",
      "title": "Section title (e.g., Introduction, Literature Review, Methodology)",
      "synopsis": "2-3 sentences describing the content, arguments, and evidence in this section"
    }
  ],
  "researchNotes": {
    "comparables": ["Related paper 1 (author, journal, year)", "Related paper 2"],
    "themes": ["Key argument 1", "Key argument 2", "Key theoretical framework"],
    "settingNotes": "Research context: field gaps, relevance, why now, target journal or conference",
    "characterArchetypes": ["Primary methodology", "Secondary methodology or validation approach"],
    "keyConflicts": ["Main counterargument 1", "Limitation to address", "Gap in existing literature"]
  }
}

Generate 5-7 sections following standard academic paper structure. Each section synopsis should specify exact content, methodology steps, or arguments — not just labels.`;
  }

  return `You are an expert academic tutor and assignment strategist. A student has come to you with an assignment brief.

Assignment description: "${description}"${sourceBlock}

Generate a detailed assignment completion plan in this EXACT JSON format (no markdown, no code fences, raw JSON only):
{
  "title": "Assignment title",
  "genre": "Assignment type and subject (e.g., Case Study Analysis — Business Strategy, Argumentative Essay — Ethics)",
  "logline": "One sentence central argument or thesis this assignment will demonstrate",
  "chapters": [
    {
      "id": "sec-1",
      "title": "Section title",
      "synopsis": "2-3 sentences describing what to write, which evidence to use, and how to argue the point"
    }
  ],
  "researchNotes": {
    "comparables": ["Key source 1 to cite", "Key source 2 to cite", "Recommended journal or textbook"],
    "themes": ["Core argument 1", "Core argument 2", "Key concept to demonstrate"],
    "settingNotes": "Academic context: marking criteria focus, typical word allocation per section, common pitfalls to avoid",
    "characterArchetypes": ["Primary analytical framework (e.g., SWOT, Porter's Five Forces)", "Secondary framework"],
    "keyConflicts": ["Counterargument to address", "Limitation to acknowledge", "Common student mistake to avoid"]
  }
}

Generate 4-6 sections. Each section synopsis should be actionable — tell the student exactly what to write and why, with specific evidence suggestions.`;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizePlan(plan: PlannerPlan): PlannerPlan {
  return {
    ...plan,
    chapters: plan.chapters.map((chapter, index) => ({
      id: chapter.id || `ch-${index + 1}`,
      title: chapter.title || `Chapter ${index + 1}`,
      synopsis: chapter.synopsis || "",
    })),
    researchNotes: plan.researchNotes || {
      comparables: [],
      themes: [],
      settingNotes: "",
      characterArchetypes: [],
      keyConflicts: [],
    },
  };
}

function buildFallbackPlan(
  type: "book" | "research" | "assignment",
  description: string,
  sources: PlannerSource[],
): PlannerPlan {
  const compactDescription = description.replace(/\s+/g, " ").trim();
  const seed = compactDescription
    .replace(/[^\w\s-]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .join(" ");
  const workingTitle = seed ? `Draft Plan: ${seed}` : "Draft Plan";
  const sourceNames = sources
    .map((source) => source.title || source.url)
    .filter((value): value is string => Boolean(value))
    .slice(0, 3);

  if (type === "research") {
    return normalizePlan({
      title: workingTitle,
      genre: "Research Paper",
      logline: `This paper investigates ${compactDescription} through a structured academic argument.`,
      chapters: [
        { id: "sec-1", title: "Introduction", synopsis: `Introduce ${compactDescription}, frame the research question, and define the paper's contribution.` },
        { id: "sec-2", title: "Literature Review", synopsis: "Summarize the most relevant prior work, identify gaps, and position the argument against existing scholarship." },
        { id: "sec-3", title: "Methodology", synopsis: "Describe the analytical method, datasets or sources, and evaluation criteria used to test the thesis." },
        { id: "sec-4", title: "Findings and Analysis", synopsis: "Present the main evidence, connect findings to the research question, and discuss implications." },
        { id: "sec-5", title: "Discussion and Conclusion", synopsis: "Synthesize the results, acknowledge limitations, and outline next-step research directions." },
      ],
      researchNotes: {
        comparables: sourceNames,
        themes: ["research question", "evidence", "limitations"],
        settingNotes: "Local fallback plan generated because the live planner provider was unavailable at request time.",
        characterArchetypes: ["primary method", "supporting validation"],
        keyConflicts: ["counterargument", "data limitation", "scope boundary"],
      },
    });
  }

  if (type === "assignment") {
    return normalizePlan({
      title: workingTitle,
      genre: "Assignment Outline",
      logline: `This assignment argues a clear position on ${compactDescription} with structured supporting evidence.`,
      chapters: [
        { id: "sec-1", title: "Introduction", synopsis: "Frame the assignment prompt, define the thesis, and preview the core argument." },
        { id: "sec-2", title: "Background and Context", synopsis: "Explain the relevant concepts, terms, or case background needed for the reader." },
        { id: "sec-3", title: "Core Analysis", synopsis: "Present the strongest evidence, examples, and reasoning in support of the thesis." },
        { id: "sec-4", title: "Counterargument and Evaluation", synopsis: "Address alternative viewpoints, limitations, or trade-offs before defending the preferred position." },
        { id: "sec-5", title: "Conclusion", synopsis: "Restate the argument, reinforce the main evidence, and close with the practical takeaway." },
      ],
      researchNotes: {
        comparables: sourceNames,
        themes: ["thesis clarity", "evidence quality", "critical analysis"],
        settingNotes: "Local fallback plan generated because the live planner provider was unavailable at request time.",
        characterArchetypes: ["primary analytical lens", "secondary comparison lens"],
        keyConflicts: ["counterargument", "assumption risk", "common rubric gap"],
      },
    });
  }

  return normalizePlan({
    title: workingTitle,
    genre: "Book Project",
    logline: `A project about ${compactDescription} that escalates through discovery, conflict, and resolution.`,
    chapters: [
      { id: "ch-1", title: "Opening Image", synopsis: "Introduce the central character or idea, establish the world, and hint at the core tension." },
      { id: "ch-2", title: "Inciting Pressure", synopsis: "Introduce the event or realization that forces the story to move from setup into action." },
      { id: "ch-3", title: "First Commitment", synopsis: "Show the protagonist choosing a direction and accepting the first real cost of the journey." },
      { id: "ch-4", title: "Expanding Stakes", synopsis: "Deepen relationships, broaden the world, and reveal why the conflict is larger than it first appeared." },
      { id: "ch-5", title: "Midpoint Shift", synopsis: "Deliver a reversal, discovery, or commitment that changes how the protagonist understands the challenge." },
      { id: "ch-6", title: "Pressure Mounts", synopsis: "Escalate consequences, tighten timelines, and expose the protagonist's internal weakness." },
      { id: "ch-7", title: "Crisis", synopsis: "Push the project to its most fragile state, where failure appears likely and the cost of success becomes personal." },
      { id: "ch-8", title: "Climax", synopsis: "Resolve the central conflict with a decisive confrontation or breakthrough." },
      { id: "ch-9", title: "Aftermath", synopsis: "Show the transformed state of the character or world and close the narrative arc with clarity." },
    ],
    researchNotes: {
      comparables: sourceNames,
      themes: ["identity", "stakes", "transformation"],
      settingNotes: "Local fallback plan generated because the live planner provider was unavailable at request time.",
      characterArchetypes: ["protagonist", "antagonistic force"],
      keyConflicts: ["external pressure", "internal doubt", "relationship strain"],
    },
  });
}

export const POST = defineRoute({
  method: "post",
  path: "/api/book-agent",
  summary: "Generate Book/Research Plan",
  description: "Streams a structured plan (chapters, research notes) based on a concept.",
  tags: ["Writing Tools"],
  config: {
    rateLimit: { requests: 10, windowMs: 60000 },
    requireAuth: false, // In production, consider requiring auth
  },
  schemas: {
    body: z.object({
      description: z.string().min(1, "Description is required"),
      type: z.enum(["book", "research", "assignment"]).default("book"),
      sources: z.array(
        z.object({
          title: z.string().optional(),
          url: z.string().optional(),
          text: z.string().optional(),
        })
      ).default([]),
    }),
  },
  handler: async ({ body }) => {
    const { description, type, sources } = body;
    const encoder = new TextEncoder();

    const send = (
      controller: ReadableStreamDefaultController,
      data: object
    ) => {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    };

    const stream = new ReadableStream({
      async start(controller) {
        try {
          send(controller, { type: "status", step: 1 });
          await delay(600);

          send(controller, { type: "status", step: 2 });
          await delay(700);

          send(controller, { type: "status", step: 3 });

          const prompt = buildPrompt(type, description.trim(), sources);

          send(controller, { type: "status", step: 4 });
          await delay(400);

          send(controller, { type: "status", step: 5 });
          await delay(300);

          send(controller, { type: "status", step: 6 });

          let plan: PlannerPlan;

          try {
            const llmResult = await plannerCircuitBreaker.execute(() =>
              completeForTool("book-agent", {
                prompt,
                temperature: 0.9,
                maxTokens: 8192,
                jsonMode: true,
              })
            );

            const raw = llmResult.text ?? "";
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              throw new Error("The AI returned an unexpected response.");
            }

            const parsed = JSON.parse(jsonMatch[0]) as PlannerPlan;
            if (!parsed.title || !Array.isArray(parsed.chapters)) {
              throw new Error("The plan was incomplete.");
            }

            plan = normalizePlan(parsed);
          } catch (parseError) {
            console.warn("[book-agent] Falling back to local planner", {
              error:
                parseError instanceof Error
                  ? parseError.message
                  : String(parseError),
            });
            plan = buildFallbackPlan(type, description.trim(), sources);
          }

        send(controller, { type: "done", plan });
        controller.close();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong";
        try {
          const controller2 = controller;
          send(controller2, { type: "error", message });
          controller2.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store",
      Connection: "keep-alive",
    },
  });
  }
});
