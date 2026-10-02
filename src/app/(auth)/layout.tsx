import { Logo } from "@/components/site-chrome";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh grid lg:grid-cols-2 bg-canvas">
      <aside className="hidden lg:flex lg:flex-col bg-sand p-8 lg:p-12 justify-between" aria-hidden="true">
        <Logo className="w-24 h-auto" />
        <div>
          <blockquote className="font-display text-3xl text-ink leading-snug">
            "The best gift you can give someone is to ask about their life — and really listen."
          </blockquote>
          <p className="mt-4 text-ink-muted">A SYNAPSE conversation can be as simple as one good question.</p>
        </div>
        <div className="flex justify-center gap-4">
          <span className="size-3 rounded-full bg-clay-soft" aria-hidden="true" />
          <span className="size-3 rounded-full bg-sage-soft" aria-hidden="true" />
          <span className="size-3 rounded-full bg-honey-soft" aria-hidden="true" />
        </div>
      </aside>
      <main id="main" className="mx-auto w-full max-w-md px-4 py-10 sm:py-16 lg:px-8 lg:py-12">
        <Logo className="lg:hidden w-20 h-auto mx-auto mb-8" />
        {children}
      </main>
    </div>
  );
}
