import { sign } from "tweetnacl"

import { InteractionCallbackTypes, InteractionTypes, MessageFlags, ApplicationCommandTypes, ApplicationCommandOptionTypes } from "./types"

const BASE_URL = "https://discord.com/api/v10"
const CLIENT_AUTHORIZATION = Buffer.from( CLIENT_ID + ":" + CLIENT_SECRET ).toString( "base64" )
const SCRIPT_AUTHORIZATION = Buffer.from( AUTHORIZATION_USER + ":" + AUTHORIZATION_PASSWORD ).toString( "base64" )

// TODO: Move this to a seperate script
const getCommandOptions = ( interactionOptions ) => {
	const commandOptions = new Map()

	interactionOptions.forEach( option => commandOptions.set( option[ "name" ], {
		type: option[ "type" ],
		value: option[ "value" ]
	} ) )

	return commandOptions
}

export const requestRoutes = new Map()
requestRoutes.set( "GET", new Map() )
requestRoutes.set( "POST", new Map() )

export const createRoute = ( method, path, executor ) => {
	requestRoutes.get( method ).set( path, executor )
}

requestRoutes.get( "GET" ).set( "/authorize", async () => new Response( null, {
	status: 307,
	headers: {
		"Location": BASE_URL + "/oauth2/authorize?" + new URLSearchParams( {
			"client_id": CLIENT_ID,
			"scope": "applications.commands"
		} ).toString()
	}
} ) )

requestRoutes.get( "GET" ).set( "/update", async ( request ) => {
	if ( request.headers.get( "authorization", "" ) !== "Basic " + SCRIPT_AUTHORIZATION ) return new Response( null, {
		status: 401,
		headers: {
			"www-authenticate": "Basic realm=\"viral32111's hentai bot\""
		}
	} )

	const credentialsGrant = await fetch( BASE_URL + "/oauth2/token", {
		method: "POST",
		headers: {
			"Authorization": "Basic " + CLIENT_AUTHORIZATION,
			"Content-Type": "application/x-www-form-urlencoded"
		},
		body: new URLSearchParams( {
			"grant_type": "client_credentials",
			"scope": "applications.commands.update applications.commands.permissions.update"
		} )
	} )

	if ( !credentialsGrant.ok ) return new Response( await credentialsGrant.text(), {
		status: 500,
		headers: { "Content-Type": "application/json" }
	} )

	const clientCredentials = await credentialsGrant.json()

	// TODO: Store credentials grant token and expiry date in KV

	/*
	https://rule34.xxx/index.php?page=help&topic=dapi#
	https://e621.net/help/api
	https://yande.re/help/api
	https://hypnohub.net/index.php?page=help&topic=dapi#
	https://furry.booru.org/index.php?page=help&topic=dapi
	https://danbooru.donmai.us/wiki_pages/help:api
	https://gelbooru.com/index.php?page=wiki&s=view&id=18780
	https://xbooru.com/index.php?page=help&topic=dapi
	*/

	const commandUpdate = await fetch( BASE_URL + "/applications/" + CLIENT_ID + "/commands", {
		method: "PUT",
		headers: {
			"Authorization": clientCredentials[ "token_type" ] + " " + clientCredentials[ "access_token" ],
			"Content-Type": "application/json"
		},
		body: JSON.stringify( [ {
			"type": ApplicationCommandTypes.ChatInput,
			"name": "hentai",
			"description": "Search various 18+ image boards.",
			"options": [
				{
					"type": ApplicationCommandOptionTypes.SubCommand,
					"name": "help",
					"description": "Information about this bot, and usage for the /hentai command.",
				},
				{
					"type": ApplicationCommandOptionTypes.SubCommand,
					"name": "search",
					"description": "Search various 18+ image boards.",
					"nsfw": true,
					"dm_permission": true,
					"options": [
						{
							"type": ApplicationCommandOptionTypes.String,
							"name": "site",
							"description": "Where do you want to search?",
							"required": true,
							"autocomplete": false,
							"choices": [
								{ "name": "Rule 34", "value": "rule34.xxx" },
								// { "name": "e621", "value": "e621.net" },
								// { "name": "yande.re", "value": "yande.re" },
								// { "name": "HypnoHub", "value": "hypnohub.net" },
								// { "name": "FurryBooru", "value": "furry.booru.org" },
								// { "name": "Danbooru", "value": "danbooru.donmai.us" },
								// { "name": "Gelbooru", "value": "gelbooru.com" },
								// { "name": "Xbooru", "value": "xbooru.com" }
							]
						},
						{
							"type": ApplicationCommandOptionTypes.String,
							"name": "tags",
							"description": "What do you want to search? Multiple tags should be separated by commas.",
							"required": true,
							"autocomplete": true
						},
						{
							"type": ApplicationCommandOptionTypes.Boolean,
							"name": "hidden",
							"description": "Only show the results to yourself? Default is no (show to everyone).",
							"required": false,
						}
					]
				}
			] }
		] )
	} )

	return new Response( await commandUpdate.text(), {
		status: ( commandUpdate.ok ? 200 : 500 ),
		headers: { "Content-Type": "application/json" }
	} )
} )

