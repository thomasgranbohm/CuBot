import { Message, MessageEmbed } from "discord.js";
import { Bot } from "src";
import { format } from "util";
import { Categories } from "./config";
import { CommandOptions, MainCommandOptions, SubCommandOptions, TrackObject } from "./types";
import { getThumbnail } from "./utils";

export abstract class Command {
	names: string[];
	description: string;
	examples: string[];
	needsArgs: boolean;

	protected client: Bot;

	constructor(client: Bot, options: CommandOptions) {
		this.client = client;

		this.names = [this.constructor.name.toLowerCase()].concat(options.aliases || []);
		this.description = options.description;
		this.examples = options.examples || [];
		this.needsArgs = options.needsArgs || false;
	}

	/**
	 * @param message The message sent by the user
	 * @param args Optional arguments
	 */
	abstract async run(message: Message, args?: string[]): Promise<string | MessageEmbed>

	protected getName = () => this.names.slice().shift();
}

export abstract class MainCommand extends Command {
	group: Categories;
	ownerOnly: boolean;
	guildOnly: boolean;
	subCommands: Map<string, SubCommand>;

	constructor(client: Bot, options: MainCommandOptions) {
		super(client, options)

		this.group = options.group;
		this.guildOnly = options.guildOnly || false;
		this.ownerOnly = options.ownerOnly || false;

		if (!!options.subCommands) {
			this.loadSubCommands(options.subCommands);
		}
	}

	getExamples(prefix: string): Array<string> {
		const baseString = `${prefix}${this.getName()}`;
		const examples = [
			baseString,
			...this.examples
				.slice(0, 3)
				.map(example => `\`${prefix}${this.getName()} ${example}\``),

		];
		if (!!this.subCommands) {
			examples.push(...this.getSubExamples(baseString))
		}
		return examples.map(example => `\`${example}\``);
	}

	protected getSubExamples(commandString: string): Array<string> {
		const examples = [];
		const entries = this.subCommands.entries();
		// TODO what if command needs args?
		for (const [name, command] of entries) {
			const baseString = `${commandString} ${name}`;
			examples.push(
				baseString,
				...command.examples.slice(0, 3)
					.map(example => `${baseString} ${example}`)
			);
		}
		return examples;
	}

	private loadSubCommands(subCommands: Object) {
		this.subCommands = new Map<string, SubCommand>();
		const entries = Object.entries(subCommands);
		for (const [name, TempSubCommand] of entries) {
			this.subCommands.set(
				name.toLowerCase(),
				new TempSubCommand(this.client, this)
			);
		}
	}

	async handleSubCommand(
		message: Message,
		args: string[]
	): Promise<string | MessageEmbed | undefined> {
		if (this.subCommands.size === 0 ||
			args.length === 0)
			return undefined;

		const [subname, ...rest] = args;

		const subCommand = this.subCommands.get(subname.toLowerCase());
		if (!subCommand) return undefined;

		return await subCommand.run(message, rest);
	}

	help(prefix: string, extended: boolean = false): string | MessageEmbed {
		if (extended) {
			let embed = new MessageEmbed()
				.setTitle(`Detailed information about ${this.getName()}`)
				.addField("Description", this.description)

			let caveats = [];
			if (this.needsArgs)
				caveats.push("need arguments");
			if (this.guildOnly)
				caveats.push("can only be used in guilds");
			if (this.ownerOnly)
				caveats.push("is owner only");
			caveats = caveats.map(c => (`**${c}**`));

			if (caveats.length > 0) {
				embed.addField(
					"Caveats",
					format(
						"This command %s %s.",
						caveats.length > 1 ? caveats.slice(0, caveats.length - 1).join(", ") + " and " : "",
						caveats[caveats.length - 1]
					)
				);
			}
			if (this.examples.length > 0 || this.subCommands.size > 0) {
				embed.addField(
					"Usage",
					this.getExamples(prefix).join("\n"),
					true
				)
			}
			if (this.names.length > 1) {
				embed.addField("Aliases", `\`${this.names.slice(1).join(", ")}\``, true)
			}
			return embed;
		}

		return `**${this.getName()}** – ${this.description}`;
	}

	usage(prefix: string): string {
		let string = prefix + this.getName();
		if (this.needsArgs && this.examples.length > 0)
			string += ` ${this.examples.pop()}`;
		return string;
	}
}

export abstract class SubCommand extends Command {
	parentCommand: MainCommand;

	protected client: Bot;

	constructor(client: Bot, parentCommand: MainCommand, options: SubCommandOptions) {
		super(client, options);

		this.parentCommand = parentCommand;
	}
}

export class TrackEmbed extends MessageEmbed {
	track: TrackObject;
	constructor(track: TrackObject) {
		super();
		this.track = track;
	}

	async getThumbnail(): Promise<TrackEmbed> {
		if (!this.track.thumbnail) {
			this.track.thumbnail = await getThumbnail(this.track);
		}
		if (this.track.thumbnail)
			this
				.attachFiles([
					{ attachment: this.track.thumbnail, name: `thumbnail.jpg` },
				])
				.setThumbnail(`attachment://thumbnail.jpg`);
		return this;
	}
}
