'use strict';

const pg_optimize = require('../native/index.node').pg_optimize;
const {
    cluster_net,
    cluster_addr
} = require('../native/index.node');

const test = require('tape');
const Queue = require('d3-queue').queue;

const db = require('./lib/db');

db.init(test);

test('cluster.address', (t) => {
    const pool = db.get();
    const popQ = new Queue(1);

    // POPULATE ADDRESS
    popQ.defer((done) => {
        pool.query(`
            BEGIN;

            INSERT INTO address (id, names, number, geom, netid) VALUES (1, '[{ "tokenized": [{ "token": "main", "token_type": null }, { "token": "st", "token_type": "Way" }], "display": "Main Street", "priority": 0, "freq": 1 }]', 10, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [-66.97265625,43.961190639] }'), 4326), 1);
            INSERT INTO address (id, names, number, geom, netid) VALUES (2, '[{ "tokenized": [{ "token": "main", "token_type": null }, { "token": "st", "token_type": "Way" }], "display": "Main Street", "priority": 0, "freq": 1 }]', 10, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [-66.97265625,43.961190639] }'), 4326), 1);
            INSERT INTO address (id, names, number, geom, netid) VALUES (3, '[{ "tokenized": [{ "token": "main", "token_type": null }, { "token": "st", "token_type": "Way" }], "display": "Main Street", "priority": 0, "freq": 1 }]', 13, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [-105.46875,56.365250137] }'), 4326), 3);
            INSERT INTO address (id, names, number, geom, netid) VALUES (4, '[{ "tokenized": [{ "token": "main", "token_type": null }, { "token": "st", "token_type": "Way" }], "display": "Main Street", "priority": 0, "freq": 1 }]', 13, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [-105.46875,56.365250137] }'), 4326), 3);
            INSERT INTO address (id, names, number, geom, netid) VALUES (5, '[{ "tokenized": [{ "token": "fake", "token_type": null }, { "token": "av", "token_type": "Way" }], "display": "Fake Avenue", "priority": 0, "freq": 1 }]', 10, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [-85.25390625,52.908902048] }'), 4326), 2);
            INSERT INTO address (id, names, number, geom, netid) VALUES (6, '[{ "tokenized": [{ "token": "main", "token_type": null }, { "token": "st", "token_type": "Way" }], "display": "Main Street", "priority": 0, "freq": 1 }]', 10, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [-66.97265625,43.961190639] }'), 4326), 1);

            COMMIT;
        `, (err) => {
            t.error(err, 'no errors');

            pg_optimize();

            return done();
        });
    });

    popQ.defer((done) => {
        cluster_addr('pt_test');

        done();
    });

    popQ.defer((done) => {
        pool.query(`
            SELECT
                names,
                ST_AsGeoJSON(geom)::JSON AS geom
            FROM
                address_cluster
            ORDER BY
                ST_NumGeometries(geom);
        `, (err, res) => {
            t.error(err, 'no errors');

            t.equals(res.rows.length, 3);
            t.deepEquals(res.rows[0], { geom: { type: 'MultiPoint','coordinates':[[-85.25390625,52.908902048,5]] }, names: [{ freq: 1, tokenized: [{ token: 'fake', token_type: null }, { token: 'av', token_type: 'Way' }], display: 'Fake Avenue', priority: 0 }] });
            t.deepEquals(res.rows[1], { geom: { 'type':'MultiPoint','coordinates':[[-105.46875,56.365250137,3],[-105.46875,56.365250137,4]] }, names: [{ freq: 2, tokenized: [{ token: 'main', token_type: null }, { token: 'st', token_type: 'Way' }], display: 'Main Street', priority: 0 }] });
            t.deepEquals(res.rows[2], { geom: { coordinates: [[-66.97265625, 43.961190639, 1], [-66.97265625, 43.961190639, 2], [-66.97265625, 43.961190639, 6]], type: 'MultiPoint' }, names: [{ freq: 3, tokenized: [{ token: 'main', token_type: null }, { token: 'st', token_type: 'Way' }], display: 'Main Street', priority: 0 }] });

            return done();
        });
    });

    popQ.await((err) => {
        t.error(err, 'no errors');

        pool.end(() => {
            t.end();
        });
    });
});

db.init(test);

