import { Lock } from "lucide-react";
import { ButtonLink } from "@/components/ui";

export const metadata = {
  title: "Not allowed",
};

export default function Unauthorized() {
  return (
    <main id="main" className="min-h-dvh grid place-items-center px-4">
      <div className="max-w-lg text-center">
        <Lock className="mx-auto size-16 rounded-full bg-sand" aria-hidden="true" />
        <h1 className="font-display text-4xl mt-6">
          You don't have access to this page
        </h1>
        <p className="text-ink-soft mt-4">
          This area is only for the SYNAPSE team. If you think this is a mistake, please contact your program coordinator.
        </p>
        <ButtonLink href="/dashboard">Go to my space</ButtonLink>
      </div>
    </main>
  );
}
