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
