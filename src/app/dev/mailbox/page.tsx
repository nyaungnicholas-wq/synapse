import { notFound } from "next/navigation";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { Alert, Card, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dev mailbox",
};

export default async function DevMailbox() {
  if (env.isProd) notFound();

  const emails = await db.emailOutbox.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl mb-6">Development mailbox</h1>
      <Alert tone="info">
        Emails are not sent in development. Everything SYNAPSE would have sent appears here. Set RESEND_API_KEY to send real email.
      </Alert>
      {emails.length === 0 ? (
        <EmptyState
          title="No emails yet"
          action={<p className="text-ink-soft">Emails will appear here when sent in development.</p>}
        />
      ) : (
        <div className="space-y-4">
          {emails.map((email) => (
            <Card key={email.id} className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-ink">To:</span>
                <span className="text-ink-soft">{email.to}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-ink">Subject:</span>
                <span className="font-semibold text-ink-soft">{email.subject}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-ink">Time:</span>
                <span className="text-ink-soft">
                  {new Date(email.createdAt).toLocaleString("en-GB")}
                </span>
              </div>
              <div className="border-t border-line pt-4">
                <p className="whitespace-pre-wrap font-sans text-ink-soft">{email.text}</p>
                {email.text.match(/https?:\/\/[^\s]+/g) && (
                  <div className="mt-4 space-y-2">
                    <span className="font-semibold text-ink">Links in this email:</span>
                    <ul className="list-disc list-inside space-y-1 text-ink-soft">
                      {email.text.match(/https?:\/\/[^\s]+/g)!.map((url, index) => (
                        <li key={index}>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
