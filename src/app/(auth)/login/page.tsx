import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full max-w-md" />}>
      <LoginContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function LoginContent({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  return <LoginForm next={next} />;
}
