import { prisma } from "../lib/prisma";

export async function upsertGuildConfig(guildId: string) {
  return prisma.guildConfig.upsert({
    where: { guildId },
    create: { guildId },
    update: {},
  });
}

export async function getGuildConfig(guildId: string) {
  return prisma.guildConfig.findUnique({ where: { guildId } });
}

export async function setPickBanResultsChannel(guildId: string, pickBanResultsChannelId: string) {
  return prisma.guildConfig.update({
    where: { guildId },
    data: { pickBanResultsChannelId },
  });
}
