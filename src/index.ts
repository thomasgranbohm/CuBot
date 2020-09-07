import { DISCORD_TOKEN, OWNER, PREFIX } from "./config.bot";
import { Client, Collection, Message } from "discord.js";
import { Command } from "./classes/command";
import { BotOptions, LavalinkConfig, ServerObject } from "./types";
import * as commands from "./commands";
import { ArgumentError, OwnerError, PermissionError } from "./errors";
import { Manager } from "@lavacord/discord.js";
import sendMessage from "./utils/sendMessage";

export class Bot extends Client {
	public owner: string;
	public prefix: string;

	public manager: Manager;

	public servers: Collection<String, ServerObject>;
	public commands: Collection<String, Command>;

	constructor(token: string, { owner, prefix, ...clientOptions }: BotOptions) {
		super({ ...clientOptions });

		this.owner = owner;
		this.prefix = prefix;

		this.commands = new Collection<String, Command>();
		this.servers = new Collection<String, ServerObject>();

		this.manager = new Manager(this, LavalinkConfig.nodes, {
			user: this.user?.id,
			shards: (this.shard && this.shard.count) || 1
		});

		this.on('ready', this.onReady)
		this.on('message', this.onMessage)

		this.user?.setActivity

		this.login(token).then(() => console.log(`Ready at ${new Date().toString().substr(16, 8)}`));
	}

	loadCommands(): void {

		const entries = Object.entries(commands);
		for (let [name, command] of entries) {
			this.commands.set(name.toLowerCase(), new command(this));
		}
	}

	async onReady() {
		await this.manager.connect();
		this.user?.setActivity({ name: `at ${new Date().toString().substr(16, 8)}` })

		this.loadCommands();
	}

	async onMessage(message: Message): Promise<void> {
		const { content, channel, author } = message;

		const isBot = author.bot;
		if (isBot) return;

		const hasPrefix = content.startsWith(this.prefix);
		if (!hasPrefix) return console.warn("Has no prefix");

		const [name, ...args] = content.substr(1).split(" ");

		const command = this.commands.get(name);
		if (!command) return;

		let returningMessage = undefined;

		console.warn("Found command", command.names.slice().shift())

		try {
			if (command.needsArgs && args.length === 0)
				throw new ArgumentError(command);
			if (command.ownerOnly && author.id !== this.owner)
				throw new OwnerError();
			if (command.guildOnly && channel.type !== "text")
				throw new PermissionError()

			returningMessage = await command.run(message, args)
		} catch (err) {
			returningMessage = err;
		}

		if (!returningMessage) return;

		sendMessage(channel, returningMessage, command.group, author);
	}
}

new Bot(DISCORD_TOKEN, { owner: OWNER, prefix: PREFIX });