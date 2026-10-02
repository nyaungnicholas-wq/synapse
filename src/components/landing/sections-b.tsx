import {
  MessageSquare,
  Users,
  Lock,
  BookOpen,
  Globe,
  Heart,
  Quote,
  Plus,
  Check } from "lucide-react";
import { ButtonLink, Badge, Card, cx } from "@/components/ui";

export type PricingPlan = {
  code: "FREE" | "PREMIUM";
  name: string;
  priceCents: number;
  interval: "MONTH" | "YEAR";
  features: string[];
};

function SectionWrapper({
  id,
  children,
  className,
  fullWidthBg,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
  fullWidthBg?: boolean;
}) {
  return (
    <section
      id={id}
      className={cx(
        fullWidthBg && "bg-sand",
        className,
      )}
      aria-labelledby={id ? `${id}-heading` : undefined}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        {children}
      </div>
    </section>
  );
}

export function Benefits() {
  const benefits = [
    {
      icon: MessageSquare,
      title: "Always something to say",
      desc: "A fresh question every day.",
    },
    {
      icon: Users,
      title: "Easy for every generation",
      desc: "Large text, clear buttons, nothing hidden in menus.",
    },
    {
      icon: Lock,
      title: "Private by design",
      desc: "Only the two of you can see your space; no ads, no public profiles.",
    },
    {
      icon: BookOpen,
      title: "Stories that last",
      desc: "Answers and photos are saved to a shared scrapbook.",
    },
    {
      icon: Globe,
      title: "Works near or far",
      desc: "At the kitchen table, on a video call, or across time zones.",
    },
    {
      icon: Heart,
      title: "No pressure",
      desc: "No streaks or nagging — come back when it suits you.",
    },
  ];

  return (
    <SectionWrapper fullWidthBg>
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="text-ink-muted text-sm font-medium tracking-wider uppercase mb-2">
          What changes
        </p>
        <h2
          id="benefits-heading"
          className="font-display text-3xl sm:text-4xl text-ink"
        >
          Small conversations. Real closeness.
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {benefits.map(({ icon: Icon, title, desc }, i) => (
          <Card
            key={i}
            className="p-6 text-center bg-surface border-line"
          >
            <Icon className="mx-auto h-10 w-10 text-clay" aria-hidden="true" />
            <h3 className="mt-4 font-display text-lg text-ink">
              {title}
            </h3>
            <p className="mt-2 text-ink-soft text-base">{desc}</p>
          </Card>
        ))}
      </div>
    </SectionWrapper>
  );
}

export function WhoItsFor() {
  const audiences = [
    {
      title: "Grandparents and grandchildren",
      desc: "Share stories, recipes, and everyday moments across the generational gap.",
    },
    {
      title: "Parents and their teenage or adult children",
      desc: "Stay close through life transitions — college, first jobs, new families.",
    },
    {
      title: "Older adults and their caregivers",
      desc: "A simple way to check in, reminisce, and coordinate care together.",
    },
    {
      title: "Community programs",
      desc:
        "Schools, libraries, senior centers and youth groups running intergenerational programs.",
    },
  ];

  return (
    <SectionWrapper id="who-its-for">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="text-ink-muted text-sm font-medium tracking-wider uppercase mb-2">
          Who it's for
        </p>
        <h2
          id="who-its-for-heading"
          className="font-display text-3xl sm:text-4xl text-ink"
        >
          Made for the people who matter to each other
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {audiences.map(({ title, desc }, i) => (
          <Card key={i} className="p-6 bg-surface border-line">
            <h3 className="font-display text-lg text-ink">{title}</h3>
            <p className="mt-2 text-ink-soft">{desc}</p>
          </Card>
        ))}
      </div>
    </SectionWrapper>
  );
}

export function Testimonials() {
  return (
    <SectionWrapper fullWidthBg>
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2
          id="testimonials-heading"
          className="font-display text-3xl sm:text-4xl text-ink"
        >
          Stories from our first families
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-card border-2 border-dashed border-line-strong bg-surface/70 p-6"
          >
            <Quote className="mx-auto h-8 w-8 text-ink-muted" aria-hidden="true" />
            <p className="mt-4 text-center text-ink-soft">
              Space for a story from one of our pilot families.
            </p>
            <div className="mt-4 flex justify-center">
              <Badge tone="neutral">Coming soon</Badge>
            </div>
          </div>
        ))}
      </div>
      <div className="text-center max-w-xl mx-auto">
        <p className="text-ink-soft mb-6">
          We are gathering feedback from our first families and community
          partners. Want to be one of them?
        </p>
        <ButtonLink variant="secondary" href="/signup" size="lg">
          Join the pilot
        </ButtonLink>
      </div>
    </SectionWrapper>
  );
}

