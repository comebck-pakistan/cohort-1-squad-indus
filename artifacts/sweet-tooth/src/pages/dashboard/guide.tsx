import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { BAKER_GUIDE_SECTIONS } from "@/lib/baker-guide";
import { BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { Link } from "wouter";

export default function DashboardGuide() {
  const [openId, setOpenId] = useState(BAKER_GUIDE_SECTIONS[0]?.id ?? "");

  return (
    <DashboardLayout>
      <div className="p-8 max-w-3xl">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-wide text-primary">Baker guide</p>
          <h1 className="font-serif text-4xl font-bold mt-2">How to use Sweet Tooth</h1>
          <p className="text-muted-foreground mt-2">
            Step-by-step help for each part of your dashboard. Your agent uses the same data you set here.
          </p>
        </div>

        <div className="space-y-3">
          {BAKER_GUIDE_SECTIONS.map((section) => {
            const open = openId === section.id;
            return (
              <article key={section.id} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? "" : section.id)}
                  className="flex w-full items-start gap-3 p-5 text-left hover:bg-muted/30 transition-colors"
                >
                  <BookOpen className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h2 className="font-serif text-lg font-bold">{section.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{section.summary}</p>
                  </div>
                  {open ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                </button>
                {open && (
                  <ol className="list-decimal list-inside space-y-2 px-5 pb-5 text-sm text-muted-foreground border-t border-border pt-4 ml-2">
                    {section.steps.map((step) => (
                      <li key={step} className="leading-relaxed pl-1">
                        {step}
                      </li>
                    ))}
                  </ol>
                )}
              </article>
            );
          })}
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Need help?{" "}
          <Link href="/contact" className="font-semibold text-primary hover:underline">
            Contact the Sweet Tooth team
          </Link>
        </p>
      </div>
    </DashboardLayout>
  );
}
