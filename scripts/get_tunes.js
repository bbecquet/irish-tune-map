const fs = require('fs');
const R = require('ramda');
require('isomorphic-fetch');

const urls = {
    tunes: 'https://github.com/adactio/TheSession-data/raw/master/json/tunes.json',
    aliases: 'https://github.com/adactio/TheSession-data/raw/master/json/aliases.json',
};

const outFile= 'data/tunes.json';

const getJson = url => fetch(url).then(response => response.json());

const transformTunes = R.pipe(
    // there are bugs in the data, ignore records where the tune id is not a number
    R.filter(tune => R.is(Number, tune.tune)),
    R.map(tune => {
        return {
            id: tune.tune,
            type: tune.type,
            names: [tune.name],
        };
    }),
    R.uniqBy(R.prop('id')),
    R.indexBy(R.prop('id'))
);

const transformAliases = R.pipe(
    R.groupBy(R.prop('tune_id')),
    R.map(R.pluck('alias'))
);

const mergeTuneAndAliases = (id, tune, aliases) => {
    return {
        id,
        type: tune.type,
        names: R.concat(tune.names, aliases),
    };
};

function run() {
    Promise.all([urls.tunes, urls.aliases].map(getJson))
    .then(([tunes, aliases]) => {
        const tunesById = transformTunes(tunes);
        const aliasesById = transformAliases(aliases);
        return R.values(R.mergeWithKey(mergeTuneAndAliases, tunesById, aliasesById));
    })
    .then(tunesWithAliases => {
        fs.writeFile(outFile, JSON.stringify(tunesWithAliases, null, 2));
    });
}

run();
