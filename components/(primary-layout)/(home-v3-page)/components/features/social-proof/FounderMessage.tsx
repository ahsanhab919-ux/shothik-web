"use client";

import Image from "next/image";
import { BriefcaseBusiness, GraduationCap, Rocket, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import shothikInterface from "@/components/(primary-layout)/(home-v3-page)/attached_assets/image_1760596886557.png";

const companionMilestones = [
  {
    icon: GraduationCap,
    title: "Learn faster",
    description: "Turn class notes, essays, and early drafts into polished submissions with guided academic structure.",
    badge: "Students",
  },
  {
    icon: BriefcaseBusiness,
    title: "Work smarter",
    description: "Shape proposals, reports, and stakeholder updates with the same context-aware writing assistant.",
    badge: "Professionals",
  },
  {
    icon: Rocket,
    title: "Ship bigger ideas",
    description: "Move from research and strategy into launch-ready publishing workflows without changing tools.",
    badge: "Founders",
  },
] as const;

export default function FounderMessage() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="bg-background py-32 md:py-48">
      <div className="mx-auto max-w-7xl px-8 md:px-16">
        <div
          className="mb-32 grid grid-cols-1 items-center gap-12 transition-all duration-700 ease-out md:mb-40 md:gap-16 lg:grid-cols-[1fr_1.8fr]"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(24px)",
          }}
        >
          <div className="flex flex-col gap-6">
            <h2 className="text-h2 text-foreground leading-tight font-bold">
              Write naturally, <br />
              perfect instantly.
            </h2>
            <p className="text-subtitle1 md:text-body1 text-muted-foreground max-w-lg leading-relaxed">
              Shothik's AI understands context and tone, helping you craft
              professional content that sounds authentically human—from your
              first draft to your final masterpiece.
            </p>
          </div>
          <div className="relative">
            <Image
              src={shothikInterface}
              alt="Shothik AI Writing Interface"
              width={900}
              height={600}
              className="h-auto w-full rounded-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,167,111,0.2)]"
            />
          </div>
        </div>

        <div
          className="grid grid-cols-1 items-center gap-12 transition-all delay-200 duration-700 ease-out md:gap-16 lg:grid-cols-2"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(24px)",
          }}
        >
          <div className="order-1 flex flex-col gap-6 lg:order-2">
            <h2 className="text-h2 text-foreground leading-tight font-bold">
              Your lifelong writing companion.
            </h2>
            <p className="text-subtitle1 md:text-body1 text-muted-foreground max-w-lg leading-relaxed">
              From your first essay as a student to your first business proposal
              as an entrepreneur—Shothik grows with you through every milestone
              of your journey.
            </p>
          </div>
          <div className="relative order-2 lg:order-1">
            <div className="glass-panel relative overflow-hidden rounded-2xl p-6 shadow-[0_20px_60px_rgba(24,119,242,0.2)]">
              <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-sky-500/10" />
              <div className="relative flex h-full flex-col justify-between gap-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-caption font-semibold uppercase tracking-[0.18em] text-brand">
                      One workspace across every stage
                    </p>
                    <h3 className="mt-3 text-xl font-semibold text-foreground md:text-2xl">
                      Build confidence from your first draft to your next big launch.
                    </h3>
                  </div>
                  <div className="rounded-2xl bg-brand/10 p-3 text-brand">
                    <Sparkles className="h-5 w-5" />
                  </div>
                </div>

                <div className="grid gap-3">
                  {companionMilestones.map(({ badge, description, icon: Icon, title }) => (
                    <div
                      key={title}
                      className="rounded-2xl border border-white/10 bg-background/70 p-4 backdrop-blur-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-xl bg-brand/10 p-2 text-brand">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-foreground md:text-base">
                              {title}
                            </h4>
                            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                              {badge}
                            </span>
                          </div>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-dashed border-brand/30 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                  Keep your writing, research, and publishing momentum in one connected workflow without starting over.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
