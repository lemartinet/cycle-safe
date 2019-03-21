// Loading required modules
var L = require('leaflet'),
    Router = require('./router'),
    util = require('./util'),
    nearest = require('turf-nearest'),
    extent = require('turf-extent');
    gauge = require('gauge-progress')(),
    lineDistance = require('@turf/line-distance'),
    config = require('./config');
require('leaflet.icon.glyph');
require('leaflet-routing-machine');
require('leaflet-control-geocoder');

// Helper functions
function toPoint (wp) {
    return {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [wp.lng, wp.lat]
        }
    };
}

// Creating the map object
var map = L.map('map');

// Setting the map background to Mapbox
L.tileLayer('https://api.mapbox.com/v4/mapbox.outdoors/{z}/{x}/{y}{r}.png?access_token={token}', {
        attribution: "© <a href='https://www.mapbox.com/about/maps/'>Mapbox</a> © <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a> <strong><a href='https://www.mapbox.com/map-feedback/' target='_blank'>Improve this map</a></strong>",
        token: config.apiToken
    })
    .addTo(map);

// Loading the network from the server with a nice animation
var net;
L.alpha = 1;

gauge.start();
var xhr = new XMLHttpRequest();
xhr.addEventListener('progress', function(oEvent) {
    if (oEvent.lengthComputable) {
        gauge.progress(oEvent.loaded, oEvent.total);
    }
});
xhr.onload = function() {
    gauge.stop();
    if (xhr.status === 200) {
        gauge.progress(100, 100);
        setTimeout(function() {
            net = JSON.parse(xhr.responseText);
            initialize(net);
        });
    }
    else {
        alert('Could not load routing network :( HTTP ' + xhr.status);
    }
};
xhr.open('GET', 'static/map1.geojson');
xhr.send();

// Initialize the app with the downloaded network and add routing control object
var control;
// var top_risky = []; TODO find the top riskiest spot on the path
function initialize(network) {
    
    var router = new Router(network); // Use our custom router using risk
    control = L.Routing.control({
        createMarker: function(i, wp) {
            return L.marker(wp.latLng, {
                icon: L.icon.glyph({ prefix: '', glyph: String.fromCharCode(65 + i) }),
                draggable: true
            })
        }, // Setup marker properties (add a letter on them A, B, ...)
        geocoder: L.Control.Geocoder.mapbox(config.apiToken), // Use mapbox to geocode addresses
        router: router, // Our router
        routeWhileDragging: true, // Update the path dynamically when moving markers
        routeDragInterval: 100, // Update frequency
        lineOptions: { // Tune the color of the path on the map
            styles: [{color: 'green', opacity: 1, weight: 5}]
         }
        })
        .on('routesfound', function(e) {
            // When a route is found, display summary measures if the risk-based route is selected
            var infoContainer = document.querySelector('.leaflet-testbox');
            var routes = e.routes;
            infoContainer.innerHTML = 'Distance (km): ' + (routes[0].summary.totalDistance/1000).toFixed(2);
            if (L.alpha == 1) {
                infoContainer.innerHTML += '<br/>Cumulated risk: ' + routes[0].summary.totalTime.toFixed(2);
                infoContainer.innerHTML += '<br/>Risk/distance: ' + (1000*routes[0].summary.totalTime/routes[0].summary.totalDistance).toFixed(2);
                infoContainer.innerHTML += '<br/>Average risk: ' + (routes[0].summary.totalTime/routes[0].coordinates.length).toFixed(2);
                infoContainer.innerHTML +=
                    '<p style="font-size: 10pt;">Note: the risk of a street segment is the probability of being part of the class "street with accident".</p>';
            }
            // TODO
            // // draw pins at the dangerous points
            // if (top_risky) {
            //     map.removeLayer(top_risky);
            //     // clear things in top_risky, top_risky.removeLayer();
            // }

            // // send routes[0].coordinates to server and store results in list_risky
            // var list_risky = [];
            // for (var i=0; i < list_risky.length; i++)
            //     top_risky.addLayer(L.marker([39.61, -105.02]).bindPopup('Risk level: '));
            // // top_risky = L.layerGroup([marker1, marker2, marker3]);
            // map.addLayer(top_risky);  
        })
        .addTo(map);
    
    // Add an html container to store the summary info
    var container = L.DomUtil.create('div', 'leaflet-testbox');
    // 	input = L.DomUtil.create('input', '', container);
    // control.getContainer().appendChild(container);
    // control.getContainer().appendChild(input);
    var infoContainer = document.querySelector('.leaflet-routing-container');
    infoContainer.appendChild(container);

    L.Routing.errorControl(control).addTo(map); // Allow error messages to be displayed in the box

    // Compute summary info about the network
    var totalDistance = network.features.reduce(function(total, feature) {
            if (feature.geometry.type === 'LineString') {
                return total += lineDistance(feature, 'kilometers');
            } else {
                return total;
            }
        }, 0),
        graph = router._pathFinder._graph.compactedVertices,
        nodeNames = Object.keys(graph),
        totalNodes = nodeNames.length,
        totalEdges = nodeNames.reduce(function(total, nodeName) {
            return total + Object.keys(graph[nodeName]).length;
        }, 0);

    // Display the results in the HTML
    var infoContainer = document.querySelector('#info-container');
    [
        ['Total Road Length', totalDistance, 'km'],
        ['Network Nodes', totalNodes / 1000, 'k'],
        ['Network Edges', totalEdges / 1000, 'k'],
        ['Coordinates', router._points.features.length / 1000, 'k']
    ].forEach(function(info) {
        var li = L.DomUtil.create('li', '', infoContainer);
        li.innerHTML = info[0] + ': <strong>' + Math.round(info[1]) + (info[2] ? '&nbsp;' + info[2] : '') + '</strong>';
    });

    // Prepare a new layer to display all the street risks
    var networkLayer = L.layerGroup(),
        vertices = router._pathFinder._graph.sourceVertices,
        weights = router._pathFinder._graph.vertices,
        renderer = L.canvas().addTo(map);
    nodeNames.forEach(function(nodeName) {
        var node = graph[nodeName];
        Object.keys(node).forEach(function(neighbor) {
            var c1 = vertices[nodeName],
                c2 = vertices[neighbor];
                w = weights[nodeName][neighbor];
            function getColor(value){
                //value from 0 to 1
                var hue=((1-value)*120).toString(10);
                return ["hsl(",hue,",100%,50%)"].join("");
            }
            L.polyline([[c1[1], c1[0]], [c2[1], c2[0]]], { weight: 2, color:getColor(w), renderer: renderer, interactive: false })
                .addTo(networkLayer)
                .bringToBack();
        });
    });

    // Add a control to display the layer
    L.control.layers(null, {
        'Risk Layer': networkLayer,
    }, { position: 'bottomright'}).addTo(map);

    // Set default start and end points when the user connects on the app
    // This triggers the search for a route right away
    control.setWaypoints([
		[42.350, -71.097], // home
		[42.350, -71.050],  // insight
    ]);

}

