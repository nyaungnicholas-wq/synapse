import { features, env } from "@/lib/env";
import { handleStripeEvent, stripe } from "@/lib/billing";

// Stripe -> SYNAPSE subscription sync. The signature check is what makes this endpoint safe to expose.
export async function POST(req: Request) {
  if (!features.stripe || !env.stripe.webhookSecret) return new Response("Billing not configured", { status: 404 });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  const body = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, env.stripe.webhookSecret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  try {
    await handleStripeEvent(event);
  } catch (err) {
    console.error("stripe webhook failed", event.type, err);
    return new Response("Handler error", { status: 500 }); // Stripe retries
  }
  return Response.json({ received: true });
}
