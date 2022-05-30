/*
Copyright (C) 2022 viral32111 (https://viral32111.com).

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see https://www.gnu.org/licenses/.
*/

// Import required enumerations
import { InteractionCallbackTypes, InteractionTypes, MessageFlags, ApplicationCommandTypes, ApplicationCommandOptionTypes } from "./enums"

// Import required helper functions
import { convertCommandOptions, validateSignature, fetchGelbooruPosts, escapeMarkdown } from "./helpers"

// The full URL to the Discord API
const BASE_URL = "https://discord.com/api/v10"

// Create a map for registering request routes for certain methods
export const requestRoutes = new Map( [
	[ "GET", new Map() ],
	[ "POST", new Map() ]
] )

// Create a route for redirecting users to the authorization (invite) page for this bot...
requestRoutes.get( "GET" ).set( "/authorize", async () => new Response( null, {
	status: 308,
	headers: {
		"location": BASE_URL + "/oauth2/authorize?" + new URLSearchParams( {
			"client_id": CLIENT_ID,
			"scope": "applications.commands"
		} ).toString()
	}
} ) )

// Create a route for updating the application commands...
requestRoutes.get( "GET" ).set( "/update", async ( request ) => {

	// Do not continue if the user has not provided valid credentials
	if ( request.headers.get( "authorization" ) !== "Basic " + btoa( AUTHORIZATION_USER + ":" + AUTHORIZATION_PASSWORD ) ) return new Response( null, {
		status: 401,
		headers: { "www-authenticate": "Basic" }
	} )

	// Send an API request to grant client credentials for authentication in the update request
	const clientCredentialsResponse = await fetch( BASE_URL + "/oauth2/token", {
		method: "POST",
		headers: {
			"Authorization": "Basic " + btoa( CLIENT_ID + ":" + CLIENT_SECRET ),
			"content-type": "application/x-www-form-urlencoded"
		},
		body: new URLSearchParams( {
			"grant_type": "client_credentials",
			"scope": "applications.commands.update applications.commands.permissions.update"
		} )
	} )

	// Respond with internal server error and the response body if anything went wrong
	if ( !clientCredentialsResponse.ok ) return new Response( await clientCredentialsResponse.text(), {
		status: 500,
		headers: { "content-type": "text/plain" }
	} )

	// Parse the response body as JSON
	const clientCredentials = await clientCredentialsResponse.json()

	// TODO: Store client credentials token and expiry date in KV

	// Send an API request to bulk update the application commands using the client credentials
	const updateCommandsResponse = await fetch( BASE_URL + "/applications/" + CLIENT_ID + "/commands", {
		method: "PUT",
		headers: {
			"Authorization": clientCredentials[ "token_type" ] + " " + clientCredentials[ "access_token" ],
			"content-type": "application/json"
		},
		body: JSON.stringify( [ {
			"type": ApplicationCommandTypes.ChatInput,
			"name": "hentai",
			"description": "Search and browse popular anime 18+ image boards.",
			"options": [
				{
					"type": ApplicationCommandOptionTypes.SubCommand,
					"name": "help",
					"description": "Information about, and a guide on how to use this bot.",
				},
				{
					"type": ApplicationCommandOptionTypes.SubCommand,
					"name": "search",
					"description": "Search and browse popular anime 18+ image boards.",
					//"nsfw": true,
					"dm_permission": true,
					"options": [
						{
							"type": ApplicationCommandOptionTypes.String,
							"name": "board",
							"description": "What board would you like to search?",
							"required": true,
							"autocomplete": false,
							"choices": [
								{ "name": "Rule 34", "value": "rule34.xxx" },
								//{ "name": "e621", "value": "e621.net" },
								//{ "name": "yande.re", "value": "yande.re" },
								//{ "name": "HypnoHub", "value": "hypnohub.net" },
								//{ "name": "FurryBooru", "value": "furry.booru.org" },
								//{ "name": "Danbooru", "value": "danbooru.donmai.us" },
								//{ "name": "Gelbooru", "value": "gelbooru.com" },
								//{ "name": "Xbooru", "value": "xbooru.com" }
							]
						},
						{
							"type": ApplicationCommandOptionTypes.String,
							"name": "tags",
							"description": "What do you want to find? Multiple tags should be separated by commas.",
							"required": true,
							"autocomplete": true
						},
						{
							"type": ApplicationCommandOptionTypes.Boolean,
							"name": "hidden",
							"description": "Would you like to only show the result to yourself? Defaults to no (i.e., show to everyone).",
							"required": false
						}
					]
				}
			] }
		] )
	} )

	// Respond with either success or failure depending on the status, and the response body as JSON
	return new Response( await updateCommandsResponse.text(), {
		status: ( updateCommandsResponse.ok ? 200 : 500 ),
		headers: { "content-type": "application/json" }
	} )

} )

