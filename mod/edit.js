async function newRecord(req, res) {

    let q,
        table = req.body.table,
        geometry = JSON.stringify(req.body.geometry),
        qID = typeof req.body.qID == 'undefined' ? 'id' : req.body.qID,
        id = req.body.id;

    // Check whether string params are found in the settings to prevent SQL injections.
    if (await require('./chk').chkVals([table, qID], res).statusCode === 406) return;

    if (await require('./chk').chkID(id, res).statusCode === 406) return;

    q = `
    INSERT INTO ${table} (geom)
        SELECT ST_SetSRID(ST_GeomFromGeoJSON('${geometry}'), 4326) AS geom
    RETURNING id;`;

    //console.log(q);

    let result = await global.DBS[req.body.dbs].query(q);

    q = `
    UPDATE ${table} SET
        ${qID} = '${result.rows[0].id}'
    WHERE id = '${result.rows[0].id}';`;

    //console.log(q);

    await global.DBS[req.body.dbs].query(q);

    res.status(200).send(result.rows[0].id.toString());
}

async function newAggregate(req, res) {

    let table_target = req.query.table_target,
        table_source = req.query.table_source,
        geom_target = req.query.geom_target === 'undefined' ? 'geom' : req.query.geom_target,
        geom_source = req.query.geom_source === 'undefined' ? 'geom' : req.query.geom_source,
        //filter = JSON.parse(req.query.filter),
        filter_sql = '';

    // Check whether string params are found in the settings to prevent SQL injections.
    if (await require('./chk').chkVals([table_target, table_source, geom_target, geom_source], res).statusCode === 406) return;

    // if (await require('./chk').chkID(id, res).statusCode === 406) return;

    let q = `
    INSERT INTO ${table_target} (${geom_target})
    SELECT (
        SELECT
        ST_Transform(
            ST_SetSRID(
            ST_Buffer(
                ST_Transform(
                ST_SetSRID(
                    ST_Extent(${geom_source}),
                4326),
                3857),
                ST_Distance(
                ST_Transform(
                    ST_SetSRID(
                    ST_Point(
                        ST_XMin(ST_Envelope(ST_Extent(${geom_source}))),
                        ST_YMin(ST_Envelope(ST_Extent(${geom_source})))),
                    4326),
                3857),
                ST_Transform(
                    ST_SetSRID(
                    ST_Point(
                        ST_XMax(ST_Envelope(ST_Extent(${geom_source}))),
                        ST_Ymin(ST_Envelope(ST_Extent(${geom_source})))),
                    4326),
                3857)
                ) * 0.1),
            3857),
        4326) AS ${geom_target}
        FROM ${table_source}
        WHERE true ${filter_sql}
    )
    RETURNING id;`;

    console.log(q);

    let result = await global.DBS[req.query.dbs].query(q);

    res.status(200).send(result.rows[0].id.toString());
}

async function updateRecord(req, res) {

    let q,
        table = req.body.table,
        geometry = JSON.stringify(req.body.geometry),
        qID = typeof req.body.qID == 'undefined' ? 'id' : req.body.qID,
        id = req.body.id
        fields = '';

    // Check whether string params are found in the settings to prevent SQL injections.
    if (await require('./chk').chkVals([table, qID], res).statusCode === 406) return;

    if (await require('./chk').chkID(id, res).statusCode === 406) return;

    Object.values(req.body.infoj).forEach(entry => {
        if (entry.images) return
        if (entry.type === 'text') fields += `${entry.field} = '${entry.value}',`;
        if (entry.type === 'integer' && entry.value) fields += `${entry.field} = ${entry.value},`
        if (entry.subfield && entry.subvalue) fields += `${entry.subfield} = '${entry.subvalue}',`
    });

    q = `
    UPDATE ${table} SET
        ${fields}
        geom = ST_SetSRID(ST_GeomFromGeoJSON('${geometry}'), 4326)
    WHERE ${qID} = $1;`

    //console.log(q);
             
    global.DBS[req.body.dbs].query(q, [id])
        .then(result =>  res.status(200).send())
        .catch(err => console.error(err));
}

async function deleteRecord(req, res) {

    let q,
        table = req.body.table,
        qID = typeof req.body.qID == 'undefined' ? 'id' : req.body.qID,
        id = req.body.id;

    // Check whether string params are found in the settings to prevent SQL injections.
    if (await require('./chk').chkVals([table, qID], res).statusCode === 406) return;

    if (await require('./chk').chkID(id, res).statusCode === 406) return;

    q = `
    DELETE FROM ${table}
    WHERE ${qID} = $1`;

    //console.log(q);
             
    global.DBS[req.body.dbs].query(q, [id])
        .then(result => res.status(200).send())
        .catch(err => console.error(err));
}

module.exports = {
    newRecord: newRecord,
    newAggregate: newAggregate,
    updateRecord: updateRecord,
    deleteRecord: deleteRecord
};