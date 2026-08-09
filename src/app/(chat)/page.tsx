import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { accounts, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import ChatClient from "./ChatClient";

/**
 * Main chat page — server component that validates auth,
 * then renders the client-side chat interface.
 */
export default async function ChatPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Fetch OAuth provider, preferred name, and user creation date
  let provider: string | null = null;
  let createdAt: string | null = null;
  let preferredName: string | null = null;
  let dateOfBirth: string | null = null;

  if (session.user.id) {
    const [account] = await db
      .select({ provider: accounts.provider })
      .from(accounts)
      .where(eq(accounts.userId, session.user.id))
      .limit(1);
    if (account) {
      provider = account.provider;
    }

    const [userData] = await db
      .select({
        createdAt: users.createdAt,
        preferredName: users.preferredName,
        dateOfBirth: users.dateOfBirth,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    if (userData?.createdAt) {
      createdAt = userData.createdAt.toISOString();
    }
    if (userData?.preferredName) {
      preferredName = userData.preferredName;
    }
    if (userData?.dateOfBirth) {
      dateOfBirth = userData.dateOfBirth;
    }
  }

  return (
    <ChatClient
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        provider,
        createdAt,
        preferredName,
        dateOfBirth,
      }}
    />
  );
}
