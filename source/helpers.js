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

// Import the signature functions from NaCl
import { sign } from "tweetnacl"

// The regular expressions for XML "parsing"
const REGEX_POSTS = new RegExp( /<posts (.*?)>/ )
const REGEX_POST = new RegExp( /<post (.*)\/>/g )
const REGEX_ATTRIBUTE = new RegExp( /(\w+)="(.*?)"/g )

// The regular expression for testing numbers
const REGEX_NUMBER = new RegExp( /^\d+$/ )

// Converts a hex-encoded string into an array of bytes
const decodeHex = ( hexData ) => Uint8Array.from( hexData.match( /.{2}/g ).map( hexChar => parseInt( hexChar, 16 ) ) )

// Verifies the authenticity of an interaction request signature
export const validateSignature = async ( request, publicKey ) => {

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
	return sign.detached.verify( signatureMessage, decodeHex( signatureHeader ), decodeHex( publicKey ) )

}

// Creates a dictionary from an array of command options
export const convertCommandOptions = ( options ) => options.reduce( ( map, option ) => {
	map.set( option[ "name" ], {
		type: option[ "type" ],
		value: option[ "value" ]
	} )

	return map
}, new Map() )

/* API documentation for each board:
- https://rule34.xxx/index.php?page=help&topic=dapi#
- https://e621.net/help/api
- https://yande.re/help/api
- https://hypnohub.net/index.php?page=help&topic=dapi#
- https://furry.booru.org/index.php?page=help&topic=dapi
- https://danbooru.donmai.us/wiki_pages/help:api
- https://gelbooru.com/index.php?page=wiki&s=view&id=18780
- https://xbooru.com/index.php?page=help&topic=dapi
*/

// Fetch posts from a Gelbooru Beta 0.2 compatible board (Rule 34)
export const fetchGelbooruPosts = async ( board, tags ) => {

	// Correct the Rule 34 API as it now redirects here
	if ( board === "rule34.xxx" ) board = "api.rule34.xxx"

	// Fetch the most recent posts from the provided board, for the provided tags
	const apiResponse = await fetch( "https://" + board + "/index.php?" + new URLSearchParams( {
		"page": "dapi",
		"s": "post",
		"q": "index",
		"tags": tags.join( " " ),
		"pid": 0,
		"limit": 50,
		"json": 0 // JSON returns less data for each post than XML?
	} ).toString(), {
		method: "GET",
		headers: { "Accept": "text/xml, application/json, */*" }
	} )

	// Throw an error if the request failed
	if ( !apiResponse.ok ) throw new Error( await apiResponse.text() )

	// Get the media type of the response
	const contentType = apiResponse.headers.get( "content-type" ).split( ";" )[ 0 ]

	// Parse the response as JSON if thats what it is
	if ( contentType.startsWith( "application/json" ) ) {
		return [ null, await apiResponse.json() ] // JSON only returns the array of posts, no other data

	// If the response type is XML...
	} else if ( contentType.startsWith( "text/xml" ) ) {

		// Store the XML data
		const document = await apiResponse.text()

		// Define placeholders to contain extracted XML values
		let totalPostCount = null, pagePosts = []

		// Extract the total number of posts
		for ( const attributeMatch of document.match( REGEX_POSTS )[ 1 ].matchAll( REGEX_ATTRIBUTE ) ) {
			if ( attributeMatch[ 1 ] === "count" ) {
				totalPostCount = parseInt( attributeMatch[ 2 ] )
				break
			}
		}

		// Extract and loop through each post...
		for ( const postMatch of document.matchAll( REGEX_POST ) ) {

			// Create a map for holding the post data
			let post = new Map()

			// Loop through each attribute and add it to the map
			for ( const attributeMatch of postMatch[ 1 ].matchAll( REGEX_ATTRIBUTE ) ) {
				const attributeValue = attributeMatch[ 2 ].trim()
				post.set( attributeMatch[ 1 ], ( REGEX_NUMBER.test( attributeValue ) ? parseInt( attributeValue ) : attributeValue ) )
			}

			// Add the post map to the posts array
			pagePosts.push( post )

		}

		// Return both the total post count and all extracted posts
		return [ totalPostCount, pagePosts ]

	}

}

// Escapes markdown for safely displaying in a Discord message
export const escapeMarkdown = ( text ) => {
	text = text.replace( /_/g, "\\_" )
	text = text.replace( /\*/g, "\\*" )

	return text
}