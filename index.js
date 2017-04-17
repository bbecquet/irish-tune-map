'use strict';

/* globals fetch, L, R */

var getJson = function getJson(url) {
    return fetch(url).then(function (response) {
        return response.json();
    });
};

var placeName = R.path(['properties', 'name']);
var placeTunes = R.compose(R.defaultTo([]), R.path(['properties', 'tunes']));
var nbTunes = R.compose(R.length, placeTunes);
var tuneName = R.compose(R.head, R.prop('names'));
var compareTune = R.comparator(function (a, b) {
    return tuneName(a).localeCompare(tuneName(b)) < 0;
});

var normalStyle = {
    color: '#A52A2A',
    fillColor: '#A52A2A',
    opacity: 0.7,
    fillOpacity: 0.2
};

var highlightedStyle = {
    color: 'white',
    fillColor: '#A52A2A',
    opacity: 1,
    fillOpacity: 1
};

var hoverStyle = {
    color: '#A52A2A',
    fillColor: '#A52A2A',
    opacity: 1,
    fillOpacity: 0.6
};

var createPlaceMarker = function createPlaceMarker(place, latLng) {
    return L.circleMarker(latLng, R.merge(normalStyle, { radius: nbTunes(place) / 5 * 2 + 3 }));
};

var formatTuneListItem = function formatTuneListItem(tune) {
    return '<li><a href="https://thesession.org/tunes/' + tune.id + '">' + tuneName(tune) + '</a></li>';
};

var formatTuneList = R.pipe(R.sort(compareTune), R.map(formatTuneListItem), R.prepend('<ul>'), R.append('</ul>'), R.join(''));

function displayTunes(place) {
    var tunesByType = R.pipe(placeTunes, R.groupBy(R.prop('type')), R.toPairs, // => [type, tunes]
    R.sortBy(R.head), R.map(function (group) {
        return R.concat('<h3>' + group[0] + '</h3>', formatTuneList(group[1]));
    }), R.join(''))(place);

    document.getElementById('results').innerHTML = '<h2>' + placeName(place) + '</h2>' + tunesByType;
}

function toGeoJsonLayer(places) {
    var highlightedMarker = null;

    return L.geoJson(places, {
        pointToLayer: createPlaceMarker,
        onEachFeature: function onEachFeature(feature, layer) {
            layer.on('click', function () {
                displayTunes(feature);
                if (highlightedMarker) {
                    highlightedMarker.setStyle(normalStyle);
                }
                highlightedMarker = layer;
                layer.setStyle(highlightedStyle);
            }).on('mouseover', function () {
                if (layer === highlightedMarker) {
                    return;
                }
                layer.setStyle(hoverStyle);
            }).on('mouseout', function () {
                if (layer === highlightedMarker) {
                    return;
                }
                layer.setStyle(normalStyle);
            }).bindTooltip(placeName(feature) + ' (' + nbTunes(feature) + ')', {
                direction: 'top'
            });
        }
    });
}

function init() {
    var map = L.map('map', {
        center: [53.6, -7.86],
        zoom: 7,
        layers: [L.tileLayer('https://api.mapbox.com/styles/v1/bbecquet/cj02gbi88003x2snylweh6nkq/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiYmJlY3F1ZXQiLCJhIjoieGZqTzZsZyJ9.boUXwiILkBMs4SGBwQ1vWQ', {
            // L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.mapbox.com/map-feedback/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        })],
        minZoom: 6,
        maxBounds: L.latLngBounds([45, -15], [60, 0])
    });

    getJson('data/tunesByPlaces.geojson').then(function (places) {
        map.addLayer(toGeoJsonLayer(places));
    });
}

window.onload = init;