// Loading required modules
var L = require('leaflet'),
    PathFinder = require('geojson-path-finder'),
    explode = require('turf-explode'),
    nearest = require('turf-nearest'),
    distance = require('@turf/distance').default,
    point = require('@turf/helpers').point,
    featurecollection = require('turf-featurecollection');
require('leaflet-routing-machine');

// helper functions
function toPoint (wp) {
    var c = wp.latLng;
    return {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [c.lng, c.lat]
        }
    };
}

function toLatLng (p) {
    return L.latLng(p[1], p[0]);
}

// This is the core part where I define the weights of the network
function weightFn(a, b, props) {
    var d = distance(point(a), point(b)) * 1000 / 100, // /100 is to normalize between [0,1]
        forwardSpeed,
        backwardSpeed,
        risk = 0.01 + props.crash,
        alpha = L.alpha;

    forwardSpeed = backwardSpeed = 30; // Simplification: we assume same speed on all streets

    if (props.oneway && props.oneway !== 'no' || props.junction && props.junction === 'roundabout') {
        backwardSpeed = null;
    }

    return { // return the weights as the weighted sum using alpha
        forward: alpha*risk + (1-alpha)*d,
        backward: alpha*risk + (1-alpha)*d,
    };
}

// This is reused from the demo code of this Router plugin 
module.exports = L.Class.extend({
    initialize: function(geojson) {
        this._pathFinder = new PathFinder(geojson, {
            precision: 1e-5,
            weightFn: weightFn
        });
        var vertices = this._pathFinder._graph.vertices;
        this._points = featurecollection(Object.keys(vertices)
            .filter(function(nodeName) {
                return Object.keys(vertices[nodeName]).length;
            })
            .map(function(nodeName) {
                var vertice = this._pathFinder._graph.sourceVertices[nodeName];
                return point(vertice);
            }.bind(this)));
    },

    route: function(waypoints, cb, context) {
        var actualWaypoints = waypoints.map(function(wp) {
                return nearest(toPoint(wp), this._points);
            }.bind(this)),
            legs = actualWaypoints.map(function(wp, i, wps) {
            if (i > 0) {
                return this._pathFinder.findPath(wps[i - 1], wp);
            }

            return [];
        }.bind(this)).slice(1);

        if (legs.some(function(l) { return !l; })) {
            return cb.call(context, {
                status: 1,
                message: 'Can\'t find route.'
            });
        }

        var totalTime = legs.reduce(function(sum, l) { return sum + l.weight; }, 0);
        var totalDistance = legs.reduce(function(sum, l) { 
            var legDistance = l.path.reduce(function(d, c, i, cs) {
                if (i > 0) {
                    return d + distance(point(cs[i - 1]), point(c)) * 1000;
                }
                return d;
            }, 0);
            return sum + legDistance;
        }, 0);

        cb.call(context, null, [{
            name: '',
            waypoints: actualWaypoints.map(function(p) { return { latLng: toLatLng(p) }; }),
            inputWaypoints: waypoints,
            summary: {
                totalDistance: totalDistance,
                totalTime: totalTime
            },
            coordinates: Array.prototype.concat.apply([], legs.map(function(l) { return l.path.map(toLatLng); })),
            instructions: []
        }]);
    }
});