// Converts a hexadecimal-encoded string into an array of bytes
const decodeHexadecimal = ( hexadecimal ) => {
	return Uint8Array.from( hexadecimal.match( /.{2}/g ).map( hex => parseInt( hex, 16 ) ) )
}

// Verifies the authenticity of an interaction request signature
const validateSignature = async ( request, publicKey ) => {

	// Get the hex-encoded signature and timestamp from the request headers
	const signatureHeader = request.headers.get( "x-signature-ed25519" )
	const timestampHeader = request.headers.get( "x-signature-timestamp" )

	// Return null if those headers are not set
	if ( !signatureHeader || !timestampHeader ) return null;

	// Convert the entire raw request body into an array of bytes
	const rawRequestBody = new Uint8Array( await request.arrayBuffer() )

	// Convert the timestamp header into an array of bytes
	const signatureTimestamp = new TextEncoder().encode( timestampHeader )

	// Concatenate the timestamp header and request body byte arrays
	const signatureMessage = new Uint8Array( signatureTimestamp.byteLength + rawRequestBody.byteLength )
	signatureMessage.set( signatureTimestamp, 0 )
	signatureMessage.set( rawRequestBody, signatureTimestamp.byteLength )

	// Verify the request body against the request signature using the provided public key
	return sign.detached.verify( signatureMessage, decodeHexadecimal( signatureHeader ), decodeHexadecimal( publicKey ) )

}

