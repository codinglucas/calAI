import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy Policy" };

const CONTACT_EMAIL = "lucasavelino2007@gmail.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

// Public: linked from Google's sign-in consent screen, so it must load without
// a session (see lib/routes.ts). Keep it in step with what the app really does.
export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-10 text-sm leading-relaxed">
      <Link href="/" className="text-accent text-lg font-bold tracking-tight">
        calAI
      </Link>

      <header>
        <h1 className="text-2xl font-semibold">Privacy Policy</h1>
        <p className="text-muted">Last updated November 3, 2026</p>
      </header>

      <p>
        calAI is a personal calorie tracker. By creating an account or using calAI, you agree to
        this policy. If you don&apos;t agree, please don&apos;t use the app.
      </p>

      <Section title="What we collect">
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>
            <strong>Account:</strong> your email address and a hashed password. If you sign in with
            Google, also the basic profile details Google shares, such as your name and picture.
          </li>
          <li>
            <strong>Food log:</strong> the foods, amounts, calories, macros and times you save.
          </li>
          <li>
            <strong>Settings:</strong> your calorie and macro goals and your time zone.
          </li>
        </ul>
      </Section>

      <Section title="Photos">
        <p>
          We don&apos;t store your photos. A photo you submit is sent through our server to an AI
          provider, currently Google Gemini, to estimate its nutrition, and we don&apos;t save or
          log it. Google may use what it receives to improve its products, so don&apos;t submit
          photos of people, documents or anything private.
        </p>
      </Section>

      <Section title="How we use your data">
        <p>
          Only to run calAI: to sign you in, show your log and track your goals. Google account data
          is used only for sign-in. We don&apos;t sell your data, show ads or use analytics, and our
          only cookies are the ones that keep you signed in.
        </p>
      </Section>

      <Section title="Who handles it">
        <p>
          Supabase (accounts and database), Vercel (hosting) and Google (Google sign-in and photo
          analysis) process data for us to provide the app.
        </p>
      </Section>

      <Section title="Keeping and deleting your data">
        <p>
          We keep your data until you ask us to delete it. To delete your account or to access or
          correct your data, email us at the address below.
        </p>
      </Section>

      <Section title="Estimates">
        <p>
          Calorie and macro figures are estimates and can be wrong. calAI isn&apos;t medical or
          nutrition advice.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          If this policy changes, we&apos;ll update this page and its date. Using calAI after a
          change means you accept it.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent font-medium underline">
            {CONTACT_EMAIL}
          </a>
        </p>
      </Section>
    </main>
  );
}
