import { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/session";
import { requireSpace, memberName } from "@/lib/spaces";
import { getSpacePlan, getSpaceUsage } from "@/lib/entitlements";
import { BackLink, PremiumLock } from "@/components/app/bits";
import { MemoryForm } from "@/components/app/forms-b";
import { PageHeader, Card } from "@/components/ui";

export const metadata: Metadata = { title: "Add a memory" };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ connectionId: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { connectionId } = await params;
  const sp = await searchParams;
  const user = await requireOnboardedUser();
  const space = await requireSpace(connectionId, user.id);

  const defaultType = (sp.type === "PHOTO" || sp.type === "MOMENT") ? sp.type : "STORY";

  const [plan, usage] = await Promise.all([
    getSpacePlan(space.id),
    getSpaceUsage(space.id),
  ]);

  const full = plan.memoryLimit !== null && usage.memories >= plan.memoryLimit;

  const partnerName = memberName(space.partner);

  return (
    <>
      <BackLink href={`/spaces/${space.id}/memories`}>Back to our scrapbook</BackLink>

      <PageHeader
        eyebrow="Memories"
        title="Add a memory"
        description={
          partnerName
            ? `${partnerName} will see it in your shared scrapbook.`
            : "It will be in your shared scrapbook when your person joins."
        }
      />

      <div className="lg:grid lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-2">
          {full ? (
            <PremiumLock
              message="Your free scrapbook is full (30 memories). Premium keeps every memory."
            />
          ) : (
            <Card className="max-w-2xl">
              <MemoryForm connectionId={space.id} defaultType={defaultType} />
            </Card>
          )}
        </div>

        <aside className="lg:col-span-1 mt-6 lg:mt-0">
          <Card className="h-fit">
            <h2 className="font-display text-lg text-ink mb-3">Not sure what to write?</h2>
            <ul className="space-y-2 text-ink-soft text-base">
              <li className="flex items-start gap-2">
                <span aria-hidden="true">•</span>
                Where were you, and who was there?
              </li>
              <li className="flex items-start gap-2">
                <span aria-hidden="true">•</span>
                What did it smell, sound or taste like?
              </li>
              <li className="flex items-start gap-2">
                <span aria-hidden="true">•</span>
                Why does it still matter to you?
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </>
  );
}
