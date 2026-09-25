"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, CheckCircle2, GraduationCap, MessageSquareText, Plus, Target, Trash2, UserRound } from "lucide-react";
import { updateProfileAction } from "@/app/(app)/actions";
import { toast } from "@/components/toast";
import { Button, Card, FieldHint, Input, Label, SectionTitle, Select, Textarea, buttonClass } from "@/components/ui";
import type { EducationItem, ExperienceItem, Profile } from "@/lib/types";

const SUGGESTED_QUESTIONS = [
  "How did you hear about us?",
  "Are you willing to relocate?",
  "Do you have any disabilities or require accommodations?",
  "What is your gender / veteran / ethnicity? (EEO)",
];

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [experience, setExperience] = useState<ExperienceItem[]>(profile.experience ?? []);
  const [education, setEducation] = useState<EducationItem[]>(profile.education ?? []);
  const [answers, setAnswers] = useState<[string, string][]>(Object.entries(profile.standard_answers ?? {}));
  const [pending, start] = useTransition();
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  // The resume upload refreshes the page with new server data; remount-free sync:
  const [seenUpdate, setSeenUpdate] = useState(profile.updated_at);
  if (profile.updated_at !== seenUpdate) {
    setSeenUpdate(profile.updated_at);
    setExperience(profile.experience ?? []);
    setEducation(profile.education ?? []);
    setAnswers(Object.entries(profile.standard_answers ?? {}));
    setDirty(false);
  }

  const submit = (formData: FormData) =>
    start(async () => {
      setMessage(null);
      formData.set("experience", JSON.stringify(experience.filter((e) => e.title || e.company)));
      formData.set("education", JSON.stringify(education.filter((e) => e.school)));
      formData.set(
        "standard_answers",
        JSON.stringify(Object.fromEntries(answers.filter(([q, a]) => q.trim() && a.trim()).map(([q, a]) => [q.trim(), a.trim()]))),
      );
      const res = await updateProfileAction(formData);
      setMessage(res.ok ? null : { tone: "danger", text: res.error });
      if (res.ok) {
        setDirty(false);
        toast("Profile saved.");
        router.refresh();
      }
    });

  const links = profile.links ?? {};
  const removeClass = buttonClass("ghost", "sm", "text-muted hover:bg-danger-soft hover:text-danger-soft-fg");

  return (
    <form
      action={submit}
      key={profile.updated_at}
      className="grid gap-6"
      onChange={() => setDirty(true)}
      onClick={(e) => {
        // Adding/removing roles, schools or answers also counts as an edit.
        if ((e.target as HTMLElement).closest("button[type=button]")) setDirty(true);
      }}
    >
      <Card className="p-5 sm:p-6">
        <SectionTitle icon={<UserRound size={18} />} tone="pink" title="Basics" hint="How employers reach you." />
        <div className="grid gap-5 md:grid-cols-2">
          <Field name="full_name" label="Full name" defaultValue={profile.full_name} autoComplete="name" />
          <Field name="headline" label="Headline" defaultValue={profile.headline} placeholder="e.g. Senior Product Designer" />
          <Field name="email" label="Email for applications" defaultValue={profile.email} type="email" autoComplete="email" />
          <Field name="phone" label="Phone" defaultValue={profile.phone} type="tel" autoComplete="tel" />
          <Field name="location" label="Where you live" defaultValue={profile.location} placeholder="City, Country" />
          <Field name="linkedin" label="LinkedIn" defaultValue={links.linkedin} placeholder="https://linkedin.com/in/…" />
          <Field name="github" label="GitHub" defaultValue={links.github} placeholder="https://github.com/…" />
          <Field name="portfolio" label="Portfolio / website" defaultValue={links.portfolio} placeholder="https://…" />
          <div className="md:col-span-2">
            <Label htmlFor="summary">Professional summary</Label>
            <Textarea id="summary" name="summary" defaultValue={profile.summary ?? ""} placeholder="Two or three sentences about what you do best." />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="skills" hint="comma or line separated">
              Skills
            </Label>
            <Textarea id="skills" name="skills" defaultValue={(profile.skills ?? []).join(", ")} className="min-h-20" placeholder="e.g. React, TypeScript, user research" />
            <FieldHint>The AI matches these against every job description.</FieldHint>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionTitle icon={<Target size={18} />} tone="primary" title="What you're looking for" hint="Used to suggest searches and to fill forms." />
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <Label htmlFor="desired_titles" hint="comma separated">
              Target job titles
            </Label>
            <Input id="desired_titles" name="desired_titles" defaultValue={(profile.desired_titles ?? []).join(", ")} placeholder="e.g. Frontend Engineer, UI Developer" />
          </div>
          <div>
            <Label htmlFor="desired_locations" hint="comma separated">
              Preferred locations
            </Label>
            <Input id="desired_locations" name="desired_locations" defaultValue={(profile.desired_locations ?? []).join(", ")} placeholder="e.g. Berlin, Remote" />
          </div>
          <div>
            <Label htmlFor="remote_preference">Work style</Label>
            <Select id="remote_preference" name="remote_preference" defaultValue={profile.remote_preference}>
              <option value="any">Open to anything</option>
              <option value="remote">Remote only</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </Select>
          </div>
          <Field name="salary_expectation" label="Salary expectation" defaultValue={profile.salary_expectation} placeholder="e.g. $120k–140k or negotiable" />
          <Field name="work_authorization" label="Work authorization" defaultValue={profile.work_authorization} placeholder="e.g. US citizen, EU passport, H-1B" />
          <div>
            <Label htmlFor="needs_sponsorship">Needs visa sponsorship?</Label>
            <Select
              id="needs_sponsorship"
              name="needs_sponsorship"
              defaultValue={profile.needs_sponsorship == null ? "" : profile.needs_sponsorship ? "yes" : "no"}
            >
              <option value="">Prefer not to say</option>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </Select>
          </div>
          <Field name="notice_period" label="Notice period / start date" defaultValue={profile.notice_period} placeholder="e.g. 2 weeks" />
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionTitle
          icon={<Briefcase size={18} />}
          tone="violet"
          title="Experience"
          hint="Your roles, newest first."
          action={
            <Button type="button" variant="secondary" size="sm" onClick={() => setExperience([...experience, { title: "", company: "", bullets: [] }])}>
              <Plus size={15} aria-hidden="true" /> Add role
            </Button>
          }
        />
        <div className="grid gap-4">
          {experience.length === 0 && (
            <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-sm text-muted">Upload a resume above, or add your roles here.</p>
          )}
          {experience.map((e, i) => {
            const upd = (patch: Partial<ExperienceItem>) => setExperience(experience.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            return (
              <fieldset key={i} className="grid gap-3 rounded-xl border border-border bg-surface-2 p-4 md:grid-cols-2">
                <legend className="sr-only">Role {i + 1}</legend>
                <Input aria-label="Title" placeholder="Title" value={e.title} onChange={(ev) => upd({ title: ev.target.value })} />
                <Input aria-label="Company" placeholder="Company" value={e.company} onChange={(ev) => upd({ company: ev.target.value })} />
                <Input aria-label="Start" placeholder="Start (e.g. Jan 2021)" value={e.start ?? ""} onChange={(ev) => upd({ start: ev.target.value })} />
                <Input aria-label="End" placeholder="End (or Present)" value={e.end ?? ""} onChange={(ev) => upd({ end: ev.target.value })} />
                <Textarea
                  aria-label="Highlights"
                  className="md:col-span-2"
                  placeholder="One highlight per line"
                  value={(e.bullets ?? []).join("\n")}
                  onChange={(ev) => upd({ bullets: ev.target.value.split("\n") })}
                />
                <button type="button" className={`${removeClass} justify-self-start`} onClick={() => setExperience(experience.filter((_, j) => j !== i))}>
                  <Trash2 size={15} aria-hidden="true" /> Remove role
                </button>
              </fieldset>
            );
          })}
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionTitle
          icon={<GraduationCap size={18} />}
          tone="info"
          title="Education"
          action={
            <Button type="button" variant="secondary" size="sm" onClick={() => setEducation([...education, { school: "" }])}>
              <Plus size={15} aria-hidden="true" /> Add school
            </Button>
          }
        />
        <div className="grid gap-3">
          {education.length === 0 && <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-sm text-muted">No education added yet.</p>}
          {education.map((e, i) => {
            const upd = (patch: Partial<EducationItem>) => setEducation(education.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            return (
              <fieldset key={i} className="grid gap-3 rounded-xl border border-border bg-surface-2 p-4 md:grid-cols-[1fr_1fr_1fr_7rem_auto]">
                <legend className="sr-only">School {i + 1}</legend>
                <Input aria-label="School" placeholder="School" value={e.school} onChange={(ev) => upd({ school: ev.target.value })} />
                <Input aria-label="Degree" placeholder="Degree" value={e.degree ?? ""} onChange={(ev) => upd({ degree: ev.target.value })} />
                <Input aria-label="Field" placeholder="Field of study" value={e.field ?? ""} onChange={(ev) => upd({ field: ev.target.value })} />
                <Input aria-label="Graduated" placeholder="Year" value={e.end ?? ""} onChange={(ev) => upd({ end: ev.target.value })} />
                <button
                  type="button"
                  aria-label={`Remove ${e.school || "school"}`}
                  className={buttonClass("ghost", "icon", "text-muted hover:bg-danger-soft hover:text-danger-soft-fg")}
                  onClick={() => setEducation(education.filter((_, j) => j !== i))}
                >
                  <Trash2 size={17} aria-hidden="true" />
                </button>
              </fieldset>
            );
          })}
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionTitle
          icon={<MessageSquareText size={18} />}
          tone="warn"
          title="Standard answers"
          hint="Answers you give on every form. The AI and the extension reuse them word for word."
        />
        <div className="grid gap-3">
          {answers.map(([q, a], i) => (
            <div key={i} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <Input aria-label="Question" placeholder="Question" value={q} onChange={(e) => setAnswers(answers.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} />
              <Input aria-label="Answer" placeholder="Your answer" value={a} onChange={(e) => setAnswers(answers.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} />
              <button
                type="button"
                aria-label={`Remove answer${q ? `: ${q}` : ""}`}
                className={buttonClass("ghost", "icon", "text-muted hover:bg-danger-soft hover:text-danger-soft-fg")}
                onClick={() => setAnswers(answers.filter((_, j) => j !== i))}
              >
                <Trash2 size={17} aria-hidden="true" />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button type="button" variant="secondary" size="sm" onClick={() => setAnswers([...answers, ["", ""]])}>
              <Plus size={15} aria-hidden="true" /> Add answer
            </Button>
            {SUGGESTED_QUESTIONS.filter((s) => !answers.some(([q]) => q === s)).map((s) => (
              <button
                key={s}
                type="button"
                className="inline-flex h-9 items-center rounded-full border border-dashed border-border-strong px-3 text-[13px] font-medium text-muted transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary-soft-fg"
                onClick={() => setAnswers([...answers, [s, ""]])}
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="sticky bottom-20 z-20 md:bottom-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 px-4 py-3 shadow-lg backdrop-blur-md">
          <p className="text-sm" role="status">
            {message ? (
              <span className="font-medium text-danger">{message.text}</span>
            ) : dirty ? (
              <span className="inline-flex items-center gap-2 font-semibold text-fg">
                <span className="h-2.5 w-2.5 rounded-full bg-warn" aria-hidden="true" /> You have unsaved changes
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-muted">
                <CheckCircle2 size={16} aria-hidden="true" className="text-success" /> All changes saved
              </span>
            )}
          </p>
          <Button type="submit" loading={pending} disabled={!dirty && !pending}>
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  ...rest
}: { name: string; label: string; defaultValue?: string | null } & Omit<React.ComponentProps<"input">, "defaultValue">) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue ?? ""} {...rest} />
    </div>
  );
}
