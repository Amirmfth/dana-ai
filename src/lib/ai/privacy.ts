import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

export type PrivacySettings = {
  storeAiPayloads: boolean;
  retentionDays: number;
  useLearnerMemory: boolean;
};

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  storeAiPayloads: false,
  retentionDays: 30,
  useLearnerMemory: true,
};

export async function getPrivacySettings(userId: string) {
  return (
    (await prisma.userPrivacySettings.findUnique({
      where: { userId },
      select: {
        storeAiPayloads: true,
        retentionDays: true,
        useLearnerMemory: true,
      },
    })) ?? DEFAULT_PRIVACY_SETTINGS
  );
}

export function aiPayloadForStorage<T>(
  value: T,
  settings: Pick<PrivacySettings, "storeAiPayloads">,
): T | null {
  return settings.storeAiPayloads ? value : null;
}

export async function purgeExpiredAiPayloads(userId: string) {
  const settings = await getPrivacySettings(userId);

  const cutoff = new Date(
    Date.now() - settings.retentionDays * 24 * 60 * 60 * 1000,
  );

  await prisma.aiUsage.updateMany({
    where: settings.storeAiPayloads
      ? { userId, createdAt: { lt: cutoff } }
      : { userId },
    data: {
      input: Prisma.DbNull,
      output: null,
    },
  });

  return settings;
}
