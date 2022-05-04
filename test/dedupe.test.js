'use strict';

const fs = require('fs');
const test = require('tape');
const dedupe = require('../index').dedupe;
const ReadLine = require('n-readlines');
const path = require('path');

const db = require('./lib/db');
db.init(test);

test('dedupe (dataset)', (t) => {
    try {
        fs.unlinkSync('/tmp/dedupeout.geojson');
    } catch (err) {
        console.log('ok - no tmp files to clear');
    }

    t.doesNotThrow(() => {
        dedupe({
            db: 'pt_test',
            hecate: false,
            input: path.resolve(__dirname, './fixtures/dedupe.geojson'),
            output: '/tmp/dedupeout.geojson',
            languages: ['en'],
            context: {
                country: 'us',
                region: 'dc'
            }
        });
    }, 'dedupe runs without err');

    t.doesNotThrow(() => {
        fs.accessSync('/tmp/dedupeout.geojson');
    }, 'output exists');

    const rl = new ReadLine('/tmp/dedupeout.geojson');

    const output = {};
    let line = rl.next();
    while (line) {
        line = JSON.parse(line);

        output[line.id] = line;
        line = rl.next();
    }

    t.deepEquals(Object.keys(output), [
        '1', // ID 1,2,7 & 8 should be collapsed to only ID 1 (duplicate geom/number/street)
        '3', '4', // ID 3 & 4 should be output - duplicate number/street but not geom
        '5', '6' // ID 5 & 6 should be output - duplicate street/geom - 123 vs 123a for number
    ], 'output ids as expected');

    t.deepEquals(output[1], {
        id: 1,
        type: 'Feature',
        properties: {
            number: '123',
            source: 'openaddresses',
            random: 'property',
            street: [{ display: 'Main St', priority: -1 }]
        },
        geometry: {
            type: 'Point',
            coordinates: [-77.481846213, 37.500529520]
        }
    }, 'feature 1');

    t.deepEquals(output[3], {
        id: 3,
        type: 'Feature',
        properties: {
            number: '123',
            source: 'random',
            street: [{ display: 'Main St', priority: -1 }]
        },
        geometry: {
            type: 'Point',
            coordinates: [-77.482554316, 37.500269912]
        }
    }, 'feature 3');

    t.deepEquals(output[4], {
        id: 4,
        type: 'Feature',
        properties: {
            number: '123',
            source: 'random',
            street: [{ display: 'Main St', priority: -1 }]
        },
        geometry: {
            type: 'Point',
            coordinates: [-77.481942772, 37.499563436]
        }
    }, 'feature 4');

    t.deepEquals(output[5], {
        id: 5,
        type: 'Feature',
        properties: {
            number: '123',
            source: 'openaddresses',
            street: [{ display: 'Main St', priority: -1 }]
        },
        geometry: {
            type: 'Point',
            coordinates: [-77.481368780, 37.499997537]
        }
    }, 'feature 5');

    t.deepEquals(output[6], {
        id: 6,
        type: 'Feature',
        properties: {
            number: '123a',
            source: 'rando',
            street: [{ display: 'Main St', priority: -1 }]
        },
        geometry: {
            type: 'Point',
            coordinates: [-77.481368780, 37.499997537]
        }

    }, 'feature 6');

    t.end();
});

test('dedupe (hecate)', (t) => {
    try {
        fs.unlinkSync('/tmp/dedupeout.geojson');
    } catch (err) {
        console.log('ok - no tmp files to clear');
    }

    t.doesNotThrow(() => {
        dedupe({
            db: 'pt_test',
            hecate: true,
            input: path.resolve(__dirname, './fixtures/dedupe.geojson'),
            output: '/tmp/dedupeout.geojson',
            languages: ['en'],
            context: {
                country: 'us',
                region: 'dc'
            }
        });
    }, 'dedupe runs without err');

    t.doesNotThrow(() => {
        fs.accessSync('/tmp/dedupeout.geojson');
    }, 'output exists');

    const rl = new ReadLine('/tmp/dedupeout.geojson');

    const output = {};

    let line = rl.next();
    while (line) {
        line = JSON.parse(line);

        output[line.id] = line;
        line = rl.next();
    }

    t.deepEquals(Object.keys(output), [
        '2', '7', '8' // ID 2,7 & 8 should be deleted (leaving 1) (duplicate geom/number/street)
        // ID 3 & 4 should be ignored - duplicate number/street but not geom
        // ID 5 & 6 should be ignored - duplicate street/geom - 123 vs 123a for number
    ], 'output ids as expected');

    t.deepEquals(output[2], {
        id: 2,
        version: 0,
        type: 'Feature',
        action: 'delete',
        properties: {
            number: '123',
            source: 'random',
            street: [{ display: 'Main St', priority: -1 }]
        },
        geometry: {
            type: 'Point',
            coordinates: [-77.481846213, 37.500529520]
        }
    }, 'feature 2');

    t.deepEquals(output[7], {
        id: 7,
        version: 0,
        type: 'Feature',
        action: 'delete',
        properties: {
            number: '123',
            source: 'openaddresses',
            random: 'property',
            street: [{ display: 'Main St', priority: -1 }]
        },
        geometry: {
            type: 'Point',
            coordinates: [-77.481846213, 37.500529520]
        }
    }, 'feature 7');

    t.deepEquals(output[8], {
        id: 8,
        version: 0,
        type: 'Feature',
        action: 'delete',
        properties: {
            number: '123',
            source: 'openaddresses',
            random: 'property',
            street: [{ display: 'Main St', priority: -1 }]
        },
        geometry: {
            type: 'Point',
            coordinates: [-77.481846213, 37.500529520]
        }
    }, 'feature 8');

    t.end();
});
