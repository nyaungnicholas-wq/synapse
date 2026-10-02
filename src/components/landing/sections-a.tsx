import { ButtonLink, Badge, Card } from "@/components/ui";
import { features } from "@/lib/env";
import { Heart, Clock, MessageSquare, Music, Zap } from "lucide-react";

export function Hero() {
  return (
    <section className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="lg:flex lg:items-center lg:gap-12">
          <div className="lg:w-1/2">
            <p className="text-sm font-semibold text-clay">
              For grandparents, parents and the young people they love
            </p>
            <h1 className="mt-4 font-display text-5xl sm:text-6xl text-ink">
              Closer, one conversation at a time.
            </h1>
            <p className="mt-6 text-xl text-ink-soft">
              SYNAPSE gives two people from different generations simple, guided ways to talk, share stories and do things together — with a private space to keep what you share.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <ButtonLink size="lg" href="/signup">
                Start Connecting
              </ButtonLink>
              <ButtonLink variant="secondary" size="lg" href="#how-it-works">
                See How It Works
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-ink-muted">
              Free to start. Nothing to install. Works on any phone, tablet or computer.
            </p>
            {features.demo && (
              <div className="mt-8 rounded-card border-2 border-clay bg-surface p-5 shadow-card">
                <p className="font-display text-2xl text-ink">Try the live demo</p>
                <p className="mt-1 text-ink-soft">
                  No sign-up. You get your own private copy of Rose and Leo&apos;s space, with ten weeks of conversations and memories.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {/* prefetch off: /demo creates an account, so it must only run on a real click */}
                  <ButtonLink href="/demo" prefetch={false} size="lg">
                    Explore as Leo, 16
                  </ButtonLink>
                  <ButtonLink href="/demo?as=rose" prefetch={false} size="lg" variant="secondary">
                    Explore as Rose, 78
                  </ButtonLink>
                </div>
              </div>
            )}
          </div>
          <div className="lg:w-1/2 mt-12 lg:mt-0 relative">
            <figure
              role="img"
              aria-label="Example of a SYNAPSE conversation between Rose, 78, and her grandson Leo, 16"
              className="hidden lg:block"
            >
              <div className="relative">
                <div
                  className="absolute inset-0 -z-10 rounded-full blur-2xl"
                >
                  <div className="bg-honey-soft w-32 h-32" style={{ left: "-16px", top: "-16px" }}></div>
                  <div className="bg-sage-soft w-24 h-24" style={{ right: "-8px", bottom: "-8px" }}></div>
                </div>
                <Card className="relative z-10 animate-rise">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge tone="sage">Today's conversation</Badge>
                    <Badge>Music</Badge>
                  </div>
                  <h2 className="font-display text-2xl text-ink mb-4">
                    Which song takes you straight back to being seventeen?
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-clay-soft text-clay text-xs font-semibold">
                        R
                      </div>
                      <div>
                        <p className="font-medium text-ink">Rose, 78</p>
                        <p className="text-ink-soft bg-clay-soft rounded px-3 py-1 max-w-xs">
                          Moon River. I heard it at the pictures with my sister and we hummed it the whole bus ride home.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 justify-end">
                      <div>
                        <p className="font-medium text-ink">Leo, 16</p>
                        <p className="text-ink-soft bg-sage-soft rounded px-3 py-1 max-w-xs">
                          Okay, I just listened to it. I get it now. Mine is Sweater Weather — I'll tell you why on Sunday.
                        </p>
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-soft text-white text-xs font-semibold">
                        L
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-ink-muted mt-4">
                    <span aria-hidden="true">
                      <Heart className="size-4" />
                    </span>
                    Saved to your memories
                  </div>
                </Card>
              </div>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Problem() {
  return (
    <section id="the-gap" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-sm font-semibold text-clay">
          Why it is hard
        </p>
        <h2 className="mt-4 font-display text-3xl sm:text-4xl text-ink">
          Love isn't the problem. The gap is.
        </h2>
        <p className="mt-6 text-xl text-ink-soft">
          You want to be close, but starting a conversation across generations can feel awkward. You’re not sure what to say or how to bridge the worlds you live in.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          <Card className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sand">
              <MessageSquare className="size-5 text-clay" aria-hidden="true" />
            </div>
            <h3 className="mt-4 font-semibold text-ink text-lg">
              Different tools
            </h3>
            <p className="mt-2 text-ink-soft">
              Texts and emojis on one side, phone calls and handwritten notes on the other.
            </p>
          </Card>
          <Card className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sand">
              <Music className="size-5 text-clay" aria-hidden="true" />
            </div>
            <h3 className="mt-4 font-semibold text-ink text-lg">
              Different worlds
            </h3>
            <p className="mt-2 text-ink-soft">
              Music, school and work changed so much that references don't land.
            </p>
          </Card>
          <Card className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sand">
              <Zap className="size-5 text-clay" aria-hidden="true" />
            </div>
            <h3 className="mt-4 font-semibold text-ink text-lg">
              Different pace
            </h3>
            <p className="mt-2 text-ink-soft">
              Quick replies meet long stories, and both feel unheard.
            </p>
          </Card>
        </div>
        <p className="mt-10 text-xl text-ink-soft">
          SYNAPSE gives you something worth talking about, and a gentle structure to do it.
        </p>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-sm font-semibold text-clay">
          How it works
        </p>
        <h2 className="mt-4 font-display text-3xl sm:text-4xl text-ink">
          Four simple steps
        </h2>
        <ol className="mt-10 space-y-6 sm:space-y-8 text-xl text-ink-soft sm:grid sm:grid-cols-2 sm:gap-6">
          <li className="flex items-start gap-4 p-6 bg-surface rounded-card border border-line">
            <span className="flex h-12 w-12 items-center justify-center font-display text-5xl text-clay" aria-hidden="true">
              1
            </span>
            <div>
              <h3 className="font-semibold text-ink">Make your profile</h3>
              <p className="mt-1">
                A few easy questions, about two minutes.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-4 p-6 bg-surface rounded-card border border-line">
            <span className="flex h-12 w-12 items-center justify-center font-display text-5xl text-clay" aria-hidden="true">
              2
            </span>
            <div>
              <h3 className="font-semibold text-ink">Invite your person</h3>
              <p className="mt-1">
                Send a link, read out a short code, or email an invitation — they join your private Connection Space.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-4 p-6 bg-surface rounded-card border border-line">
            <span className="flex h-12 w-12 items-center justify-center font-display text-5xl text-clay" aria-hidden="true">
              3
            </span>
            <div>
              <h3 className="font-semibold text-ink">Choose something to do</h3>
              <p className="mt-1">
                A conversation question or a guided activity, picked for today.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-4 p-6 bg-surface rounded-card border border-line">
            <span className="flex h-12 w-12 items-center justify-center font-display text-5xl text-clay" aria-hidden="true">
              4
            </span>
            <div>
              <h3 className="font-semibold text-ink">Keep what you share</h3>
              <p className="mt-1">
                Save stories, answers and photos to your private scrapbook.
              </p>
            </div>
          </li>
        </ol>
        <div className="mt-12">
          <ButtonLink size="lg" href="/signup">
            Start Connecting
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

export function ExampleActivities() {
  return (
    <section id="activities" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-sm font-semibold text-clay">
          Things to do together
        </p>
        <h2 className="mt-4 font-display text-3xl sm:text-4xl text-ink">
          Activities that do the hard part for you
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <span aria-hidden="true">
                <Clock className="size-5 text-clay" />
              </span>
              <span className="text-ink">20 min</span>
            </div>
            <Badge>Easy</Badge>
            <h3 className="mt-4 font-semibold text-ink text-lg">
              Then vs. Now
            </h3>
            <p className="mt-2 text-ink-soft">
              Compare what school, music, fashion or phones were like when each of you was growing up.
            </p>
          </Card>
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <span aria-hidden="true">
                <Clock className="size-5 text-clay" />
              </span>
              <span className="text-ink">30 min</span>
            </div>
            <Badge>Easy</Badge>
            <h3 className="mt-4 font-semibold text-ink text-lg">
              Memory Lane
            </h3>
            <p className="mt-2 text-ink-soft">
              One of you shares a meaningful memory; the other asks the guided follow-up questions.
            </p>
          </Card>
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <span aria-hidden="true">
                <Clock className="size-5 text-clay" />
              </span>
              <span className="text-ink">25 min</span>
            </div>
            <Badge>Some effort</Badge>
            <h3 className="mt-4 font-semibold text-ink text-lg">
              Teach Me Something
            </h3>
            <p className="mt-2 text-ink-soft">
              Each of you teaches the other a skill from your generation — a card game, a group chat, a recipe.
            </p>
          </Card>
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <span aria-hidden="true">
                <Clock className="size-5 text-clay" />
              </span>
              <span className="text-ink">40 min</span>
            </div>
            <Badge>Some effort</Badge>
            <h3 className="mt-4 font-semibold text-ink text-lg">
              Our Playlist
            </h3>
            <p className="mt-2 text-ink-soft">
              Each of you picks songs that matter and explains why. You end up with a playlist of two lives.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}

export function ExamplePrompts() {
  return (
    <section id="prompts" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-sm font-semibold text-clay">
          Conversation starters
        </p>
        <h2 className="mt-4 font-display text-3xl sm:text-4xl text-ink">
          Questions you'd never think to ask
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-3 lg:grid-cols-2">
          <div className="bg-surface border border-line rounded-card border-t-4 border-t-clay p-6">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-clay">
              Childhood
            </p>
            <p className="font-display text-xl text-ink">
              Which smell takes you straight back to the kitchen you grew up in?
            </p>
          </div>
          <div className="bg-surface border border-line rounded-card border-t-4 border-t-clay p-6">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-clay">
              Life lessons
            </p>
            <p className="font-display text-xl text-ink">
              Who was the first person who trusted you with something important?
            </p>
          </div>
          <div className="bg-surface border border-line rounded-card border-t-4 border-t-clay p-6">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-clay">
              Music
            </p>
            <p className="font-display text-xl text-ink">
              If you could put one song in a time capsule for 2075, which would it be?
            </p>
          </div>
          <div className="bg-surface border border-line rounded-card border-t-4 border-t-clay p-6">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-clay">
              Technology
            </p>
            <p className="font-display text-xl text-ink">
              Which invention changed your daily life the most — and did you like it at first?
            </p>
          </div>
          <div className="bg-surface border border-line rounded-card border-t-4 border-t-clay p-6">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-clay">
              Food
            </p>
            <p className="font-display text-xl text-ink">
              Which family dish would you most want to learn before it is forgotten?
            </p>
          </div>
          <div className="bg-surface border border-line rounded-card border-t-4 border-t-clay p-6">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-clay">
              Future
            </p>
            <p className="font-display text-xl text-ink">
              What do you hope is still true about our family in thirty years?
            </p>
          </div>
        </div>
        <p className="mt-10 text-xl text-ink-soft">
          SYNAPSE includes more than 60 questions across 12 themes, with new ones each month.
        </p>
      </div>
    </section>
  );
}