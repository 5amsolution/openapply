import type { Metadata } from "next";
import { Sparkles, UserRound } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { hasAIConfig } from "@/lib/ai/settings";
import { Notice, PageHeader, ScoreRing } from "@/components/ui";
import { ProfileForm } from "@/components/profile-form";
import { ResumeUpload } from "@/components/resume-upload";
import type { Profile } from "@/lib/types";

export const metadata: Metadata = { title: "Profile & resume" };

export default async function ProfilePage(props: PageProps<"/profile">) {
  const sp = await props.searchParams;
  const { supabase, user } = await requireUser();
  const [{ data }, aiReady] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    hasAIConfig(user.id),
  ]);
  const profile = data as unknown as Profile;

  const checks = [
    !!profile.resume_path,
    !!profile.full_name,
    !!profile.headline,
    !!profile.email,
    !!profile.location,
    !!profile.summary,
    (profile.skills?.length ?? 0) >= 3,
    (profile.desired_titles?.length ?? 0) > 0,
    (profile.experience?.length ?? 0) > 0,
    (profile.education?.length ?? 0) > 0,
  ];
  const complete = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  return (
    <>
      <PageHeader
        icon={<UserRound size={22} />}
        tone="pink"
        eyebrow={
          <>
            <Sparkles size={14} aria-hidden="true" /> The AI writes from this
          </>
        }
        title="Profile & resume"
        description="Everything the AI knows about you comes from here. It never adds experience you don't have."
        actions={
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface py-2 pl-2 pr-4 shadow-xs">
            <ScoreRing score={complete} size={48} label="Profile completeness" />
            <div>
              <p className="text-sm font-bold text-fg">{complete === 100 ? "Profile complete" : `${complete}% complete`}</p>
              <p className="text-xs text-muted">{complete === 100 ? "Great — the AI has everything" : "Fuller profiles get better letters"}</p>
            </div>
          </div>
        }
      />
      {sp.welcome && (
        <Notice tone="success" title="Welcome to OpenApply!" className="mb-5">
          Start by uploading your resume — we&apos;ll fill in the rest for you.
        </Notice>
      )}
      <ResumeUpload filename={profile.resume_filename} aiReady={aiReady} />
      <ProfileForm profile={profile} />
    </>
  );
}
