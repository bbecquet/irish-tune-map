const fs = require('fs');
const R = require('ramda');
const turf = require('turf');
const query_overpass = require('query-overpass');

const outFile= 'data/places.geojson';

const overpassQuery = `
[out:json][timeout:60];
(
    node
        [!"historic"]
        ["name"]
        ["place"~"city|town|village|island"]
        (poly:"54.38 -4.95 55.53 -6.15 55.37 -10.23 51.04 -11.25 51.56 -6.32");
    way
        [!"admin_level"]
        [!"historic"]
        ["name"]
        ["place"~"city|town|village|island"]
        (poly:"54.38 -4.95 55.53 -6.15 55.37 -10.23 51.04 -11.25 51.56 -6.32");
);
out body;
>;
out skel qt;
`;

// replaces polygon by its center
const simplifyGeom = place => R.assoc('geometry', turf.center(place).geometry, place);

const propsToKeep = ['name', 'name:ga', 'place'];
const simplifyProps = R.evolve({ properties: R.compose(R.pick(propsToKeep), R.prop('tags')) });

function queryOSM(query) {
    return new Promise((resolve, reject) => {
        query_overpass(query, (error, places) => {
            if(error) { reject(error); }
            else { resolve(places); }
        });
    });
}

function run() {
    queryOSM(overpassQuery)
    .then(R.pipe(
        R.prop('features'),
        R.map(simplifyGeom),
        R.map(simplifyProps),
        turf.featureCollection
    ))
    .then(cleanPlaces => {
        fs.writeFile(outFile, JSON.stringify(cleanPlaces, null, 2));
    });
}

run();
