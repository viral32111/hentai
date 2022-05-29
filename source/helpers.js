// Import the signature functions from NaCl
import { sign } from "tweetnacl"

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


export const getCommandOptions = ( interactionOptions ) => {
	const commandOptions = new Map()

	interactionOptions.forEach( option => commandOptions.set( option[ "name" ], {
		type: option[ "type" ],
		value: option[ "value" ]
	} ) )

	return commandOptions
}