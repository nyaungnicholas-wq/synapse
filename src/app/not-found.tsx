import { Compass } from "lucide-react";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <div className="max-w-lg text-center">
        <Compass className="mx-auto size-16 rounded-full bg-sand" aria-hidden="true" />
        <h1 className="font-display text-4xl mt-6">
          We couldn't find that page
        </h1>
        <p className="text-ink-soft mt-4">
          The link may be old, or the page may belong to a Connection Space you are not part of.
        </p>
        <div className="flex flex-col gap-3 mt-8 sm:flex-row sm:justify-center">
          <ButtonLink href="/dashboard">Go to my space</ButtonLink>
          <ButtonLink variant="secondary" href="/">
            SYNAPSE home
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
