/* globals fetch, L, R */

const getJson = url => fetch(url).then(response => response.json())

const humanizeTuneName = R.ifElse(
  R.endsWith(', The'),
  R.compose(R.concat('The '), R.dropLast(5)),
  R.identity
)

const placeName = R.path(['properties', 'name'])
const placeTunes = R.compose(R.defaultTo([]), R.path(['properties', 'tunes']))
const nbTunes = R.compose(R.length, placeTunes)
const tuneName = R.compose(humanizeTuneName, R.prop('matchingTitle'))
const compareTune = R.comparator((a, b) => tuneName(a).localeCompare(tuneName(b)) < 0)
const getMatchingTitle = (tune, place) =>
  tune.names.find(
    name => name.includes(place.properties.name) || name.includes(place.properties['name:ga'])
  ) || tune.names[0]

let highlightedMarker = null

const warmRed = '#A52A2A'

const normalStyle = {
  className: 'placeMarker',
  fillColor: warmRed,
  fillOpacity: 0.4,
  weight: 0,
}

const highlightedStyle = {
  fillColor: warmRed,
  opacity: 1,
  fillOpacity: 0.9,
}

const hoverStyle = {
  color: warmRed,
  fillColor: warmRed,
  opacity: 1,
  fillOpacity: 0.6,
  weight: 1,
}

const createPlaceMarker = (place, latLng) =>
  L.circleMarker(latLng, R.mergeLeft(normalStyle, { radius: (nbTunes(place) / 5) * 2 + 3 }))

const formatTuneListItem = tune =>
  `<li><a href="https://thesession.org/tunes/${tune.id}">${tuneName(tune)}</a></li>`

const formatTuneList = (place, tunes) =>
  R.pipe(
    R.map(tune => R.assoc('matchingTitle', getMatchingTitle(tune, place), tune)),
    R.sort(compareTune),
    R.map(formatTuneListItem),
    R.prepend('<ul>'),
    R.append('</ul>'),
    R.join('')
  )(tunes)

function displayTunes(place) {
  const tunesByType = R.pipe(
    placeTunes,
    R.groupBy(R.prop('type')),
    R.toPairs, // => [type, tunes]
    R.sortBy(R.head),
    R.map(group => R.concat(`<h3>${group[0]}</h3>`, formatTuneList(place, group[1]))),
    R.join('')
  )(place)

  document.getElementById('results').innerHTML = `<h2>${placeName(place)}</h2>${tunesByType}`
  document.body.classList.add('hasResults')
}

function clearResults() {
  if (highlightedMarker) {
    highlightedMarker.setStyle(normalStyle)
  }
  document.getElementById('results').innerHTML = ``
  document.body.classList.remove('hasResults')
}

function toGeoJsonLayer(places) {
  return L.geoJson(places, {
    pointToLayer: createPlaceMarker,
    onEachFeature: (feature, layer) => {
      layer
        .on('click', e => {
          displayTunes(feature)
          if (highlightedMarker) {
            highlightedMarker.setStyle(normalStyle)
          }
          highlightedMarker = layer
          layer.setStyle(highlightedStyle)
          L.DomEvent.stopPropagation(e)
        })
        .on('mouseover', () => {
          if (layer === highlightedMarker) {
            return
          }
          layer.setStyle(hoverStyle)
        })
        .on('mouseout', () => {
          if (layer === highlightedMarker) {
            return
          }
          layer.setStyle(normalStyle)
        })
        .bindTooltip(`${placeName(feature)} (${nbTunes(feature)})`, {
          direction: 'top',
        })
    },
  })
}

function init() {
  const map = L.map('map', {
    center: [53.6, -7.86],
    zoom: 7,
    layers: [
      L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }),
    ],
    minZoom: 6,
    maxBounds: L.latLngBounds([45, -15], [60, 0]),
  }).on('click', clearResults)

  getJson('data/tunesByPlaces.geojson').then(places => {
    map.addLayer(toGeoJsonLayer(places))
  })
}

window.onload = init
