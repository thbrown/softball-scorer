const commonUtils = require('./common-utils');
const jsonpatch = require('fast-json-patch');
const jsonPointer = require('jsonpointer');

/**
 * JSON patch spec RFC6902 doesn't quite work for us for three reasons.
 * - First, we want to be able to identify JSON objects within arrays by their 'id' property rather than their index
 *   within the array and apply diffs accordingly.
 * - Second, we are not necessarily applying the patch to the objects we diffed which can cause conflicts if the
 *   pointer in the patch we are attempting apply does not exist on the document we are attempting to patch.
 * - Third, we need to be able to preform document merges (by ignoring removals and possibly modifying replacements).
 *
 * This wrapper performs a conversion of this application's JSON documents so that they can be diffed and patched as we expect by a RFC6902-compatible
 * library.
 *
 * Restrictions - id must be string or numbers (not booleans, null, arrays, or objects)
 *
 * The conversion addresses these three particular issues:
 *
 * 1) We are identifying objects in arrays by an "id" property. RFC6902 identifies them by their array index.
 *
 *  For Example:
 *
 *  // Example delete
 *  var documentA = [{id: 1 , name:"Matthew"}] // Client Ancestor
 *  var documentB = []                         // Client Local State
 *
 *  Comparing these two documents results in the following patch: {op: "remove", path: "/0"}]
 *
 *  This is sent to the server where somebody else had already deleted "Matthew" and added two other entries:
 *
 *  var documentC = [{id: 2 , name:"Mark"}, {id: 3 , name:"Luke"}]
 *
 *  let patch = diff(documentA, documentB); // {op: "remove", path: "/0"}]
 *  let result = patch(patch, documentC); // This patch deletes the object at index 0 - "Mark" but we wanted it to be a no-op since "Matthew" was already deleted.
 *
 *  // Actual result:  [{id: 3 , name:"Luke"}];
 *  // Desired result: [{id: 2 , name:"Mark"}, {id: 3 , name:"Luke"}]
 *
 *  We solve this by converting arrays to objects with ids as the keys and the rest of the object fields as values.
 *
 *  For example:
 *
 *  From:
 *
 *  [{id: 123, name:"Mathew"}, {id: 321 , name:"Mark"}, {id: 213 , name:"Luke"},{id: 132 , name:"John"}]
 *
 *  To:
 *
 *  {123:{name:"Mathew"}, 321:{name:"Mark"}, 213:{name:"Luke"}, 132:{name:"John"}}
 *
 *  Then we can apply RFC6902 patches, then convert back.
 *
 *  Note: Typically when a document is being converted to an RFC6902 compatible format we can tell if we should preform
 *  the conversion (from array to object) by looking for an 'id' property in first element of the arrays we are diffing
 *  (e.g. if the array has object at index 0 with an "id" property, perform the conversion, otherwise, don't). However,
 *  when diffing empty arrays, it's not possible to determine whether the conversion should be performed. Therefore,
 *  we default to not performing the conversion and leaving an empty array in the patch object.
 *
 *  Subsequently, during the patch process we sometimes need to correct this decision if we ever find ourselves
 *  attempting to apply a patch that contains an empty array ([]) or apply a patch to an empty array ([]).
 *
 *  The table below enumerates every combination of patch involving [] and {} and identifies combinations that need to
 *  be addressed.
 *
 *  Legend:
 *  i - First document to diff (against ii) to find the patch
 *  ii - Second document to diff (against i) to find the patch
 *  iii - Document to apply the patch too (also called the target)
 *
 *  [] - represents a document is an empty array (and maybe should have been converted into an empty object by the diff process instead)
 *  {} - represents a document with at least one property beginning with '#' or '$' (which would signify that it's been converted from an array of objects w/ id properties)
 *
 *  i  - ii - iii - OP - STATUS - LABEL (if applicable)
 *  [] - [] - {}  - NOOP - OKAY
 *  [] - [] - []  - NOOP - OKAY
 *  [] - {} - {}  - REPLACE - FIX NEEDED (patch would overwrite existing keys in iii) - SCENARIO A - FIX IN DIFF - ALL
 *  [] - {} - []  - REPLACE - OKAY (it's fine to replace an empty array with an object)
 *  {} - {} - {}  - ADD/REMOVE - OKAY (items can be added or removed from iii)
 *  {} - {} - []  - ADD/REMOVE - FIX NEEDED (can't add or remove keys from/to an array) - SCENARIO B - FIX IN PATCH - ALL
 *  {} - [] - []  - REPLACE - OKAY (it's fine to replace an empty array with an object)
 *  {} - [] - {}  - REPLACE - FIX NEEDED (patch would overwrite existing keys in iii)  - SCENARIO C - FIX IN DIFF - MERGE ONLY???
 *
 * 3) We need to be fault tolerant when applying patches that affect objects that have been deleted.
 *
 *  We solve this by checking all paths in the patch array and removing any operations on paths that that don't exist.
 *
 * 2) We need a way to merge JSON documents (i.e. a patch without any removals/deletes)
 *
 *  We solve this by removing any "remove" operations from the resultant patch array before applying them.
 *
 * TODO: Think about making this an interface. I don't know what other implementation we would used here but it's a nice abstraction.
 */

