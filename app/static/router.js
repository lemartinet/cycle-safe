var L = require('leaflet'),
    PathFinder = require('geojson-path-finder'),
    explode = require('turf-explode'),
    nearest = require('turf-nearest'),
    distance = require('@turf/distance').default,
    point = require('@turf/helpers').point,
    featurecollection = require('turf-featurecollection');

require('leaflet-routing-machine');

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

var highwaySpeeds = {
    motorway: 110,
    trunk: 90,
    primary: 80,
    secondary: 70,
    tertiary: 50,
    unclassified: 50,
    road: 50,
    residential: 30,
    service: 30,
    living_street: 20
}

var unknowns = {};

function weightFn(a, b, props) {
    var d = distance(point(a), point(b)) * 1000,
        factor = 0.9,
        type = props.highway,
        forwardSpeed,
        backwardSpeed,
        // risk = (1 + props.crash);
        risk = 0.01 + props.crash;

    // if (props.maxspeed) {
    //     forwardSpeed = backwardSpeed = Number(props.maxspeed);
    // } else {
    //     var linkIndex = type.indexOf('_link');
    //     if (linkIndex >= 0) {
    //         type = type.substring(0, linkIndex);
    //         factor *= 0.7;
    //     }

    //     forwardSpeed = backwardSpeed = highwaySpeeds[type] * factor;
    //     if (!forwardSpeed) {
    //         unknowns[type] = true;
    //     }
    // }
    forwardSpeed = backwardSpeed = 30;

    if (props.oneway && props.oneway !== 'no' || props.junction && props.junction === 'roundabout') {
        backwardSpeed = null;
    }

    return {
        // forward: forwardSpeed && (d*risk / (forwardSpeed / 3.6)),
        forward: 1*risk,
        // backward: backwardSpeed && (d*risk / (backwardSpeed / 3.6)),
        backward: 1*risk,
    };
}

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
        // console.log(JSON.stringify(unknowns, null, 2));
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