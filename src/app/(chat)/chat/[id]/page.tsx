import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { chatSessions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { isUuid } from "@/lib/validate-uuid";
import { getChatUser } from "@/lib/chat-user";
import ChatClient from "../../ChatClient";

interface ChatSessionPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Per-session chat URL (/chat/[id]).
 *
 * The session is validated server-side (format + ownership) before any
 * render: unknown or foreign ids render the custom 404 — never
 * differentiated (same convention as the API routes).
 */
export async function generateMetadata({ params }: ChatSessionPageProps) {
  const session = await auth();
  if (!session?.user?.id) return { title: "Chat" };
  const { id } = await params;
  if (!isUuid(id)) return { title: "Chat" };
  const [row] = await db
    .select({ title: chatSessions.title })
    .from(chatSessions)
    .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, session.user.id)))
    .limit(1);
  return { title: row?.title ?? "Chat" };
}

export default async function ChatSessionPage({ params }: ChatSessionPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }

  const [row] = await db
    .select({ id: chatSessions.id })
    .from(chatSessions)
    .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, session.user.id)))
    .limit(1);
  if (!row) {
    notFound();
  }

  const user = await getChatUser(session.user.id, session.user);

  return <ChatClient user={user} initialSessionId={id} />;
}
