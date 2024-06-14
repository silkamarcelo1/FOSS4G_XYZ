export default (layer) => {

  const theme = layer.style.theme

  theme.legend ??= {}

  theme.legend.grid = []

  // Make 'left' default alignment.
  theme.legend.alignContents ??= 'left'
  theme.legend.alignContents += ' contents'

  let timeout;

  // Switch all control
  theme.legend.switch = layer.filter && mapp.utils.html`
    <div
      class="switch-all"
      style="grid-column: 1/3;">
      ${mapp.dictionary.layer_style_switch_caption}
      <button
        class="primary-colour bold"
        onclick=${e => {

          let allSwitches = [...e.target.closest('.legend').querySelectorAll('.switch')];
          let disabledSwitches = allSwitches.filter((switch_) => switch_.classList.contains('disabled'));

          if (disabledSwitches.length == 0 || disabledSwitches.length == allSwitches.length) {

            // if all switches are either enabled or disabled, click on all 
            allSwitches.forEach(switch_ => switch_.click());

          } else {

            // if only some of them are enabled, click only on disabled ones
            disabledSwitches.forEach(switch_ => switch_.click());
          }

        }}>${mapp.dictionary.layer_style_switch_all}
      </button>.`

  theme.categories.forEach(cat => {

    // Check whether cat is in current filter.
    cat.disabled = layer.filter?.current[theme.field]?.ni?.indexOf(cat.value) >= 0

    if (layer.featureFields && theme.distribution === 'count') {

      cat.count = layer.featureFields[theme.field]?.[cat.value]

      if (!cat.disabled && !cat.count) return;
    }

    // Cat icon.
    let icon = mapp.utils.html`
      <div
        style="height: 24px; width: 24px; grid-column: 1;">
        ${mapp.ui.elements.legendIcon({ width: 24, height: 24, ...cat.style})}`;

    let classList = `label ${layer.filter && 'switch' ||''} ${cat.disabled &&  'disabled' ||''}`;

    let cat_label = cat.label + (cat.count? ` [${cat.count}]`:'')

    // Cat label with filter function.
    let label = mapp.utils.html`
      <div
        class=${classList}
        style="grid-column: 2;"
        onclick=${e => {

          if (!layer.filter) return;

          const filter = layer.filter.list?.find(f => f.type === 'ni' && f.field === theme.field)

          e.target.classList.toggle('disabled')

          // Add cat value to current NI (not in) field filter.
          if (e.target.classList.contains('disabled')) {

            // Create empty field filter object if non exists.
            if (!layer.filter.current[theme.field]) {
              layer.filter.current[theme.field] = {}
            }

            // Create empty NI filter array for field if non exists.
            if (!layer.filter.current[theme.field].ni) {
              layer.filter.current[theme.field].ni = []
            }

            // Push cat value into the NI filter array.
            layer.filter
              .current[theme.field].ni
              .push(cat.keys || cat.value)
           
            // Flatten the filter in case of arrays filter.
            layer.filter
              .current[theme.field].ni = layer.filter.current[theme.field].ni.flat()

          // Remove cat value from current NI field filter.
          } else {

            if (Array.isArray(cat.keys)) {

              cat.keys.forEach(key => {

                // Splice key out of the NI array.
                layer.filter
                  .current[theme.field].ni
                  .splice(layer.filter.current[theme.field].ni.indexOf(key), 1)

              })

            } else {

              // Splice value out of the NI array.
              layer.filter
                .current[theme.field].ni
                .splice(layer.filter.current[theme.field].ni.indexOf(cat.value), 1)

            }
 
            // Delete current field filter if NI array is empty.
            if (!layer.filter.current[theme.field].ni.length) {
              delete layer.filter.current[theme.field].ni
              if (!Object.keys(layer.filter.current[theme.field]).length) {
                delete layer.filter.current[theme.field]
              }
            }
          }

          if (timeout) clearTimeout(timeout)

          timeout = setTimeout(async () => {

            if (filter?.card) {

              filter.card
                .querySelector('.filter')
                .replaceWith(await mapp.ui.layers.filters[filter.type](layer, filter))
            }

            // theme flag is set in styles or theme.
            (layer.style.filter || theme.filter)
              ? layer.L.changed()
              : layer.reload()

          }, 400)

        }}>${cat_label}`

    cat.node = mapp.utils.html.node`<div 
      data-id=${cat.value}
      class="${theme.legend.alignContents}">
      ${icon}${label}`

    // Push icon and label into legend grid.
    theme.legend.grid.push(cat.node)
  })

  // Attach row for cluster locations.
  if (layer.style.cluster) {

    // Create cluster icon.
    let icon = mapp.utils.html`
      <div
        style="height: 40px; width: 40px;">
        ${mapp.ui.elements.legendIcon({
          width: 40,
          height: 40,
          icon: layer.style.cluster.icon
        })}`
   
    // Create cluster label.
    let label = mapp.utils.html`
      <div
        class="label">
        ${mapp.dictionary.layer_style_cluster}`

    // Push icon and label into legend grid.
    theme.legend.grid.push(mapp.utils.html`<div 
      data-id="cluster"
      class=${theme.legend.alignContents}>
      ${icon}${label}`)
  }

  // Default layout to 'grid'
  theme.legend.layout ??= 'grid'

  theme.legend.node = mapp.utils.html.node`
    <div class="legend">
      ${theme.legend.switch || ''}
      <div class=${`contents-wrapper ${theme.legend.layout}`}>
        ${theme.legend.grid}`

  if (layer.style.legend) mapp.utils.render(layer.style.legend, theme.legend.node)
  
  return theme.legend.node;
}
