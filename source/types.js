// This should not contain all enumerations, only the ones that are used.

// https://discord.com/developers/docs/resources/channel#message-object-message-flags
export const MessageFlags = {
	Ephemeral: 1 << 6
}

// https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-types
export const ApplicationCommandTypes = {
	ChatInput: 1
}

// https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
export const ApplicationCommandOptionTypes = {
	SubCommand: 1,
	SubCommandGroup: 2,
	String: 3,
	Integer: 4,
	Boolean: 5,
	User: 6,
	Channel: 7,
	Role: 8,
	Mentionable: 9,
	Number: 10,
	Attachment: 11
}

// https://discord.com/developers/docs/interactions/application-commands#application-command-permissions-object-application-command-permission-type
export const ApplicationCommandPermissionTypes = {
	Role: 1,
	User: 2,
	Channel: 3
}

// https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-object-interaction-type
export const InteractionTypes = {
	Ping: 1,
	ApplicationCommand: 2,
	MessageComponent: 3,
	ApplicationCommandAutocomplete: 4
}

// https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-response-object-interaction-callback-type
export const InteractionCallbackTypes = {
	Pong: 1,
	ChannelMessageWithSource: 4,
	DeferredChannelMessageWithSource: 5,
	DeferredUpdateMessage: 6,
	UpdateMessage: 7,
	ApplicationCommandAutocompleteResult: 8,
	Modal: 9
}
