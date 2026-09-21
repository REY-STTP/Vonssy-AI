import { db } from "@/lib/db/client";
import { accounts, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface ChatUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  provider?: string | null;
  createdAt?: string | null;
  preferredName?: string | null;
  dateOfBirth?: string | null;
  avatarSource?: string | null;
  avatarStyle?: string | null;
  avatarSeed?: string | null;
  shareProfileWithAi?: boolean | null;
}

/**
 * Shared loader for the chat pages ((chat)/page.tsx and
 * (chat)/chat/[id]/page.tsx): OAuth provider, profile fields, and
 * avatar settings for the ChatClient `user` prop.
 */
export async function getChatUser(
  userId: string,
  sessionUser: { name?: string | null; email?: string | null; image?: string | null }
): Promise<ChatUser> {
  const [account] = await db
    .select({ provider: accounts.provider })
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);

  const [userData] = await db
    .select({
      createdAt: users.createdAt,
      preferredName: users.preferredName,
      dateOfBirth: users.dateOfBirth,
      avatarSource: users.avatarSource,
      avatarStyle: users.avatarStyle,
      avatarSeed: users.avatarSeed,
      shareProfileWithAi: users.shareProfileWithAi,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return {
    name: sessionUser.name,
    email: sessionUser.email,
    image: sessionUser.image,
    provider: account?.provider ?? null,
    createdAt: userData?.createdAt ? userData.createdAt.toISOString() : null,
    preferredName: userData?.preferredName ?? null,
    dateOfBirth: userData?.dateOfBirth ?? null,
    avatarSource: userData?.avatarSource ?? "oauth",
    avatarStyle: userData?.avatarStyle ?? null,
    avatarSeed: userData?.avatarSeed ?? null,
    shareProfileWithAi: userData?.shareProfileWithAi ?? false,
  };
}
