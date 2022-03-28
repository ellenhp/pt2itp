'use strict';

const worker = require('../lib/map');
const exec = require('child_process').exec;
const fs = require('fs');

const spawn = require('tape-spawn');
const csv = require('fast-csv');
const test = require('tape');
const path = require('path');

const database = 'pt_test';
const carmenIndex = '/tmp/test-ri.mbtiles';
const output = '/tmp/test-ri.err';
const config = path.resolve(__dirname, './fixtures/test-ri/carmen-config.json');

const db = require('./lib/db');
db.init(test);

// loads address and network data into postgres
test('load address and network files', (t) => {
    worker({
        'in-address': path.resolve(__dirname, './fixtures/test-ri/address.geojson'),
        'in-network': path.resolve(__dirname, './fixtures/test-ri/network.geojson'),
        output: '/tmp/itp.geojson',
        debug: true,
        db: database,
        languages: 'en'
    }, (err) => {
        t.ifError(err);
        t.end();
    });
});

// make sure to delete /tmp/test-ri.* before running indexer
test('clean up any previous database files', (t) => {
    exec('rm -rf /tmp/test-ri.*', (err) => {
        t.ifError(err);
        if (fs.existsSync('/tmp/test-ri.mbtiles')) {
            t.equal(fs.existsSync('/tmp/test-ri.mbtiles'), false, 'cleans up test-ri.mbtiles');
        }
        t.end();
    });
});

// step 2: create index file for test mode
// cat <geojson> | carmen-index --config=${config} --index=${carmenIndex}
test('create index from geojson', (t) => {
    exec(`cat /tmp/itp.geojson | ${__dirname}/../node_modules/.bin/carmen-index --config=${config} --index=${carmenIndex}`, (err) => {
        t.ifError(err);
        t.equal(fs.existsSync('/tmp/test-ri.mbtiles'), true, 'creates test-ri.mbtiles');
        t.end();
    });
});

test('query from new index', (t) => {
    exec(`${__dirname}/../node_modules/.bin/carmen --query "5 Greenview Rd" ${carmenIndex} --geojson | grep -v "No debug"`, (err, res) => {
        t.ifError(err);
        const result = JSON.parse(res);
        const feature = result.features[0];
        t.equal(feature.text, 'Greenview Rd', 'Finds 5 Greenview Rd');
        t.equal(feature.address, '5', 'Finds 5 Greenview Rd');
        t.end();
    });
});

// step 3: run test mode against the built index
test('test', (t) => {
    exec(`${__dirname}/../index.js test --config=${config} --index=${carmenIndex} --db=${database} -o ${output} --languages en`, () => {
        t.test('Return correct error messages in csv', (t) => {
            const csvErrs = [];

            csv.parseFile(output, { headers: true })
                .on('data', (data) => {
                    csvErrs.push(data);
                }).on('end', () => {
                    t.equal(csvErrs.length, 1);
                    t.equal(csvErrs.filter((ele) => ele['addr text'] === 'greeeeeenview')[0].error, 'NAME MISMATCH (SOFT)');
                    t.end();
                });
        });
    });
});

test('testcsv', (t) => {
    t.test('Return correct std.err message', (t) => {
        const st = spawn(t, `${__dirname}/../index.js testcsv --index ${carmenIndex} --input ${path.resolve(__dirname, './fixtures/test-ri/address.csv')} --output '/tmp/testcsv-ri.err' --config ${config}`);
        st.stderr.match(`
            ERROR TYPE                   COUNT
            -----------------------------------------------------------------------------------
            DIST                             9 ( 75.0% of errors | 27.3% of total addresses)
            NO RESULTS                       3 ( 25.0% of errors |  9.1% of total addresses)

            ok - 12/33 (36.4%) failed to geocode
            ok - 0/0 (NaN%) ITP results failed to geocode

            DIST statistical breakdown
            -----------------------------------------------------------------------------------
            DIST - mean: 5350.28 / median: 1345.38 / skew: 0.84 / standard dev: 6290.83
        `.replace(/^ +/mg, ''));
        st.end();
    });

    t.test('Return correct error messages in csv', (t) => {
        const csvErrs = [];

        csv.parseFile('/tmp/testcsv-ri.err', { headers: true })
            .on('data', (data) => { csvErrs.push(data); })
            .on('end', () => {
                t.equal(csvErrs.length, 9);
                t.equal(csvErrs.filter((ele) => ele.query === '26 Greenview Rd')[0].error, 'DIST');
                t.equal(csvErrs.filter((ele) => ele.query === '31 Greenview Rd')[0].error, 'DIST');
                t.equal(csvErrs.filter((ele) => ele.query === '34 grn vw rd')[0].error, 'NO RESULTS');
                t.equal(csvErrs.filter((ele) => ele.query === '40 Greeeeeenview Rd')[0].error, 'DIST');
                t.end();
            });
    });
});
