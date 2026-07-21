"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import WritingHomeDashboard from "@/components/tools/writing-studio/dashboard/WritingHomeDashboard";
import { PolishedWriteView } from "@/components/writing-studio/PolishedWriteView";
import { UnifiedStudioHub } from "@/components/writing-studio/UnifiedStudioHub";
import { trackWritingStudioOpened } from "@/lib/posthog";
import { getProject } from "@/lib/projects-store";
import { clearWritingStudioSeed, getWritingStudioSeed } from "@/lib/writing-studio-seed";
import { useProjectPersistence } from "@/hooks/useProjectPersistence";

function getAuthUserId(user) {
  return user?.id || user?.clerkId || user?._id || null;
}

function normalizeStudioProject(project) {
  if (!project || typeof project !== "object") {
    return null;
  }

  const normalizedId =
    typeof project._id === "string" && project._id.trim()
      ? project._id
      : typeof project.id === "string" && project.id.trim()
      ? project.id
      : null;

  if (!normalizedId) {
    return null;
  }

  return {
    ...project,
    _id: normalizedId,
    title:
      typeof project.title === "string" && project.title.trim()
        ? project.title
        : "Untitled Project",
    type:
      project.type === "book" || project.type === "research" || project.type === "assignment"
        ? project.type
        : "book",
    content: typeof project.content === "string" ? project.content : "",
    sections: Array.isArray(project.sections) ? project.sections : [],
    settings: project.settings && typeof project.settings === "object" ? project.settings : {},
    researchNotes:
      project.researchNotes && typeof project.researchNotes === "object"
        ? project.researchNotes
        : null,
    agentChapters: Array.isArray(project.agentChapters) ? project.agentChapters : [],
  };
}

function WritingStudioInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useSelector((state) => state.auth.user);
  const showProjects = searchParams.get("projects") === "1";
  const showChat = searchParams.get("tab") === "chat";
  const projectId = searchParams.get("projectId");
  const intent = searchParams.get("intent");
  const initialProjectType =
    intent === "research" || intent === "assignment" || intent === "book" ? intent : "book";

  const [view, setView] = useState(showProjects ? "projects" : "hub");
  const [activeProject, setActiveProject] = useState(null);
  const [seedDescription, setSeedDescription] = useState("");
  const { loadProjectById } = useProjectPersistence(projectId || undefined);
  const authUserId = getAuthUserId(user);

  useEffect(() => {
    trackWritingStudioOpened();
  }, []);

  useEffect(() => {
    if (showProjects && view !== "projects") {
      setView("projects");
    } else if (!showProjects && view === "projects") {
      setView("hub");
    }
  }, [showProjects]);

  useEffect(() => {
    if (showChat) {
      router.replace("/writing-studio/chat");
    }
  }, [showChat, router]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    async function openProjectFromRoute() {
      const loadedProject = authUserId ? await loadProjectById() : getProject(projectId);
      const project = normalizeStudioProject(loadedProject);
      if (!project || cancelled) return;
      setActiveProject(project);
      setView("editor");
    }

    void openProjectFromRoute();

    return () => {
      cancelled = true;
    };
  }, [authUserId, loadProjectById, projectId]);

  useEffect(() => {
    if (projectId) return;
    const seed = getWritingStudioSeed();
    if (!seed) return;
    setSeedDescription(seed.description || "");
    clearWritingStudioSeed();
  }, [projectId]);

  if (showChat) {
    return <div className="h-screen bg-background" />;
  }

  if (view === "editor" && activeProject) {
    return (
      <PolishedWriteView
        key={activeProject._id}
        project={activeProject}
        bookTitle={activeProject.title}
        projectType={activeProject.type || "book"}
        onBack={() => {
          setActiveProject(null);
          setView("hub");
        }}
      />
    );
  }

  if (view === "projects") {
    return (
      <div className="h-screen">
        <WritingHomeDashboard
          onOpenProject={(project) => {
            const normalizedProject = normalizeStudioProject(project);
            if (!normalizedProject) {
              return;
            }
            setActiveProject(normalizedProject);
            setView("editor");
          }}
          onNewProject={() => {
            router.push("/writing-studio");
            setView("hub");
          }}
        />
      </div>
    );
  }

  return (
    <UnifiedStudioHub
      initialProjectType={initialProjectType}
      initialDescription={seedDescription}
      onProjectCreated={(project) => {
        const normalizedProject = normalizeStudioProject(project);
        if (!normalizedProject) {
          return;
        }
        setActiveProject(normalizedProject);
        setView("editor");
      }}
      onCancel={() => setView("projects")}
    />
  );
}

export default function WritingStudioPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#0f0f0f]" />}>
      <WritingStudioInner />
    </Suspense>
  );
}
