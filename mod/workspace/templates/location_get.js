module.exports = _ => {

  const fields = _.layer.infoj

    // Entry must have a field defined.
    .filter(entry => entry.field)

    // Entry must NOT have a query defined.
    .filter(entry => !entry.query)

    // Map either fieldfx or template SQL if available.
    .map(entry => `(${entry.fieldfx || _.workspace.templates[entry.field]?.template || entry.field}) AS ${entry.field}`)

  return `
    SELECT ${fields.join()}
    FROM ${_.table}
    WHERE ${_.layer.qID} = %{id}`
}