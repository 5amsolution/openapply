"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { updateProfileAction } from "@/app/(app)/actions";
import { Button, Card, Input, Label, Notice, Select, Textarea } from "@/components/ui";
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
  const [message, setMessage] = useState<{ tone: "accent" | "danger"; text: string } | null>(null);

  // The resume upload refreshes the page with new server data; remount-free sync:
  const [seenUpdate, setSeenUpdate] = useState(profile.updated_at);
  if (profile.updated_at !== seenUpdate) {
    setSeenUpdate(profile.updated_at);
    setExperience(profile.experience ?? []);
    setEducation(profile.education ?? []);
    setAnswers(Object.entries(profile.standard_answers ?? {}));
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
      setMessage(res.ok ? { tone: "accent", text: "Profile saved." } : { tone: "danger", text: res.error });
      if (res.ok) router.refresh();
    });

  const links = profile.links ?? {};

  return (
    <form action={submit} key={profile.updated_at} className="grid gap-6">
      <Card className="grid gap-4 p-5 md:grid-cols-2">
        <h2 className="font-medium md:col-span-2">Basics</h2>
        <Field name="full_name" label="Full name" defaultValue={profile.full_name} autoComplete="name" />
        <Field name="headline" label="Headline" defaultValue={profile.headline} placeholder="e.g. Senior Product Designer" />
        <Field name="email" label="Email for applications" defaultValue={profile.email} type="email" />
        <Field name="phone" label="Phone" defaultValue={profile.phone} type="tel" />
        <Field name="location" label="Where you live" defaultValue={profile.location} placeholder="City, Country" />
        <Field name="linkedin" label="LinkedIn" defaultValue={links.linkedin} placeholder="https://linkedin.com/in/…" />
        <Field name="github" label="GitHub" defaultValue={links.github} />
        <Field name="portfolio" label="Portfolio / website" defaultValue={links.portfolio} />
        <div className="md:col-span-2">
          <Label htmlFor="summary">Professional summary</Label>
          <Textarea id="summary" name="summary" defaultValue={profile.summary ?? ""} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="skills" hint="comma or line separated">
            Skills
          </Label>
          <Textarea id="skills" name="skills" defaultValue={(profile.skills ?? []).join(", ")} className="min-h-20" />
        </div>
      </Card>

      <Card className="grid gap-4 p-5 md:grid-cols-2">
        <h2 className="font-medium md:col-span-2">What you&apos;re looking for</h2>
        <div>
          <Label htmlFor="desired_titles" hint="comma separated">
            Target job titles
          </Label>
          <Input id="desired_titles" name="desired_titles" defaultValue={(profile.desired_titles ?? []).join(", ")} />
        </div>
        <div>
          <Label htmlFor="desired_locations" hint="comma separated">
            Preferred locations
          </Label>
          <Input id="desired_locations" name="desired_locations" defaultValue={(profile.desired_locations ?? []).join(", ")} />
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
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Experience</h2>
          <Button type="button" variant="secondary" onClick={() => setExperience([...experience, { title: "", company: "", bullets: [] }])}>
            <Plus size={14} /> Add role
          </Button>
        </div>
        <div className="grid gap-4">
          {experience.length === 0 && <p className="text-sm text-muted">Upload a resume or add roles manually.</p>}
          {experience.map((e, i) => {
            const upd = (patch: Partial<ExperienceItem>) => setExperience(experience.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            return (
              <div key={i} className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-2">
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
                <button
                  type="button"
                  className="inline-flex items-center gap-1 justify-self-start text-sm text-muted hover:text-danger"
                  onClick={() => setExperience(experience.filter((_, j) => j !== i))}
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Education</h2>
          <Button type="button" variant="secondary" onClick={() => setEducation([...education, { school: "" }])}>
            <Plus size={14} /> Add
          </Button>
        </div>
        <div className="grid gap-3">
          {education.map((e, i) => {
            const upd = (patch: Partial<EducationItem>) => setEducation(education.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            return (
              <div key={i} className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-[1fr_1fr_1fr_8rem_auto]">
                <Input aria-label="School" placeholder="School" value={e.school} onChange={(ev) => upd({ school: ev.target.value })} />
                <Input aria-label="Degree" placeholder="Degree" value={e.degree ?? ""} onChange={(ev) => upd({ degree: ev.target.value })} />
                <Input aria-label="Field" placeholder="Field of study" value={e.field ?? ""} onChange={(ev) => upd({ field: ev.target.value })} />
                <Input aria-label="Graduated" placeholder="Year" value={e.end ?? ""} onChange={(ev) => upd({ end: ev.target.value })} />
                <button type="button" aria-label="Remove" className="text-muted hover:text-danger" onClick={() => setEducation(education.filter((_, j) => j !== i))}>
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-medium">Standard answers</h2>
        <p className="mb-3 text-sm text-muted">Answers you give on every form. The AI and the extension reuse them word for word.</p>
        <div className="grid gap-3">
          {answers.map(([q, a], i) => (
            <div key={i} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <Input aria-label="Question" placeholder="Question" value={q} onChange={(e) => setAnswers(answers.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} />
              <Input aria-label="Answer" placeholder="Your answer" value={a} onChange={(e) => setAnswers(answers.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} />
              <button type="button" aria-label="Remove" className="text-muted hover:text-danger" onClick={() => setAnswers(answers.filter((_, j) => j !== i))}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setAnswers([...answers, ["", ""]])}>
              <Plus size={14} /> Add answer
            </Button>
            {SUGGESTED_QUESTIONS.filter((s) => !answers.some(([q]) => q === s)).map((s) => (
              <button key={s} type="button" className="rounded-md bg-surface-2 px-2 py-1 text-xs text-muted hover:text-fg" onClick={() => setAnswers([...answers, [s, ""]])}>
                + {s}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="sticky bottom-4 z-10 flex items-center gap-3">
        <Button type="submit" disabled={pending} className="shadow-lg">
          {pending ? "Saving…" : "Save profile"}
        </Button>
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
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
