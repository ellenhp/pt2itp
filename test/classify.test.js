'use strict';

const fs = require('fs');
const test = require('tape');
const classify = require('../index').classify;
const ReadLine = require('n-readlines');

const db = require('./lib/db');
db.init(test);

test('classify (dataset)', (t) => {
    try {
        fs.unlinkSync('/tmp/classifyout.geojson');
    } catch (err) {
        console.log('ok - no tmp files to clear');
    }

    t.doesNotThrow(() => {
        classify({
            db: 'pt_test',
            input: './test/fixtures/classify.geojson',
            output: '/tmp/classifyout.geojson',
            parcels: './test/fixtures/classify_parcels.geojson',
            buildings: './test/fixtures/classify_buildings.geojson'
        });
    }, 'classify runs without err');

    t.doesNotThrow(() => {
        fs.accessSync('/tmp/classifyout.geojson');
    }, 'output exists');

    const rl = new ReadLine('/tmp/classifyout.geojson');
    let line = rl.next();
    while (line) {
        line = JSON.parse(line);

        t.equals(line.properties.expected, line.properties.accuracy);
        line = rl.next();
    }

    t.end();
});

test('classify (hecate)', (t) => {
    try {
        fs.unlinkSync('/tmp/classifyout.geojson');
    } catch (err) {
        console.log('ok - no tmp files to clear');
    }

    t.doesNotThrow(() => {
        classify({
            db: 'pt_test',
            hecate: true,
            input: './test/fixtures/classify_hecate.geojson',
            output: '/tmp/classifyout.geojson',
            parcels: './test/fixtures/classify_parcels.geojson',
            buildings: './test/fixtures/classify_buildings.geojson'
        });
    }, 'classify runs without err');

    t.doesNotThrow(() => {
        fs.accessSync('/tmp/classifyout.geojson');
    }, 'output exists');

    const rl = new ReadLine('/tmp/classifyout.geojson');

    const output = {};
    let line = rl.next();
    while (line) {
        line = JSON.parse(line);

        output[line.id] = line;
        line = rl.next();
    }

    t.deepEquals(output[0], undefined);

    t.deepEquals(output[1], {
        id: 1,
        version: 0,
        type: 'Feature',
        action: 'modify',
        properties: {
            accuracy: 'rooftop',
            expected: 'rooftop',
            number: 1,
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [-79.376625717, 38.834171066]
        }
    });

    t.deepEquals(output[2], undefined);

    t.deepEquals(output[3], {
        id: 3,
        version: 0,
        type: 'Feature',
        action: 'modify',
        properties: {
            accuracy: 'rooftop',
            expected: 'rooftop',
            number: 3,
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [-79.377041459, 38.833949595]
        }
    });

    t.deepEquals(output[4], {
        id: 4,
        version: 0,
        type: 'Feature',
        action: 'modify',
        properties: {
            accuracy: 'rooftop',
            expected: 'rooftop',
            number: 4,
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [-79.376877844, 38.834448948]
        }
    });

    t.deepEquals(output[5], {
        id: 5,
        version: 0,
        type: 'Feature',
        action: 'modify',
        properties: {
            accuracy: 'rooftop',
            expected: 'rooftop',
            number: 5,
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [-79.376856387, 38.834377911]
        }
    });

    t.deepEquals(output[6], undefined);

    t.deepEquals(output[7], {
        id: 7,
        version: 0,
        type: 'Feature',
        action: 'modify',
        properties: {
            accuracy: 'parcel',
            expected: 'parcel',
            number: 7,
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [-79.376530498, 38.833649772]
        }
    });

    t.deepEquals(output[8], {
        id: 8,
        version: 0,
        type: 'Feature',
        action: 'modify',
        properties: {
            accuracy: 'point',
            expected: 'point',
            number: 8,
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [-79.405145645, 38.839105927]
        }
    });

    t.deepEquals(output[9], {
        id: 9,
        version: 0,
        type: 'Feature',
        action: 'modify',
        properties: {
            accuracy: 'point',
            expected: 'point',
            number: 9,
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [-79.405488968, 38.834425965]
        }
    });

    t.end();
});

test('classify (escaping)', (t) => {
    try {
        fs.unlinkSync('/tmp/classifyout.geojson');
    } catch (err) {
        console.log('ok - no tmp files to clear');
    }

    t.doesNotThrow(() => {
        classify({
            db: 'pt_test',
            hecate: true,
            input: './test/fixtures/classify_hecate.geojson',
            output: '/tmp/classifyout.geojson',
            parcels: './test/fixtures/classify_parcels_escaping.geojson'
        });
    }, 'classify runs without err');

    t.doesNotThrow(() => {
        fs.accessSync('/tmp/classifyout.geojson');
    }, 'output exists');

    t.end();
});
