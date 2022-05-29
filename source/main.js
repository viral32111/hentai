// Import all request routes
import { requestRoutes } from "./routes"

// Returns a promise that resolves to an empty response with the provided HTTP status code
const emptyResponse = async ( statusCode ) => {
	return new Response( null, { status: statusCode } )
}

// Handle incoming Worker requests...
addEventListener( "fetch", ( event ) => {

	// Parse the full URL
	const requestUrl = new URL( event.request.url )

	// Get the routes available for this method
	const availableRoutes = requestRoutes.get( event.request.method )

	// Respond with method not allowed if there are no routes for this method
	if ( !availableRoutes ) return event.respondWith( emptyResponse( 405 ) )
	
	// Get the route function for this path from the routes for this method
	const destinationRoute = availableRoutes.get( requestUrl.pathname )

	// Respond with not implemented if there is no route for this path
	if ( !destinationRoute ) return event.respondWith( emptyResponse( 501 ) )

	// Execute the route function and store the response
	const routeResponse = destinationRoute( event.request, event )

	// Respond with no content if the route did not give a response
	if ( !routeResponse ) return event.respondWith( emptyResponse( 204 ) )

	// Respond with whatever the route returned
	event.respondWith( routeResponse )

} )
