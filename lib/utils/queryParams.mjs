export default _this => {

  // If queryparams is not an object, return.
  if (typeof _this.queryparams !== 'object') {
    console.warn('queryparams must be an object')
    return;
  };

  // The layer queryparam must be true to support viewport params.
  _this.queryparams.layer = _this.queryparams.layer || _this.viewport

  // Assign table name from layer
  let tableCurrent = _this.location?.layer?.tableCurrent() || _this.layer?.tableCurrent()

  // If table is set to true, use the current table name from the layer, otherwise use the table name from the queryparams.
  let table = _this.queryparams.table === true ? tableCurrent : _this.queryparams.table;

  _this.queryparams.table &&= table;

  // Get bounds from mapview.
  const bounds = _this.viewport && _this.layer.mapview.getBounds();

  // Get center from mapview.
  const center = _this.queryparams.center && ol.proj.transform(
    _this.layer.mapview.Map.getView().getCenter(),
    `EPSG:${_this.layer.mapview.srid}`,
    `EPSG:4326`)

  return {
    // Spread the queryparams object.
    ..._this.queryparams,

    // Queries will fail if the template can not be accessed in workspace.
    template: encodeURIComponent(_this.query),

    // Layer filter can only be applied if the layer is provided as reference to a layer object in the layers list.
    filter: _this.queryparams.filter ? _this.layer.filter?.current : undefined,

    // Locale param is only required for layer lookups.
    locale: _this.queryparams.layer ? _this.layer.mapview.locale.key : undefined,

    // Layer param is only required for layer lookups.
    layer: _this.queryparams.layer ? _this.layer.key : undefined,

    // ID will be taken if a location object is provided with the params.
    id: _this.queryparams.id ? _this.location?.id : undefined,

    // lat lng must be explicit or the center flag param must be set.
    lat: center && center[1],
    lng: center && center[0],

    // z will be generated if the z flag is set in the params.
    z: _this.queryparams?.z && _this.layer.mapview.Map.getView().getZoom(),

    // Viewport will only be generated if the viewport flag is set on the params.
    viewport: bounds && [bounds.west, bounds.south, bounds.east, bounds.north, _this.layer.mapview.srid],

    // The fieldValues array entries should not be part of the url params.
    fieldValues: undefined

  }
}