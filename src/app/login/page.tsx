import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const params = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const next = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/dashboard";
  if (user) redirect(next);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <div className="mb-8">
        <Logo />
      </div>
      <LoginForm
        initialMode={params.mode === "signup" ? "signup" : "signin"}
        next={next}
        error={typeof params.error === "string" ? params.error : undefined}
        googleEnabled={process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true"}
        githubEnabled={process.env.NEXT_PUBLIC_GITHUB_AUTH === "true"}
      />
    </div>
  );
}
