import { LoginForm } from "@/components/app/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 py-8 lg:px-6 lg:py-12">
      <LoginForm />
    </main>
  );
}
