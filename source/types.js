export const MessageFlags = {
	SuppressEmbeds: 1 << 2,
	Ephemeral: 1 << 6
}

export const ApplicationCommandTypes = {
	ChatInput: 1,
	User: 2,
	Message: 3
}

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
	Double: 10,
	Attachment: 11
}

export const ApplicationCommandPermissionTypes = {
	Role: 1,
	User: 2
}

export const InteractionTypes = {
	Ping: 1,
	ApplicationCommand: 2,
	MessageComponent: 3,
	ApplicationCommandAutocomplete: 4,
	ModalSubmit: 5
}

export const InteractionCallbackTypes = {
	Pong: 1,
	ChannelMessageWithSource: 4,
	DeferredChannelMessageWithSource: 5,
	DeferredUpdateMessage: 6,
	UpdateMessage: 7,
	ApplicationCommandAutocompleteResult: 8,
	Modal: 9
}
