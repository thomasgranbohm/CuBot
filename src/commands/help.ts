import { Command } from "../classes/command";
import { Bot } from "../index";
import { Message, MessageEmbed } from "discord.js";
import { Categories } from "../types";

export class Help extends Command {

	constructor(client: Bot) {
		super(client, {
			aliases: ["h"],
			description: "Gets help",
			group: Categories.MISC,
			examples: ["<command>"]
		})
	}

	async run(message: Message, args?: string[] | undefined): Promise<string | MessageEmbed | null> {
		const wanted = args?.shift();
		if (wanted) {
			const command = this.client.commands.get(wanted);
			if (command)
				return command.help(true);

			return null;
		}

		let helpCommand = this.client.commands.get("help");
		if (!helpCommand) return null;

		let helpEmbed: MessageEmbed | string = helpCommand.help(true);
		if (typeof helpEmbed !== "string")
			return helpEmbed
				.setTitle('List of all commands:')
				.setDescription(
					this.client.commands
						.map((command) => command.help())
						.join("\n")
						.concat("\n\n", helpEmbed.description || "")
				);

		return null;
	}

}