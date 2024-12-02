/**
### /utils/jsonParser

The jsonParser utility is used to parse a locale to be stored as a userLocale.

@module /utils/jsonParser
*/

export default jsonParser

/**
@function jsonParser

@description
The jsonParser returns an object which can be stored in an object store.

@param {Object} obj A decorated object.
@returns {Object} Returns a JSON object which can be stored in an object store.
*/
function jsonParser(obj) {

  if (typeof obj !== 'object') return;

  const jsonObject = {}

  propertyParser(jsonObject, obj)

  return jsonObject
}

/**
@function propertyParser

@description
The propertyParser parses a source object and assigns properties which can be stored in an object store to the target object.

@param {Object} target
@param {Object} source
*/
function propertyParser(target, source) {

  if (!isObject(source)) return source;

  // Iterate through the source own enumerable string-keyed property key-value pairs.
  for (const [key, value] of Object.entries(source)) {

    // The ignoreKeys contain checks against prototype pollution.
    if (new Set(['__proto__', 'constructor', 'mapview']).has(key)) {

      continue;
    }

    if (assignValue(target, key, value)) continue;

    if (excludeProperty(value)) continue;

    if (Array.isArray(value)) {

      target[key] = value.map(entry => isObject(entry)
        ? propertyParser({}, entry)
        : entry)
      continue;
    }

    // Value must be an object at this point.
    target[key] ??= {}

    // Call recursive merge for target key object.
    propertyParser(target[key], value);
  }

  return target
}

/**
@function assignValue
@description
Returns true if a true, false, null, string, or num value can be assigned to the target object.

Returns true if undefined value is skipped.

@param {Object} target
@param {string} key
@param {*} value
@returns {Boolean} True if the value has been assigned.
*/
function assignValue(target, key, value) {

  if (value === undefined) {

    return true
  }

  if (value === true) {

    target[key] = true
    return true
  }

  if (value === false) {

    target[key] = false
    return true
  }

  if (value === null) {

    target[key] = null
    return true
  }

  if (typeof value === 'string') {

    target[key] = value
    return true
  }

  if (!isNaN(value)) {

    target[key] = value
    return true
  }
}

/**
@function excludeProperty
@description
The excludeProperty method returns true if a property should be exluded from the target in the propertyParser iteration.

@param {*} value
@returns {Boolean} True if the property should be excluded in regards to the property value.
*/
function excludeProperty(value) {

  if (typeof value === 'object') {

    // Openlayer objects will have an unique id.
    if (Object.hasOwn(value, 'ol_uid')) {
      return true;
    }

    if (value.type === 'html'
      && Array.isArray(value.template)
      && Array.isArray(value.values)) {

      return true;
    }
  }

  if (value instanceof HTMLElement) {
    return true;
  }

  if (value instanceof Function) {
    return true;
  }

  if (Array.isArray(value)) {

    // Ignore html template arrays.
    if (value[0] instanceof HTMLElement) return true;

    // Ignore callback arrays.
    if (value[0] instanceof Function) return true;
  }
}

/**
@function isObject
Checks whether the item argument is an object but not true, false, null, or an array.

@param {*} item
@returns {Boolean} True if the item is an object but not true, false, null, or an array.
*/
function isObject(item) {

  if (item === true) return false;

  if (item === false) return false;

  if (item === null) return false;

  if (Array.isArray(item)) return false;

  if (typeof item === 'object') return true;
}

