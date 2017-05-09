const fs = require('fs');
const R = require('ramda');
const turf = require('turf');

const files = {
    tunes: 'data/tunes.json',
    places: 'data/places.geojson',
    out: 'data/tunesByPlaces.geojson'
};

const getJsonFile = path => JSON.parse(fs.readFileSync(path));

// some names are too common and yield too many false positives
const ignoreList = [
    'Abbey',
    'Park',
    'Cross',
    'Kill',
    'Street',
    'Golden',
    'Valley',
    'Tower',
    'Crannog',  // this is a common name for a small island
    'Inish'     // it means island
];
const shouldIgnorePlace = place => !place.properties.name || R.contains(place.properties.name, ignoreList);

// to speed-up matching, we can just consider aliases as a big string
const getTuneMatchingString = tune => tune.names.join(' ; ');

// the real matching rule is a simple regexp
const namesMatch = (placeName, tuneName) => new RegExp(`${placeName}(?:$| |,)`).test(tuneName);

const getPlaceNames = place => {
    const placeNames = place.properties.name.split('/');    // Only to manage LondonDerry/Derry
    if (place.properties['name:ga']) {
        placeNames.push(place.properties['name:ga']);
    }
    return placeNames;
};

// there is a match if at least one name of the place matches the tune names
const placeMatchesTune = (placeNames, tune) => placeNames.some(placeName => namesMatch(placeName, tune.namesMatchString));

const findMatchingTunes = (place, tunes) => {
    const placeNames = getPlaceNames(place);
    return R.filter(tune => placeMatchesTune(placeNames, tune))(tunes);
};

const hasNoTunes = R.compose(R.isEmpty, R.path(['properties', 'tunes']));

function run() {
    const tunes = getJsonFile(files.tunes);
    const placesGeoJson = getJsonFile(files.places);

    // prepare tunes for efficient matching by storing a concat'd version of their names
    const tunesForMatching = tunes.map(tune => R.assoc('namesMatchString', getTuneMatchingString(tune), tune));

    let counter = 0;
    const addTunes = place => {
        console.log(++counter, place.properties.name);
        const matchingTunes = findMatchingTunes(place, tunesForMatching).map(R.dissoc('namesMatchString'));
        return R.assocPath(['properties', 'tunes'], matchingTunes, place);
    }

    const resultGeoJson = R.pipe(
        // take the FeatureCollection's features
        R.prop('features'),
        // simply ignore some places that give bad matches
        R.reject(shouldIgnorePlace),
        // find and add matching tunes to the places
        R.map(addTunes),
        // remove places with no associated tunes
        R.reject(hasNoTunes),
        // rebuild a GeoJSON FeatureCollection
        turf.featureCollection
    )(placesGeoJson);

    fs.writeFile(files.out, JSON.stringify(resultGeoJson, null, 2));

    console.log('done');
}

run();
