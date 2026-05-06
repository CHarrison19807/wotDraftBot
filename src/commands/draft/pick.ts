import { MessageFlags } from "discord.js";
import { buildPlayerCardConfirmButton } from "../../components/buildDraftButtons";
import { buildPlayerCard } from "../../components/buildPlayerCard";
import { getActiveDraftSession } from "../../db/draftSession";
import { getCurrentTeamIndex, isDraftPickable } from "../../lib/draft/getDraftTurn";
import type { GuildChatInputCommandInteraction } from "../../types";

export async function executePick(interaction: GuildChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const session = await getActiveDraftSession(interaction.guild.id);
  if (!session) {
    await interaction.editReply("No active draft session.");
    return;
  }
  if (!isDraftPickable(session)) {
    await interaction.editReply("The draft hasn't started yet or has already ended.");
    return;
  }

  const currentTeamIndex = getCurrentTeamIndex(session.currentPickIndex, session.numTeams, session.draftType);
  const currentTeam = session.teams[currentTeamIndex];

  if (!currentTeam) {
    await interaction.editReply("Could not determine the current team.");
    return;
  }

  if (interaction.user.id !== currentTeam.captainId) {
    await interaction.editReply(`Unable to pick. Waiting on <@${currentTeam.captainId}> to make their pick.`);
    return;
  }
  const pickedUser = interaction.options.getUser("player", true);
  const draftPlayer = session.players.find((player) => player.discordUserId === pickedUser.id);

  if (!draftPlayer) {
    await interaction.editReply(`**${pickedUser.username}** is not in the draft pool.`);
    return;
  }

  if (draftPlayer.teamId) {
    await interaction.editReply(`**${pickedUser.username}** has already been drafted.`);
    return;
  }

  await interaction.editReply({
    content: `Draft **${draftPlayer.discordUsername}** for **${currentTeam.name}**?`,
    embeds: [buildPlayerCard(draftPlayer, null)],
    components: [buildPlayerCardConfirmButton(session.id, draftPlayer)],
  });
}
