import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getChatUser } from "@/lib/chat-user";
import ChatClient from "./ChatClient";

/**
 * New chat page (/) — server component that validates auth,
 * then renders the client-side chat interface with no active session.
 * Per-session URLs live under /chat/[id].
 */
export default async function ChatPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await getChatUser(session.user.id, session.user);

  return <ChatClient user={user} initialSessionId={null} />;
}
