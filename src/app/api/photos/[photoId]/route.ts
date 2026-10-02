import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Photos are private: served only to members of the Connection Space they belong to.
export async function GET(_req: Request, { params }: { params: Promise<{ photoId: string }> }) {
  const { photoId } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("Not found", { status: 404 });
  const photo = await db.photo.findFirst({
    where: { id: photoId.slice(0, 40), connection: { members: { some: { userId: user.id } } } },
  });
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.mimeType,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