requestRoutes.get( "POST" ).set( "/interactions", async ( request, event ) => {
	if ( !request.headers.get( "user-agent", "" ).includes( "Discord-Interactions" ) ) return new Response( null, { status: 403 } )

	const isSignatureValid = await validateSignature( await request.clone(), CLIENT_PUBLIC_KEY )
	if ( !isSignatureValid ) return new Response( null, { status: 401 } )

	const interaction = await request.json()

	if ( interaction[ "type" ] === InteractionTypes.Ping ) return new Response( JSON.stringify( {
		"type": InteractionCallbackTypes.Pong
	} ), {
		status: 200,
		headers: { "Content-Type": "application/json" }
	} )

	if ( interaction[ "type" ] === InteractionTypes.ApplicationCommand && interaction[ "data" ][ "name" ] === "hentai" ) {
		const subCommand = interaction[ "data" ][ "options" ][ 0 ][ "name" ]

		if ( subCommand === "help" ) return new Response( JSON.stringify( {
			"type": InteractionCallbackTypes.ChannelMessageWithSource,
			"data": {
				"flags": MessageFlags.Ephemeral,
				"content": "`// TODO: Write something useful here.`",
				"allowed_mentions": { "parse": [] }
			}
		} ), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		} )

		if ( subCommand === "search" ) {
			//const isDirectMessage = ( "guild_id" in interaction )
			//const isChannelNSFW = interaction[ "channel_id" ]...

			const commandOptions = getCommandOptions( interaction[ "data" ][ "options" ][ 0 ][ "options" ] )

			if ( commandOptions.get( "site" ).value === "rule34.xxx" ) {

				event.waitUntil( new Promise( async ( resolve ) => {
					const postsResponse = await fetch( "https://api.rule34.xxx/index.php?" + new URLSearchParams( {
						"page": "dapi",
						"s": "post",
						"q": "index",
						"tags": commandOptions.get( "tags" ).value.replace( ",", " " ),
						"pid": 0,
						"json": 1
					} ).toString(), {
						method: "GET",
						headers: {
							"Accept": "application/json, */*"
						}
					} )

					if ( !postsResponse.ok ) return new Response( await postsResponse.text(), {
						status: 500,
						headers: { "Content-Type": "text/plain" }
					} )

					const posts = await postsResponse.json()

					const topPost = posts.reduce( ( previousPost, currentPost ) => currentPost[ "score" ] > previousPost[ "score" ] ? currentPost : previousPost, posts[ 0 ] )
					console.log( topPost )

					const editMessageResponse = await fetch( BASE_URL + "/webhooks/" + CLIENT_ID + "/" + interaction[ "token" ] + "/messages/@original", {
						method: "PATCH",
						headers: {
							"Content-Type": "application/json"
						},
						body: JSON.stringify( {
							"embeds": [ {
								"title": "Score: " + topPost[ "score" ] + " (" + topPost[ "rating" ].replace( /^\w/, character => character.toUpperCase() ) + ")", //, by " + topPost[ "owner" ],
								"description": ( topPost[ "tags" ].length > 200 ? topPost[ "tags" ].substring( 0, 200 - 3 ) + "..." : topPost[ "tags" ] ),
								"url": "https://rule34.xxx/index.php?page=post&s=view&id=" + topPost[ "id" ],
								"author": {
									"name": "Rule 34",
									"url": "https://rule34.xxx",
									"icon_url": "https://rule34.xxx/apple-touch-icon-precomposed.png"
								},
								"image": {
									"url": topPost[ "file_url" ]
								},
								"footer": {
									"text": topPost[ "width" ] + "x" + topPost[ "height" ] + "px"
								},
								"timestamp": new Date( topPost[ "change" ] * 1000 ).toISOString(),
								"color": 0xAAE5A4
							} ],
							"components": [
								{
									"type": 1,
									"components": [
										{
											"type": 2,
											"label": "<-",
											"custom_id": "previous",
											"style": 1,
										},
										{
											"type": 2,
											"label": "->",
											"custom_id": "next",
											"style": 1,
										},
										{
											"type": 2,
											"label": "Random",
											"custom_id": "random",
											"style": 2,
										},
										{
											"type": 2,
											"label": "X",
											"custom_id": "delete",
											"style": 4,
										}
									]
								}
							],
							"allowed_mentions": { "parse": [] }
						} )
					} )

					console.log( editMessageResponse.status, ( await editMessageResponse.json() ) )

					resolve()
				} ) )

				return new Response( JSON.stringify( {
					"type": InteractionCallbackTypes.DeferredChannelMessageWithSource,
					/*"data": {
						"flags": ( ( commandOptions.get( "hidden" ) && commandOptions.get( "hidden" ).value ) ? MessageFlags.Ephemeral : 0 ),
					}*/
				} ), {
					status: 200,
					headers: { "Content-Type": "application/json" }
				} )

			} else {
				return new Response( JSON.stringify( {
					"type": InteractionCallbackTypes.DeferredChannelMessageWithSource
				} ), {
					status: 200,
					headers: { "Content-Type": "application/json" }
				} )
			}
		}

	} else if ( interaction[ "type" ] === InteractionTypes.ApplicationCommandAutocomplete ) {
		const commandOptions = getCommandOptions( interaction[ "data" ][ "options" ][ 0 ][ "options" ] )

		// Not checking what option is focused because tags is the only autocomplete-able option

		if ( commandOptions.get( "site" ).value === "rule34.xxx" ) {
			const tagsOption = commandOptions.get( "tags" ).value
			const currentTags = ( tagsOption === "" ? [] : tagsOption.split( "," ) )

			const autoCompleteResponse = await fetch( "https://rule34.xxx/autocomplete.php?" + new URLSearchParams( {
				"q": ( tagsOption.endsWith( "," ) || currentTags.length === 0 ? "" : currentTags[ currentTags.length - 1 ] ),
			} ).toString(), {
				method: "GET",
				headers: {
					"Accept": "application/json, */*"
				}
			} )

			if ( !autoCompleteResponse.ok ) return new Response( await autoCompleteResponse.text(), {
				status: 500,
				headers: { "Content-Type": "text/plain" }
			} )

			const autoCompleteTags = await autoCompleteResponse.json()

			const autoCompletionChoices = []
			autoCompleteTags.forEach( tag => {
				// TODO: Do not insert duplicates

				const label = tag[ "label" ].match( /^(.+) \((\d+)\)$/ )
				const name = label[ 1 ].replace( /\\/g, "" ) // " (" + parseInt( label[ 2 ] ).toLocaleString( "en-GB" ) + " posts)"

				if ( currentTags.length > 1 ) {
					const previousTags = currentTags.slice( 0, currentTags.length - 1 )
					
					autoCompletionChoices.push( {
						"name": previousTags.join( "," ) + "," + name,
						"value": previousTags.join( " " ) + " " + tag[ "value" ],
					} )
				} else {
					autoCompletionChoices.push( {
						"name": name,
						"value": tag[ "value" ],
					} )
				}
			} )
		
			return new Response( JSON.stringify( {
				"type": InteractionCallbackTypes.ApplicationCommandAutocompleteResult,
				"data": {
					"choices": autoCompletionChoices
				}
			} ), {
				status: 200,
				headers: { "Content-Type": "application/json" }
			} )
		}

		// Empty autocomplete response
		return new Response( JSON.stringify( {
			"type": InteractionCallbackTypes.ApplicationCommandAutocompleteResult,
			"data": {
				"choices": []
			}
		} ), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		} )
	}
} )