let diff = function (mine, theirs) {
  return jsonpatch.compare(
    this._toRFC6902(mine),
    this._toRFC6902(theirs),
    false
  );
};

let patch = function (
  toPatch,
  patchObj,
  skipOperationOnNonExistent,
  skipDeletes
) {
  // Empty patch indicates no changes
  if (patchObj === null || patchObj === undefined) {
    return toPatch;
  }

  // Convert to RFC6902 compatible document
  toPatch = this._toRFC6902(toPatch, patchObj, toPatch);

  // Fix for SCENARIO A (see documentation at the top of this class)
  // If we are replacing an object, convert the replacement to an addition by re-diffing our target with a {}
  // [] - {} - {}
  let updatedPatch = [];
  for (let patchStep of patchObj) {
    if (patchStep.op === 'replace') {
      let destination = jsonPointer.get(toPatch, patchStep.path);
      if (
        typeof destination === 'object' && // Is this an object (not null or an array)
        destination !== null &&
        !Array.isArray(destination) &&
        Object.keys(destination).length >= 1 // It's fine to replace empty objects
      ) {
        let keys = Object.keys(destination);
        if (keys.length > 0) {
          // Just check the first key. All keys sent through _toRFC6902(...) should have a prefix so this should never fail.
          if (keys[0][0] === '$' || keys[0][0] === '#') {
            // We want to do adds, not a replace. We can get those by re-doing the diff for this section against '{}' instead if '[]'
            let newPatch = jsonpatch.compare({}, patchStep.value, false);
            console.log('REMOVE: ', patchStep);

            for (let innerPatchStep of newPatch) {
              // This should only ever have adds
              // TODO: what if it has adds to an array?
              // This patch should be applied at the original patches path
              innerPatchStep.path = patchStep.path + innerPatchStep.path;
              updatedPatch.push(innerPatchStep);
              console.log('ALT: ', innerPatchStep);
            }
            continue;
          }
        }
      }
    }
    updatedPatch.push(patchStep);
  }
  patchObj = updatedPatch;

  // Fix for SCENARIO B (see documentation at the top of this class)
  // Convert the target to an empty object before doing any additions
  for (let patchStep of patchObj) {
    if (patchStep.op === 'add') {
      let splitPath = patchStep.path.split('/');
      let oneUpPath = splitPath.slice(0, -1).join('/');
      let thingAtPointer = jsonPointer.get(toPatch, oneUpPath);
      if (Array.isArray(thingAtPointer) && thingAtPointer.length === 0) {
        let lastPathElement = splitPath[splitPath.length - 1];
        let firstChar = lastPathElement.substring(0, 1);
        // These prefixes indicate we should be working with a object (that should have been converted from an array by _toRFC6902(...))
        if (firstChar === '#' || firstChar === '$') {
          // It's actually an empty array of id'd objects! We want that to be {} instead of []. Fix it.
          if (oneUpPath.trim() === '') {
            toPatch = {}; // JSON pointer cant set the root, so we'll set it directly
          } else {
            jsonPointer.set(toPatch, oneUpPath, {});
          }
        }
      }
    }
  }

  if (skipOperationOnNonExistent) {
    let updatedPatch = [];
    for (let patchStep of patchObj) {
      // Keep any add operations
      if (patchStep.op === 'add') {
        updatedPatch.push(patchStep);
        continue;
      }

      // Keep other things if their targets exist
      if (jsonPointer.get(toPatch, patchStep.path)) {
        updatedPatch.push(patchStep);
        continue;
      }
    }
    patchObj = updatedPatch;
  }

  if (skipDeletes) {
    let updatedPatch = [];
    // Only perform operations on json elements that exist
    for (let patchStep of patchObj) {
      // Don't do any removal or replacements
      if (patchStep.op === 'remove') {
        continue;
      }

      // Fix for SCENARIO C (see documentation at the top of this class)
      // If we are ever trying to replace a converted object with an empty array, just stop and don't do it
      // TODO: why is this only a problem on merge? Maybe because it's okay to blast away existing keys on a non merge?
      if (
        patchStep.op === 'replace' &&
        Array.isArray(patchStep.value) &&
        patchStep.value.length === 0
      ) {
        // We'll fail if this doesn't exist, there are no current use cases for skipOperationOnNonExistent=false && skipDeletes=true
        let destination = jsonPointer.get(toPatch, patchStep.path);
        let keys = Object.keys(destination);
        if (keys.length > 0) {
          // Just check the first key. All keys sent through _toRFC6902(...) should have a prefix so this should never fail.
          if (keys[0][0] === '$' || keys[0][0] === '#') {
            continue; // No, do not delete my data
          }
        }
      }

      // Everything else is okay
      updatedPatch.push(patchStep);
    }
    patchObj = updatedPatch;
  }

  const patched = jsonpatch.applyPatch(toPatch, patchObj, false);
  return this._fromRFC6902(patched.newDocument);
};

