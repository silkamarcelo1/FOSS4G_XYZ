const { Client } = require('pg');
const DBS = {};
Object.keys(process.env).map(function (key) {
    if (key.split('_')[0] === 'DBS') {
        DBS[key.split('_')[1]] = new Client({ connectionString: process.env[key] });
        DBS[key.split('_')[1]].connect();
    }
});

function select(req, res) {

    let fields = '';
    Object.keys(req.body.infoj).map(key => {
        if (req.body.infoj[key].type === 'integer') {
            fields += req.body.infoj[key].field + '::' + req.body.infoj[key].type + ' AS ' + req.body.infoj[key].field + ',';
        }
        if (req.body.infoj[key].type === 'text') {
            fields += req.body.infoj[key].field + '::' + req.body.infoj[key].type + ' AS ' + req.body.infoj[key].field + ',';
        }
    });

    let q =
    `SELECT
        ${fields}
        ${req.body.geomj} AS geomj
        ${req.body.displayGeom}
     FROM ${req.body.table}
     WHERE
        ${req.body.qID} = '${req.body.id}';`

    console.log(q);

    DBS[req.body.dbs].query(q)
        .then(result => {

            // Object.keys(result.rows[0]).map(key => {
            //     if (req.body.infoj[key]) {
            //         req.body.infoj[key].value = result.rows[0][key];
            //     }
            // });

            Object.keys(req.body.infoj).map(key => {
                if (result.rows[0][req.body.infoj[key].field]) {
                    req.body.infoj[key].value = result.rows[0][req.body.infoj[key].field];
                }
            });

            res.status(200).json({
                geomj: result.rows[0].geomj,
                infoj: req.body.infoj
            });

        })
    .catch(err => console.log(err));
}

module.exports = {
    select: select
};