export function Pricing({ plans }: { plans: PricingPlan[] }) {
  if (!plans.length) return null;

  return (
    <SectionWrapper id="pricing">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="text-ink-muted text-sm font-medium tracking-wider uppercase mb-2">
          Pricing
        </p>
        <h2
          id="pricing-heading"
          className="font-display text-3xl sm:text-4xl text-ink"
        >
          Start free. Upgrade if it helps.
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {plans.map((plan) => {
          const isPremium = plan.code === "PREMIUM";
          const price =
            plan.priceCents === 0
              ? "Free"
              : `$${(plan.priceCents / 100).toFixed(2)}`;
          const interval =
            plan.interval === "YEAR" ? " / year" : " / month";

          return (
            <Card
              key={plan.code}
              className={cx(
                "p-6 relative bg-surface",
                isPremium && "border-2 border-clay",
              )}
            >
              {isPremium && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge tone="clay">Covers both of you</Badge>
                </div>
              )}
              <h3 className="font-display text-xl text-ink text-center">
                {plan.name}
              </h3>
              <div className="mt-4 text-center">
                <span className="font-display text-4xl text-ink">
                  {price}
                </span>
                {plan.priceCents > 0 && (
                  <span className="text-ink-muted">{interval}</span>
                )}
              </div>
              <ul className="mt-6 space-y-3" role="list">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check
                      className="h-5 w-5 text-sage flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span className="text-ink-soft">{feature}</span>
                  </li>
                ))}
              </ul>
              <ButtonLink
                href="/signup"
                variant={isPremium ? "primary" : "secondary"}
                className="w-full mt-6 text-center"
              >
                {isPremium
                  ? "Start free, upgrade anytime"
                  : "Start free"}
              </ButtonLink>
            </Card>
          );
        })}
      </div>
      <p className="mt-10 text-center text-ink-muted text-sm">
        Premium is shared: if one person in a Connection Space has it, both of
        you do. Cancel anytime.
      </p>
    </SectionWrapper>
  );
}

export function Faq() {
  const faqs = [
    {
      q: "Is SYNAPSE hard to use?",
      a:
        "No. Every screen is designed for clarity — large text, obvious buttons, and no hidden menus. If you can use a web browser, you can use SYNAPSE.",
    },
    {
      q: "Does my grandparent need a smartphone?",
      a:
        "Any device with a web browser works: phone, tablet, laptop, or a family computer. Text can be made larger in Settings.",
    },
    {
      q: "Who can see what we share?",
      a:
        "Only the two people in the Connection Space. We never sell data or show ads. You can delete memories you added at any time.",
    },
    {
      q: "Is this a social network?",
      a:
        "No feed, no followers, no likes — just a private space for two people to talk and do things together.",
    },
    {
      q: "What if we live far apart?",
      a:
        "Do activities on a video or phone call, or answer questions in your own time. The space is always there when you're ready.",
    },
    {
      q: "What does it cost?",
      a:
        "The free plan includes a few conversations and one activity each week. Premium is unlimited and covers both people.",
    },
    {
      q: "Can I cancel Premium?",
      a:
        "Yes, anytime, and you keep everything you saved. Nothing is deleted when you downgrade.",
    },
    {
      q: "Can schools or community groups use SYNAPSE?",
      a:
        "Yes — community programs are something we are building toward. Get in touch through the team running your pilot.",
    },
  ];

  return (
    <SectionWrapper id="faq">
      <h2
        id="faq-heading"
        className="font-display text-3xl sm:text-4xl text-ink text-center mb-10"
      >
        Questions people ask
      </h2>
      <div className="max-w-3xl mx-auto">
        {faqs.map(({ q, a }, i) => (
          <details
            key={i}
            className="group border-b border-line"
          >
            <summary className={cx(
              "flex min-h-14 items-center justify-between gap-4 py-4 text-lg font-semibold cursor-pointer list-none",
              "[&::-webkit-details-marker]:hidden",
            )}>
              {q}
              <Plus
                className={cx(
                  "h-6 w-6 text-ink-muted flex-shrink-0 transition-transform",
                  "group-open:rotate-45",
                )}
                aria-hidden="true"
              />
            </summary>
            <div className="pb-5 text-ink-soft">{a}</div>
          </details>
        ))}
      </div>
    </SectionWrapper>
  );
}

export function FinalCta() {
  return (
    <SectionWrapper>
      <div className="rounded-card bg-ink px-6 py-14 text-center text-white">
        <h2 className="font-display text-4xl sm:text-5xl mb-4">
          Someone you love has stories you haven't heard yet.
        </h2>
        <p className="text-lg text-white/85 max-w-xl mx-auto mb-8">
          It takes two minutes to start. Your first conversation could be
          tonight.
        </p>
        <ButtonLink size="lg" variant="secondary" href="/signup" className="mt-8">
          Start Connecting
        </ButtonLink>
      </div>
    </SectionWrapper>
  );
}