/**
 * Checks if a patch is modifying anything in the forbiddenKeySet and filters out any offending parts of the patch.
 *
 * @returns the patch with any forbidden operations removed
 */
let filterPatch = function (
  patch,
  forbiddenKeySet,
  accountId,
  logger = {
    warn: function (...val) {
      console.log(...val);
    },
  }
) {
  let filteredPatch = [];

  for (let patchElement of patch) {
    // First, find any patches that have forbidden keys in their path
    let badToken = undefined;
    let tokens = patchElement.path.split('/');
    for (let token of tokens) {
      let nonPrefixedToken = token.substring(1); // Remove prefix ($, #, _, or *)
      nonPrefixedToken = jsonpatch.unescapePathComponent(nonPrefixedToken); // Unescape "/" and "~"
      if (forbiddenKeySet.has(nonPrefixedToken)) {
        badToken = token;
        break;
      }
    }
    if (badToken !== undefined) {
      logger.warn(
        accountId,
        'User tried to patch forbidden key. Forbidden key exists in patch path.',
        badToken,
        patchElement
      );
    }

    // Second, find any patches that have forbidden keys in their values attribute
    let isValidValue = _isValueValid(patchElement.value, forbiddenKeySet);
    if (!isValidValue) {
      logger.warn(
        accountId,
        'User tried to patch forbidden key. Forbidden key exists in patch value.',
        patchElement
      );
    }

    // Build the filtered patch if everything looks good
    if (badToken === undefined && isValidValue) {
      filteredPatch.push(patchElement);
    }
  }

  return filteredPatch;
};