// Create a route for Discord to send application command interactions to...
requestRoutes.get( "POST" ).set( "/interactions", async ( request, event ) => {

	// Respond with forbidden for requests that do not present themselves as Discord
	if ( !request.headers.get( "user-agent", "" ).includes( "Discord-Interactions" ) ) return new Response( null, { status: 403 } )

	// Respond with unauthorised if the request signature is invalid
	if ( ! await validateSignature( await request.clone(), CLIENT_PUBLIC_KEY ) ) return new Response( null, { status: 401 } )

	// Parse the request body as JSON
	const interaction = await request.json()

	// Respond with acknowledgement if this is an interaction response test
	if ( interaction[ "type" ] === InteractionTypes.Ping ) return new Response( JSON.stringify( {
		"type": InteractionCallbackTypes.Pong
	} ), {
		status: 200,
		headers: { "content-type": "application/json" }
	} )

	// If this is an application command interaction...
	if ( interaction[ "type" ] === InteractionTypes.ApplicationCommand ) {

		// Return an empty response if this is not for the /hentai command
		if ( interaction[ "data" ][ "name" ] !== "hentai" ) return new Response( JSON.stringify( {
			"type": InteractionCallbackTypes.ChannelMessageWithSource,
			"data": {
				"content": "That application command does not exist.",
				"allowed_mentions": { "parse": [] },
				"flags": MessageFlags.Ephemeral
			}
		} ), {
			status: 200,
			headers: { "content-type": "application/json" }
		} )

		// Store the name of the sub-command
		const commandName = interaction[ "data" ][ "options" ][ 0 ][ "name" ]

		// Provide information & usage if this is the help sub-command
		if ( commandName === "help" ) return new Response( JSON.stringify( {
			"type": InteractionCallbackTypes.ChannelMessageWithSource,
			"data": {
				"content": "`// TODO: Write something useful here.`",
				"allowed_mentions": { "parse": [] },
				"flags": MessageFlags.Ephemeral
			}
		} ), {
			status: 200,
			headers: { "content-type": "application/json" }
		} )

		// If this is the search sub-command...
		if ( commandName === "search" ) {

			// Get the sub-command user-provided options
			const commandOptions = convertCommandOptions( interaction[ "data" ][ "options" ][ 0 ][ "options" ] )

			// Store the options for easy access
			const board = commandOptions.get( "board" ).value
			const tags = commandOptions.get( "tags" ).value.split( "," )

			// If this search is on Rule 34...
			if ( board === "rule34.xxx" ) {

				// Make the worker continue running until this completes
				event.waitUntil( new Promise( async ( resolve ) => {

					// Define placeholder variables to hold the fetched posts
					let totalPostCount = null, pagePosts = null

					// Fetch the posts matching the provided tags from the provided board
					try {
						[ totalPostCount, pagePosts ] = await fetchGelbooruPosts( board, tags )

					// Respond with internal server error if that fails
					} catch ( error ) {
						return new Response( error, {
							status: 500,
							headers: { "content-type": "text/plain" }
						} )
					}

					// Get the highest scored post out of all posts returned
					const topPost = pagePosts.reduce( ( previousPost, currentPost ) => currentPost.get( "score" ) > previousPost.get( "score" ) ? currentPost : previousPost, pagePosts[ 0 ] )
					console.log( totalPostCount, Array.from( topPost.entries() ) )

					//const tags = escapeMarkdown( topPost.get( "tags" ) )

					// Edit the original thinking response with an embed containing the top post
					const editMessageResponse = await fetch( BASE_URL + "/webhooks/" + CLIENT_ID + "/" + interaction[ "token" ] + "/messages/@original", {
						method: "PATCH",
						headers: {
							"content-type": "application/json"
						},
						body: JSON.stringify( {
							"embeds": [ {
								"title": "Score: " + topPost.get( "score" ), // + " (" + topPost.get( "rating" ).replace( /^\w/, character => character.toUpperCase() ) + ")", //, by " + topPost[ "owner" ],
								//"description": ( tags.length > 200 ? tags.substring( 0, 200 - 3 ) + "..." : tags ),
								"url": "https://rule34.xxx/index.php?page=post&s=view&id=" + topPost.get( "id" ),
								"author": {
									"name": "Rule 34",
									"url": "https://rule34.xxx",
									"icon_url": "https://rule34.xxx/apple-touch-icon-precomposed.png"
								},
								"image": {
									"url": topPost.get( "file_url" )
								},
								"footer": {
									"text": topPost.get( "width" ) + "x" + topPost.get( "height" ) + "px"
								},
								"timestamp": new Date( topPost.get( "change" ) * 1000 ).toISOString(),
								"color": 0xAAE5A4
							} ],
							"components": [
								{
									"type": 1,
									"components": [
										{
											"type": 2,
											"label": "Previous",
											"custom_id": "previous",
											"style": 1,
										},
										{
											"type": 2,
											"label": "Next",
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
											"label": "Delete",
											"custom_id": "delete",
											"style": 4,
										}
									]
								}
							],
							"allowed_mentions": { "parse": [] }
						} )
					} )

					resolve()
				} ) )

				return new Response( JSON.stringify( {
					"type": InteractionCallbackTypes.DeferredChannelMessageWithSource,
					/*"data": {
						"flags": ( ( commandOptions.get( "hidden" ) && commandOptions.get( "hidden" ).value ) ? MessageFlags.Ephemeral : 0 ),
					}*/
				} ), {
					status: 200,
					headers: { "content-type": "application/json" }
				} )

			} else {
				return new Response( JSON.stringify( {
					"type": InteractionCallbackTypes.DeferredChannelMessageWithSource
				} ), {
					status: 200,
					headers: { "content-type": "application/json" }
				} )
			}

		}

	} else if ( interaction[ "type" ] === InteractionTypes.ApplicationCommandAutocomplete ) {
		const commandOptions = convertCommandOptions( interaction[ "data" ][ "options" ][ 0 ][ "options" ] )

		// Not checking what option is focused because tags is the only autocomplete-able option

		if ( commandOptions.get( "board" ).value === "rule34.xxx" ) {
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
				headers: { "content-type": "text/plain" }
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
				headers: { "content-type": "application/json" }
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
			headers: { "content-type": "application/json" }
		} )
	}
} )