test('cluster.address - order synonyms by address count', (t) => {
    const pool = db.get();
    const popQ = new Queue(1);

    popQ.defer((done) => {
        pool.query(`
            BEGIN;

            INSERT INTO address (id, names, number, netid, geom) VALUES (21, '[{ "tokenized": [{ "token": "mill", "token_type": null }, { "token": "st", "token_type": "Way" }, { "token": "nw", "token_type": "Cardinal" }], "display": "Mill Street NW", "priority": 0, "freq": 1 }]', 12, 20, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [ -85.410568714, 41.800511124 ] }'), 4326));
            INSERT INTO address (id, names, number, netid, geom) VALUES (22, '[{ "tokenized": [{ "token": "mill", "token_type": null }, { "token": "st", "token_type": "Way" }, { "token": "nw", "token_type": "Cardinal" }], "display": "Mill Street NW", "priority": 0, "freq": 1 }]', 13, 20, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [ -85.410547256, 41.801102975 ] }'), 4326));

            INSERT INTO address (id, names, number, netid, geom) VALUES (23, '[{ "tokenized": [{ "token": "r", "token_type": null }, { "token": "st", "token_type": "Way" }, { "token": "nw", "token_type": "Cardinal" }], "display": "R Street NW", "priority": 0, "freq": 1 }]', 10, 20, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [ -85.418164730, 41.801022996 ] }'), 4326));
            INSERT INTO address (id, names, number, netid, geom) VALUES (24, '[{ "tokenized": [{ "token": "r", "token_type": null }, { "token": "st", "token_type": "Way" }, { "token": "nw", "token_type": "Cardinal" }], "display": "R Street NW", "priority": 0, "freq": 1 }]', 11, 20, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [ -85.417242050, 41.801038992 ] }'), 4326));
            INSERT INTO address (id, names, number, netid, geom) VALUES (25, '[{ "tokenized": [{ "token": "r", "token_type": null }, { "token": "st", "token_type": "Way" }, { "token": "nw", "token_type": "Cardinal" }], "display": "R Street NW", "priority": 0, "freq": 1 }]', 12, 20, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [ -85.415997505, 41.801166959 ] }'), 4326));


            COMMIT;
        `, (err) => {
            t.error(err, 'no errors');

            pg_optimize();

            return done();
        });
    });

    popQ.defer((done) => {
        cluster_addr('pt_test');
        done();
    });

    popQ.defer((done) => {
        // check that text has r st, then mill st
        pool.query(`
            SELECT
                id,
                names
            FROM
                address_cluster
            ORDER BY
                id;
        `, (err, res) => {
            t.error(err, 'no errors');

            t.equals(res.rows.length, 1, 'one address cluster');

            t.deepEquals(res.rows[0].names, [{
                display: 'R Street NW',
                tokenized: [{ token: 'r', token_type: null }, { token: 'st', token_type: 'Way' }, { token: 'nw', token_type: 'Cardinal' }],
                freq: 3,
                priority: 0
            },{
                display: 'Mill Street NW',
                tokenized: [{ token: 'mill', token_type: null }, { token: 'st', token_type: 'Way' }, { token: 'nw', token_type: 'Cardinal' }],
                freq: 2,
                priority: 0
            }], 'address cluster text ordered by number of addresses');

            return done();
        });
    });

    popQ.await((err) => {
        t.error(err, 'no errors');
        pool.end(() => {
            t.end();
        });
    });
});

db.init(test);

test('cluster.network', (t) => {
    const pool = db.get();
    const popQ = new Queue(1);

    // POPULATE NETWORK
    popQ.defer((done) => {
        pool.query(`
            BEGIN;
            INSERT INTO network (names, geom) VALUES ('[{ "tokenized": [{ "token": "main", "token_type": null }, { "token": "st", "token_type": "Way" }], "display": "Main Street", "freq": 1, "priority": 0 }]', ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "MultiLineString", "coordinates": [ [ [ -66.053903103, 45.269616328 ], [ -66.054418087, 45.271035833 ] ] ]}'), 4326));
            INSERT INTO network (names, geom) VALUES ('[{ "tokenized": [{ "token": "main", "token_type": null }, { "token": "st", "token_type": "Way" }], "display": "Main Street", "freq": 1, "priority": 0 }]', ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "MultiLineString", "coordinates": [ [ [ -66.054353714, 45.271005631 ], [ -66.054933071, 45.272455302 ] ] ]}'), 4326));
            INSERT INTO network (names, geom) VALUES ('[{ "tokenized": [{ "token": "main", "token_type": null }, { "token": "st", "token_type": "Way" }], "display": "Main Street", "freq": 1, "priority": 0 }]', ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "MultiLineString", "coordinates": [ [ [ -113.501172066, 53.551374138 ], [ -113.501129150, 53.548365493 ] ] ]}'), 4326));
            INSERT INTO network (names, geom) VALUES ('[{ "tokenized": [{ "token": "main", "token_type": null }, { "token": "st", "token_type": "Way" }], "display": "Main Street", "freq": 1, "priority": 0 }]', ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "MultiLineString", "coordinates": [ [ [ -113.501000404, 53.548365493 ], [ -113.501043321, 53.546147118 ] ] ]}'), 4326));
            COMMIT;
        `, (err) => {
            t.error(err, 'no errors');

            pg_optimize();

            return done();
        });
    });

    popQ.defer((done) => {
        cluster_net('pt_test');
        done();
    });

    popQ.defer((done) => {
        pool.query(`
            SELECT
                id,
                names,
                ST_AsGeoJSON(geom)::JSON AS geom,
                source_ids
            FROM
                network_cluster
            ORDER BY
                id ASC;
        `, (err, res) => {
            t.error(err, 'no errors');

            t.equals(res.rows.length, 2);

            res.rows.sort((a, b) => {
                if (a.source_ids[0] < b.source_ids[0]) return -1;
                else if (a.source_ids[0] > b.source_ids[0]) return 1;
                else return 0;
            });

            t.deepEquals(res.rows[0], {
                id: 2,
                names: [{
                    freq: 1,
                    tokenized: [{ token: 'main', token_type: null }, { token: 'st', token_type: 'Way' }],
                    display: 'Main Street',
                    priority: 0
                }],
                geom: {
                    type: 'MultiLineString',
                    coordinates: [[[-66.053903103, 45.269616328], [-66.054418087, 45.271035833]], [[-66.054353714, 45.271005631], [-66.054933071, 45.272455302]]]
                },
                source_ids: ['1', '2']
            });

            t.deepEquals(res.rows[1], {
                id: 1,
                geom: {
                    type: 'MultiLineString',
                    coordinates: [[[-113.501172066, 53.551374138], [-113.501129150, 53.548365493]], [[-113.501000404, 53.548365493], [-113.501043321, 53.546147118]]]
                },
                names: [{
                    freq: 1,
                    tokenized: [{ token: 'main', token_type: null }, { token: 'st', token_type: 'Way' }],
                    display: 'Main Street',
                    priority: 0
                }],
                source_ids: ['3', '4']
            });


            return done();
        });
    });

    popQ.await((err) => {
        t.error(err, 'no errors');
        pool.end(() => {
            t.end();
        });
    });
});

db.init(test);
