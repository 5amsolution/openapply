import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { hasAIConfig } from "@/lib/ai/settings";
import { Notice, PageHeader } from "@/components/ui";
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

  return (
    <>
      <PageHeader
        tint="pink"
        eyebrow={<>✦ The AI writes from this</>}
        title="Profile & resume"
        description="Everything the AI knows about you comes from here. It never adds experience you don't have."
      />
      {sp.welcome && (
        <div className="mb-4">
          <Notice tone="accent">Welcome! Start by uploading your resume — we&apos;ll fill in the rest.</Notice>
        </div>
      )}
      <ResumeUpload filename={profile.resume_filename} aiReady={aiReady} />
      <ProfileForm profile={profile} />
    </>
  );
}
