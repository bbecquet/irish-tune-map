/* globals fetch, L, R */

const getJson = url => fetch(url).then(response => response.json());

const humanizeTuneName = R.ifElse(
    R.endsWith(', The'),
    R.compose(R.concat('The '), R.dropLast(5)),
    R.identity
);

const placeName = R.path(['properties', 'name']);
const placeTunes = R.compose(R.defaultTo([]), R.path(['properties', 'tunes']));
const nbTunes = R.compose(R.length, placeTunes);
const tuneName = R.compose(humanizeTuneName, R.head, R.prop('names'));
const compareTune = R.comparator((a, b) => tuneName(a).localeCompare(tuneName(b)) < 0);

const warmRed = '#A52A2A';

const normalStyle = {
    color: warmRed,
    fillColor: warmRed,
    opacity: 0.7,
    fillOpacity: 0.2,
};

const highlightedStyle = {
    color: 'white',
    fillColor: warmRed,
    opacity: 1,
    fillOpacity: 1,
};

const hoverStyle = {
    color: warmRed,
    fillColor: warmRed,
    opacity: 1,
    fillOpacity: 0.6,
};

const createPlaceMarker = (place, latLng) => L.circleMarker(latLng,
    R.merge(normalStyle, { radius: nbTunes(place) / 5 * 2 + 3 })
);

const formatTuneListItem = tune =>
    `<li><a href="https://thesession.org/tunes/${tune.id}">${tuneName(tune)}</a></li>`;

const formatTuneList = R.pipe(
    R.sort(compareTune),
    R.map(formatTuneListItem),
    R.prepend('<ul>'), R.append('</ul>'),
    R.join('')
);

function displayTunes(place) {
    const tunesByType = R.pipe(
        placeTunes,
        R.groupBy(R.prop('type')),
        R.toPairs,  // => [type, tunes]
        R.sortBy(R.head),
        R.map(group => R.concat(`<h3>${group[0]}</h3>`, formatTuneList(group[1]))),
        R.join('')
    )(place);

    document.getElementById('results').innerHTML = `<h2>${placeName(place)}</h2>${tunesByType}`;
}

function toGeoJsonLayer(places) {
    let highlightedMarker = null;

    return L.geoJson(places, {
        pointToLayer: createPlaceMarker,
        onEachFeature: (feature, layer) => {
            layer.on('click', () => {
                displayTunes(feature);
                if (highlightedMarker) {
                    highlightedMarker.setStyle(normalStyle);
                }
                highlightedMarker = layer;
                layer.setStyle(highlightedStyle);
            }).on('mouseover', () => {
                if(layer === highlightedMarker) { return; }
                layer.setStyle(hoverStyle);
            }).on('mouseout', () => {
                if(layer === highlightedMarker) { return; }
                layer.setStyle(normalStyle);
            }).bindTooltip(`${placeName(feature)} (${nbTunes(feature)})`, {
                direction: 'top'
            });
        }
    });
}

function init() {
    const map = L.map('map', {
        center: [53.6, -7.86],
        zoom: 7,
        layers: [
            L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            })
        ],
        minZoom: 6,
        maxBounds: L.latLngBounds([45, -15], [60, 0])
    });

    getJson('data/tunesByPlaces.geojson').then(places => {
        map.addLayer(toGeoJsonLayer(places));
    });
}

window.onload = init;
