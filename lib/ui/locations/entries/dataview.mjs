/**
## ui/locations/entries/dataview

The dataview entry module exports the dataview method as mapp.ui.locations.entries.dataview()

@requires /ui/Dataview

@module /ui/locations/entries/dataview
*/

/**
@function dataview

@description
The dataview entry method called from the infoj method returns a Dataview HTMLElement for the location view.

The dataview is created by passing the entry as argument to the mapp.ui.Dataview(entry) method.

A decorated dataview entry will have displayDataview(), hideDataview(), and an update() method.

The display flag controls whether the dataview should be displayed.

A checkbox element will only be returned from the dataview entry method if an `entry.label` has been configured with the string value for the checkbox label.

The dataview target itself will be returned with a checkbox if no implicit target is avilable in the documentview and the dataview should not be created in a tabview.

@param {Object} entry type:dataview entry.
@param {Object} entry.location The entry location.
@param {Object} entry.location.layer The entry location layer.
@param {string} [entry.label] Label for the dataview checkbox.
@param {string} [entry.dataview] The dataview type, eg. "chartjs", "tabulator".
@param {string} [entry.target] The dataview target. Will resolve to HTMLElement.
@param {Function} [entry.update] The dataview update method.
@param {boolean} [entry.display] The dataview display falg.
@param {Function} [entry.displayDataview] The dataview display method.
@param {Function} [entry.hideDataview] The dataview hide method.

@return {HTMLElement} Location view dataview and checkbox.
*/

export default function dataview(entry) {

  entry.data ??= entry.value

  // Dataview queries may require the layer and host to be defined on the entry.
  entry.layer ??= entry.location.layer
  entry.host ??= entry.layer.mapview.host

  // Dataview will be rendered into target identified by ID.
  if (typeof entry.target === 'string' && document.getElementById(entry.target)) {

    // Assign element by ID as target.
    entry.target = document.getElementById(entry.target)

    // Create and update the dataview.
    mapp.ui.Dataview(entry).then(dataview => dataview.update())

    return;
  }

  // Dataview is dependent on other field entries.
  if (entry.dependents) {

    console.warn(`The dataview type entry key:${entry.key} may be dependent on other entries but has no dependents.`)
  }

  // Dataview has already been created. e.g. after the location (view) is updated.
  if (entry.update) {

    if (entry.display) entry.displayDataview()

    // Return elements to location view.
    return mapp.utils.html.node`
      ${entry.chkbox || ''}
      ${entry.locationViewTarget || ''}`
  }

  // Find tabview element from data-id attribute.
  entry.tabview ??= typeof entry.target === 'string'
    && document.querySelector(`[data-id=${entry.target}]`)

  // Dataview will be rendered into a tabview panel.
  if (entry.tabview) {

    // Assign border style based on the location view record (from list)
    entry.tab_style ??= `border-bottom: 3px solid ${entry.location.style.strokeColor}`

    // Assign target html element for dataview.
    entry.target = mapp.utils.html.node`
      <div class="dataview-target">`

  } else {

    // Dataview will be rendered into location view.
    entry.locationViewTarget = mapp.utils.html.node`
      <div class="${`location ${entry.class}`}">`

    entry.target = entry.locationViewTarget
  }

  mapp.ui.Dataview(entry)

  // Dataview should be displayed.
  entry.display && entry.displayDataview()

  // A checkbox will only be created if the label key value is provided.
  entry.chkbox = entry.label && mapp.ui.elements.chkbox({
    data_id: entry.key,
    label: entry.label,
    disabled: entry.disabled,
    checked: !!entry.display,
    onchange: (checked) => {

      entry.display = checked

      entry.display 
        ? entry.displayDataview() 
        : entry.hideDataview()
    }
  })

  // Return elements to location view.
  return mapp.utils.html.node`
    ${entry.chkbox || ''}
    ${entry.locationViewTarget || ''}`
}
