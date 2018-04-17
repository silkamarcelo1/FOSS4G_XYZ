const turf = require('@turf/turf');

async function cluster(req, res) {
  
  let
    table = req.query.table,
    id = req.query.qID === 'undefined' ? null : req.query.qID,
    geom = req.query.geom === 'undefined' ? 'geom' : req.query.geom,
    cat = req.query.cat === 'undefined' ? null : req.query.cat,
    theme = req.query.theme === 'undefined' ? null : req.query.theme,
    canvas = parseInt(req.query.canvas),
    kmeans = parseFloat(req.query.kmeans),
    dbscan = parseFloat(req.query.dbscan * canvas / 1000000),
    west = parseFloat(req.query.west),
    south = parseFloat(req.query.south),
    east = parseFloat(req.query.east),
    north = parseFloat(req.query.north),
    xDegree = turf.distance([west, north], [east, south], { units: 'degrees' });

  // Check whether string params are found in the settings to prevent SQL injections.
  if (await require('./chk').chkVals([table, id, geom, cat], res).statusCode === 406) return;

  // Query the feature count from lat/lng bounding box.
  let q = `
    SELECT count(1)
    FROM ${table}
    WHERE
      ST_DWithin(
        ST_MakeEnvelope(${west}, ${north}, ${east}, ${south}, 4326),
        ${geom},
        0.00001);`;

  let result = await global.DBS[req.query.dbs].query(q);

  if (parseInt(result.rows[0].count) === 0) {
    res.status(204).json({});
    return
  }

  // Use feature count with cross distance  to determine the kmeans factor.
  kmeans = parseInt(xDegree * kmeans * canvas / 1000000) < parseInt(result.rows[0].count) ?
    parseInt(xDegree * kmeans * canvas / 1000000) :
    parseInt(result.rows[0].count);

  // console.log({
  //   'kmeans': kmeans,
  //   'dbscan': dbscan,
  //   'canvas': canvas,
  //   'xDegree': xDegree
  // });

  if (!theme) q = `
  SELECT
    COUNT(geom) count,
    ST_AsGeoJson(ST_PointOnSurface(ST_Union(geom))) geomj
  FROM (
    SELECT
      kmeans_cid,
      ${geom} AS geom,
      ST_ClusterDBSCAN(${geom}, ${xDegree * dbscan}, 1) OVER (PARTITION BY kmeans_cid) dbscan_cid
    FROM (
      SELECT
        ST_ClusterKMeans(${geom}, ${kmeans}) OVER () kmeans_cid,
        ${geom}
      FROM ${table}
      WHERE
        ST_DWithin(
          ST_MakeEnvelope(${west}, ${north}, ${east}, ${south}, 4326),
        ${geom}, 0.00001)
    ) kmeans
  ) dbscan GROUP BY kmeans_cid, dbscan_cid;`

  if (theme === 'categorized') q = `
  SELECT
    SUM(count)::integer count,
    JSON_Agg(JSON_Build_Object(cat, count)) cat,
    ST_AsGeoJson(ST_PointOnSurface(ST_Union(geom))) geomj
  FROM (
    SELECT
      COUNT(cat) count,
      ST_Union(geom) geom,
      cat,
      kmeans_cid,
      dbscan_cid
    FROM (
      SELECT
        id,
        cat,
        kmeans_cid,
        ${geom} AS geom,
        ST_ClusterDBSCAN(${geom}, ${xDegree * dbscan}, 1) OVER (PARTITION BY kmeans_cid) dbscan_cid
      FROM (
        SELECT
          ${id} AS id,
          ${cat} AS cat,
          ST_ClusterKMeans(${geom}, ${kmeans}) OVER () kmeans_cid,
          ${geom}
        FROM ${table}
        WHERE
          ST_DWithin(
            ST_MakeEnvelope(${west}, ${north}, ${east}, ${south}, 4326),
          ${geom}, 0.00001)
      ) kmeans
    ) dbscan GROUP BY kmeans_cid, dbscan_cid, cat
  ) cluster GROUP BY kmeans_cid, dbscan_cid;`

  if (theme === 'graduated') q = `
  SELECT
    COUNT(cat) count,
    SUM(cat) sum,
    ST_AsGeoJson(ST_PointOnSurface(ST_Union(geom))) geomj
  FROM (
    SELECT
      id,
      cat,
      kmeans_cid,
      ${geom} AS geom,
      ST_ClusterDBSCAN(${geom}, ${xDegree * dbscan}, 1) OVER (PARTITION BY kmeans_cid) dbscan_cid
    FROM (
      SELECT
        ${id} AS id,
        ${cat} AS cat,
        ST_ClusterKMeans(${geom}, ${kmeans}) OVER () kmeans_cid,
        ${geom}
      FROM ${table}
      WHERE
        ST_DWithin(
          ST_MakeEnvelope(${west}, ${north}, ${east}, ${south}, 4326),
        ${geom}, 0.00001)
    ) kmeans
  ) dbscan GROUP BY kmeans_cid, dbscan_cid;`

  //console.log(q);

  result = await global.DBS[req.query.dbs].query(q);

  if (!theme) res.status(200).json(Object.keys(result.rows).map(record => {
    return {
      type: 'Feature',
      geometry: JSON.parse(result.rows[record].geomj),
      properties: {
        count: result.rows[record].count
      }
    }
  }));

  if (theme === 'categorized') res.status(200).json(Object.keys(result.rows).map(record => {
    return {
      type: 'Feature',
      geometry: JSON.parse(result.rows[record].geomj),
      properties: {
        count: result.rows[record].count,
        cat: Object.assign({}, ...result.rows[record].cat)
      }
    }
  }));

  if (theme === 'graduated') res.status(200).json(Object.keys(result.rows).map(record => {
    return {
      type: 'Feature',
      geometry: JSON.parse(result.rows[record].geomj),
      properties: {
        count: result.rows[record].count,
        sum: result.rows[record].sum
      }
    }
  }));
}

async function cluster_select(req, res) {
  
  let
    table = req.query.table,
    id = req.query.qID,
    dbs = req.query.dbs,
    count = req.query.count,
    latlng = req.query.latlng;

  // Check whether string params are found in the settings to prevent SQL injections.
  //if (await require('./chk').chkVals([table, id, geom, cat], res).statusCode === 406) return;

  //console.log(req.query);

  // Query the feature count from lat/lng bounding box.
  let q = `
    SELECT ${id} AS ID
      FROM ${table}
      ORDER BY ST_Point(${latlng}) <#> geom LIMIT ${count};`;

  let result = await global.DBS[req.query.dbs].query(q);

  console.log(result.rows);

  res.status(200).json(Object.keys(result.rows));

  // res.status(200).json(Object.keys(result.rows).map(record => {
  //   return {
  //     type: 'Feature',
  //     geometry: JSON.parse(result.rows[record].geomj),
  //     properties: {
  //       count: result.rows[record].count,
  //       sum: result.rows[record].sum
  //     }
  //   }
  // }));

}

module.exports = {
  cluster: cluster,
  cluster_select: cluster_select
};