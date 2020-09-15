import { Message, MessageEmbed } from "discord.js";
import { Bot } from "src";
import * as errors from "../errors"

export default async function (client: Bot, error: Error, message: Message) {
	let { author, content, guild, channel } = message;

	let embed = new MessageEmbed()
		.setColor('RED');
	if (error instanceof errors.UnexpectedError) {
		if (process.env.NODE_ENV === 'production') {
			let developer = await client.users.fetch(client.owner);
			const DMChannel = await developer.createDM();
			DMChannel.send(
				new MessageEmbed()
					.setTitle('Ran into some problems chief')
					.setDescription(`**${author.tag}** tried to run \`${content}\` in ${guild?.name}.`)
					.addField("Developer message:", error.developerMessage)
					.addField("Stack trace:", `\`\`\`${error.stack}\`\`\``)
					.setColor('RED')
					.setTimestamp()
			);
		}
		embed.setTitle(error.name)
			.setDescription(error.message);
	} else {
		embed
			.setTitle(error.message);
	}
	let sentMessage = await channel.send(embed);

	sentMessage.delete({
		timeout: 10000
	})
}