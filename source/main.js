import { requestRoutes } from "./routes"

addEventListener( "fetch", ( event ) => {
	const availableRoutes = requestRoutes.get( event.request.method )
	if ( !availableRoutes ) return new Response( null, { status: 405 } )

	const requestUrl = new URL( event.request.url )
	const destinationRoute = availableRoutes.get( requestUrl.pathname )
	if ( !destinationRoute ) return new Response( null, { status: 501 } )

	const routeResponse = destinationRoute( event.request, event )
	if ( routeResponse ) {
		event.respondWith( routeResponse )
	} else {
		event.respondWith( new Promise( ( resolve ) => {
			resolve( new Response( null, { status: 204 } ) )
		} ) )
	}
} )
