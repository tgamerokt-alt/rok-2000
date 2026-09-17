import { Suspense } from "react";
import { getDictionary } from "@/lib/i18n/locale";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const { t } = await getDictionary();
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <Suspense fallback={null}>
        <LoginForm t={t} />
      </Suspense>
    </main>
  );
}
