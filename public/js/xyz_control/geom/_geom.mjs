import point_edit from './point_edit.mjs';

import isoline_mapbox from './isoline_mapbox.mjs';

import isoline_here from './isoline_here.mjs';

import polygon_edit from './polygon_edit.mjs';

export default _xyz => ({

  point_edit: point_edit(_xyz),

  polygon_edit: polygon_edit(_xyz),

  isoline_mapbox: isoline_mapbox(_xyz),

  isoline_here: isoline_here(_xyz),

});