// Display the bike lane network
// $.getJSON("static/Existing_Bike_Network.geojson",function(data){
	// add GeoJSON layer to the map once the file is loaded
    // L.geoJson(data).addTo(map).bringToBack();
//   });


// Setup some links to allow differents types of route to be computed 
// The user can choose between fast, intermediate and safest
window.onload = function() {
	// setup the JSON Submit button 
	document.getElementById("fastest_route").onclick = function() {
        // sendJSON();
        L.alpha = 0;
        update(net);
        // stop link from reloading the page
	    event.preventDefault();
    };
    document.getElementById("safest_route").onclick = function() {
        // sendJSON();
        L.alpha = 1;
        update(net);
        // stop link from reloading the page
	    event.preventDefault();
    };
    document.getElementById("interm_route").onclick = function() {
        // sendJSON();
        L.alpha = 0.5;
        update(net);
        // stop link from reloading the page
	    event.preventDefault();
	};
}

// This is called when a user clicks a link to update the router object
function update(network) {
	// var firstload = 1;
    var router = new Router(network);
    // This sets the router object to the Mapbox router
    // options = {
    //     serviceUrl: 'https://api.mapbox.com/directions/v5',
    //     profile: 'mapbox/cycling',
    //     useHints: false
    // };
    // var router = L.routing.mapbox(config.apiToken, options);
    control.router = control._router = control.options.router = router;
    control.route({});
}

// Setup AJAX communication with the server
// Experimental, not used for now
function sendJSON() {
	// collect variables 
	// var name = document.getElementById('nameVar').value;
	// var age = document.getElementById('ageVar').value;
	// var country = document.getElementById('countryVar').value;

	// build a JavaScript object using the variables
	var data_object = {
			// "name"		: name,
			// "age"		: age,
			// "country" 	: country 
		};

	// convert JavaScript object to JSON object
	var data_json = JSON.stringify(data_object);
	
	// log state and the JavaScript object (to be sent in JSON format)
	console.log(">> JSON data : ");
	console.log(data_object);
	console.log(">> Sending..");

	// AJAX the JSON object to the server 
	// and process the incoming data (JSON)
	$.ajax({
		type: "POST",
		url: "/json_receiver",
		data: data_json, 
		contentType:"application/json; charset=utf-8",
  		dataType:"json",
		success : function(data) {
			// log the current state
			console.log("<< Received JSON data : ");
			// console.log(data);
			console.log("<< Success!");
			// genrate reponse and print on the document
			// var message = "Hello, <b>" + data['name'] + "</b>. You are : <b>" + data['status'] + "</b> !";
			// $('#JSONresultHolder').html(message);
			
			update(data);
		},
		error : function(){
			console.log("<< Error!")
		}
	});
	
	// stop link from reloading the page
	event.preventDefault();
}