let _isValueValid = function (toCheck, forbiddenKeySet) {
  if (toCheck === null || typeof toCheck !== 'object') {
    // Primitives are okay
    return true;
  } else if (Array.isArray(toCheck)) {
    // Arrays need to be searched
    for (let arrayElement of toCheck) {
      if (_isValueValid(arrayElement, forbiddenKeySet) === false) {
        return false;
      }
    }
    return true;
  } else {
    // Object's values need to be searched, and the object's keys need to be checked
    for (let key of Object.keys(toCheck)) {
      let nonPrefixedKey = key.substring(1); // Remove prefix ($, #, _, or *) - no need to un-escape "/" and "~"
      if (forbiddenKeySet.has(nonPrefixedKey)) {
        return false;
      }
      if (_isValueValid(toCheck[key], forbiddenKeySet) === false) {
        return false;
      }
    }
    return true;
  }
};

/**
 * Keys are prefixed in output, this is required for converting back via _fromRFC6902(...) (prefix - description):
 * $ - converted from an array to object
 * # - converted from an array to object w/ numeric id
 * _ - kept as an object
 * * - kept as an object w/ numeric key [This is a unicorn, keys can not be numeric in JSON, they are all strings]
 */
let _toRFC6902 = function (input) {
  if (input === undefined || input === null) {
    return input;
  } else if (Array.isArray(input)) {
    if (input.length === 0) {
      // Empty array
      return [];
    } else if (input[0].id === undefined) {
      // This is an array of primitives, arrays, or an array without an id, keep it as an array
      let outputArray = [];
      for (let element of input) {
        outputArray.push(this._toRFC6902(element));
      }
      return outputArray;
    } else {
      // This is an array of objects with ids, convert the array to an object
      let outputObject = {};
      for (let element of input) {
        let id = (typeof element.id === 'number' ? '#' : '$') + element.id;
        outputObject[id] = this._toRFC6902(element);
        delete outputObject[id]['_id'];
      }
      return outputObject;
    }
  } else if (typeof input === 'object') {
    let keys = Object.keys(input);
    if (keys.length === 0) {
      return {};
    }
    let outputObject = {};
    for (let key of keys) {
      let idKey = (typeof key === 'number' ? '*' : '_') + key; // TODO: remove this, it will always be a string
      outputObject[idKey] = this._toRFC6902(input[key]);
    }
    return outputObject;
  } else {
    return input;
  }
};

let _fromRFC6902 = function (input) {
  if (input === undefined || input === null) {
    return input;
  } else if (Array.isArray(input)) {
    // Arrays stay the same
    let outputArray = [];
    for (let element of input) {
      outputArray.push(this._fromRFC6902(element));
    }
    return outputArray;
  } else if (typeof input === 'object') {
    let keys = Object.keys(input);
    if (keys.length === 0) {
      return {}; // TODO: does this need to be []?
    }

    let firstLetterOfFirstKey = keys[0].substring(0, 1);
    if (firstLetterOfFirstKey === '$' || firstLetterOfFirstKey === '#') {
      let outputArray = [];
      for (let key of keys) {
        let first = key.substring(0, 1);
        if (first !== '$' && first !== '#') {
          throw new Error(
            'Invalid json document for RFC6902 conversion: ' +
              key +
              ' mixed keys ' +
              keys
          );
        }
        let rest = key.substring(1);
        let object = this._fromRFC6902(input[key]);
        object.id = first === '#' ? parseFloat(rest) : rest;
        outputArray.push(object);
      }
      return outputArray;
    } else if (firstLetterOfFirstKey === '_' || firstLetterOfFirstKey === '*') {
      let outputObject = {};
      for (let key of keys) {
        let first = key.substring(0, 1);
        if (first !== '_' && first !== '*') {
          throw new Error(
            'Invalid json document for RFC6902 conversion: ' +
              key +
              ' mixed keys ' +
              keys
          );
        }
        let rest = key.substring(1);
        outputObject[first === '*' ? parseFloat(rest) : rest] =
          this._fromRFC6902(input[key]);
      }
      return outputObject;
    } else {
      throw new Error(
        'Invalid json document for RFC6902 conversion: ' + keys[0]
      );
    }
  } else {
    return input;
  }
};

module.exports = {
  diff,
  patch,
  _toRFC6902, // Exposed for testing only
  _fromRFC6902, // Exposed for testing only
  filterPatch,
};
