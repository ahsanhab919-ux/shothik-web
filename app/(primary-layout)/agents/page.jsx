import AgentLandingPage from "@/components/agents/AgentLandingPage";
import { AgentContextProvider } from "@/components/agents/shared/AgentContextProvider";

export const metadata = {
  title: "AI Agents - Shothik AI",
  description:
    "Explore AI chat, slides, sheets, and research workflows. Sign in only when you want to start a workflow.",
};

export default function AgentsPage() {
  return (
    <AgentContextProvider>
      <AgentLandingPage />
    </AgentContextProvider>
  );
}
