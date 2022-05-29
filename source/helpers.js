// Import the signature functions from NaCl
import { sign } from "tweetnacl"

// Import parser from fast XML parser
import { XMLParser } from "fast-xml-parser"

// The prefix for parsed XML element attributes
const XML_ATTRIBUTE_PREFIX = "@"

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

// Creates a dictionary from an array of interaction options
export const getCommandOptions = ( interactionOptions ) => interactionOptions.reduce( ( map, option ) => {
	map.set( option[ "name" ], {
		type: option[ "type" ],
		value: option[ "value" ]
	} )

	return map
}, new Map() )

// Fetch posts from a Gelbooru Beta 0.2 compatible board (Rule 34)
export const fetchGelbooruPosts = async ( site, tags ) => {

	// Correct the Rule 34 API as it now redirects here
	if ( site === "rule34.xxx" ) site = "api.rule34.xxx"

	// Fetch the most recent posts from the provided site, for the provided tags
	const apiResponse = await fetch( "https://" + site + "/index.php?" + new URLSearchParams( {
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

	// Return internal server error and the response body if the request failed
	if ( !apiResponse.ok ) return new Response( await apiResponse.text(), {
		status: 500,
		headers: { "Content-Type": "text/plain" }
	} )

	// Get the media type of the response
	const contentType = apiResponse.headers.get( "content-type" ).split( ";" )[ 0 ]

	// Parse the response as JSON if thats what it is
	if ( contentType.startsWith( "application/json" ) ) {
		return [ null, await apiResponse.json() ] // JSON only returns the array of posts, no other data

	// If the response type is XML...
	} else if ( contentType.startsWith( "text/xml" ) ) {

		// Parse the response body as XML and retain element attributes
		const xml = new XMLParser( {
			ignoreAttributes: false,
			attributeNamePrefix: XML_ATTRIBUTE_PREFIX
		} ).parse( await apiResponse.text() )

		// Loop through each post's attributes and remove the specified prefix from them
		xml.posts.post.forEach( ( post ) => Object.keys( post ).forEach( ( key ) => {
			if ( !key.startsWith( XML_ATTRIBUTE_PREFIX ) ) return
			post[ key.substring( XML_ATTRIBUTE_PREFIX.length ) ] = post[ key ]
			delete post[ key ]
		} ) )

		// Return the total number of posts and the array of posts themselves
		return [ xml.posts[ XML_ATTRIBUTE_PREFIX + "count" ], xml.posts.post ]

	}

}
