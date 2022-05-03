'use strict';

const pg_optimize = require('../native/index.node').pg_optimize;
const {
    cluster_addr,
    cluster_net
} = require('../native/index.node');

const test = require('tape');
const Queue = require('d3-queue').queue;

const db = require('./lib/db');

db.init(test);

test('Points are clustered on netid', (t) => {
    const popQ = new Queue(1);

    const pool = db.get();

    // POPULATE ADDRESS
    popQ.defer((done) => {
        pool.query(`
            BEGIN;
            INSERT INTO address (id, netid, names, number, geom) VALUES (1, 1, '[{ "tokenized": [{ "token": "main", "token_type": null }, { "token": "st", "token_type": "Way" }], "display": "Main Street", "priority": 0, "freq": 1 }]', 10, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point","coordinates": [9.505233765,47.130184332 ] }'), 4326));
            INSERT INTO address (id, netid, names, number, geom) VALUES (2, 1, '[{ "tokenized": [{ "token": "main", "token_type": null }, { "token": "st", "token_type": "Way" }], "display": "Main Street", "priority": 0, "freq": 1 }]', 10, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point","coordinates": [9.523429871,47.130797461 ] }'), 4326));
            COMMIT;
        `, (err) => {
            t.error(err);

            pg_optimize();

            return done();
        });
    });

    popQ.defer((done) => {
        cluster_addr('pt_test');

        done();
    });

    popQ.await((err) => {
        t.error(err);

        pool.query(`
            SELECT
                ST_AsGeoJSON(geom)::JSON AS geom,
                names
            FROM
                address_cluster;
        `, (err, res) => {
            t.error(err);
            t.deepEquals(res.rows[0].geom, { type: 'MultiPoint', coordinates: [[9.505233765,47.130184332,1],[9.523429871,47.130797461,2]] });
            t.deepEquals(res.rows[0].names, [{ freq: 2, display: 'Main Street', priority: 0, tokenized: [{ token: 'main', token_type: null }, { token: 'st', token_type: 'Way' }] }]);

            pool.end(() => {
                t.end();
            });
        });
    });
});

db.init(test);

test('LineStrings far away should not be clustered', (t) => {
    const pool = db.get();

    const popQ = new Queue(1);

    // POPULATE NETWORK
    popQ.defer((done) => {
        pool.query(`
            BEGIN;
            INSERT INTO network (id, names, geom) VALUES (1, '[{ "tokenized": "main st", "tokeneless": "main", "display": "Main Street", "freq": 1 }]', ST_SetSRID(ST_GeomFromGeoJSON('{"type": "MultiLineString", "coordinates": [[[9.505147934,47.130271922],[9.500942230,47.130271922]]]}'), 4326));
            INSERT INTO network (id, names, geom) VALUES (2, '[{ "tokenized": "main st", "tokeneless": "main", "display": "Main Street", "freq": 1 }]', ST_SetSRID(ST_GeomFromGeoJSON('{"type": "MultiLineString", "coordinates": [[[9.523429871,47.130841256],[9.527077675,47.130914247]]]}'), 4326));
            COMMIT;
        `, (err) => {
            t.error(err);

            pg_optimize();

            return done();
        });
    });

    popQ.defer((done) => {
        cluster_net('pt_test');

        done();
    });

    popQ.await((err) => {
        t.error(err);

        pool.query(`
            SELECT
                ST_AsGeoJSON(geom)::JSON as geom,
                names
            FROM
                network_cluster
            ORDER BY
                id
        `, (err, res) => {
            t.error(err);
            t.deepEquals(res.rows[0].geom, { type: 'MultiLineString', coordinates: [[[9.505147934, 47.130271922], [9.500942230, 47.130271922]]] });
            t.deepEquals(res.rows[0].names, [{ freq: 1, display: 'Main Street', tokenized: 'main st', tokeneless: 'main' }]);

            t.deepEquals(res.rows[1].geom, { type: 'MultiLineString', coordinates: [[[9.523429871, 47.130841256], [9.527077675, 47.130914247]]] });
            t.deepEquals(res.rows[1].names, [{ freq: 1, display: 'Main Street', tokenized: 'main st', tokeneless: 'main' }]);

            pool.end(() => {
                t.end();
            });
        });
    });
});

db.init(test);

test('LinesStrings should be clustered', (t) => {
    const pool = db.get();
    const popQ = new Queue(1);

    // POPULATE ADDRESS
    popQ.defer((done) => {
        pool.query(`
            BEGIN;
            INSERT INTO network (id, names, geom) VALUES (1, '[{ "tokenized": "main st", "tokeneless": "main", "display": "Main Street", "freq": 1 }]', ST_SetSRID(ST_GeomFromGeoJSON('{"type": "MultiLineString","coordinates": [[[9.516735077,47.132768186],[9.519824982,47.132870370]]]}'), 4326));
            INSERT INTO network (id, names, geom) VALUES (2, '[{ "tokenized": "main st", "tokeneless": "main", "display": "Main Street", "freq": 1 }]', ST_SetSRID(ST_GeomFromGeoJSON('{"type": "MultiLineString", "coordinates": [[[9.513999224,47.132695198],[9.512518644,47.132695198]]]},'), 4326));
            COMMIT;
        `, (err) => {
            t.error(err);

            pg_optimize();

            return done();
        });
    });

    popQ.defer((done) => {
        cluster_net('pt_test');
        done();
    });

    popQ.await((err) => {
        t.error(err);

        pool.query(`
            SELECT
                ST_AsGeoJSON(geom)::JSON as geom,
                names
            FROM
                network_cluster
            ORDER BY
                id DESC;
        `, (err, res) => {
            t.error(err);

            t.deepEquals(res.rows[0].geom, { type: 'MultiLineString', coordinates: [[[9.516735077, 47.132768186], [9.519824982, 47.132870370]], [[9.513999224, 47.132695198], [9.512518644, 47.132695198]]] });
            t.deepEquals(res.rows[0].names, [{ freq: 1, display: 'Main Street', tokenized: 'main st', tokeneless: 'main' }]);
            pool.end(() => {
                t.end();
            });
        });
    });
});

db.init(test);
