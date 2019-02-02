var map = L.map('map');

// L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
// 	attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
// }).addTo(map);


L.tileLayer('https://api.mapbox.com/v4/mapbox.outdoors/{z}/{x}/{y}{r}.png?access_token={token}', {
	attribution: "© <a href='https://www.mapbox.com/about/maps/'>Mapbox</a> © <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a> <strong><a href='https://www.mapbox.com/map-feedback/' target='_blank'>Improve this map</a></strong>",
	token: config.apiToken
})
.addTo(map);

$.getJSON("static/Existing_Bike_Network.geojson",function(data){
    // add GeoJSON layer to the map once the file is loaded
    L.geoJson(data).addTo(map).bringToBack();
  });

var firstload = 1;

var control = L.Routing.control(L.extend(window.lrmConfig, {
	waypoints: [
		L.latLng(42.3499759, -71.0969356), // home
		L.latLng(42.3503134, -71.0496852)  // insight
	],
	geocoder: L.Control.Geocoder.mapbox(config.apiToken),
	router: L.routing.mapbox(config.apiToken),
	routeWhileDragging: false,
	reverseWaypoints: false,
	showAlternatives: false,
}))
.on('routesfound', function(e) {
	var routes = e.routes;
	if (!firstload) {
		alert('Average estimated risk: ' + routes[0].summary.totalDistance / 10000);
	} else {
		firstload = 0;
	}
}).addTo(map);

// var container = L.DomUtil.create('div', 'leaflet-testbox'), 
// 	input = L.DomUtil.create('input', '', container);
// control.getContainer().appendChild(input);
// control.getContainer().appendChild(input);

L.Routing.errorControl(control).addTo(map);

// var PathFinder = require('geojson-path-finder');
    // geojson = require('./map1.geojson');

// var pathFinder = new PathFinder(geojson);


 
