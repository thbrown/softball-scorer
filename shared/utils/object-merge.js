const commonUtils = require('./common-utils');

/**
 *	This is a library to diff and merge objects with similar structures.
 */
let diff = function (mine, theirs) {
  return diffInternal(mine, theirs, [], {});
};

let diffInternal = function (mine, theirs, path, result) {
  if (Array.isArray(mine) && Array.isArray(theirs)) {
    // Determine what elements the arrays have in common (commonElementsA, commonElementsB)
    // what elements are in mine but not in theirs (deletes)
    // what elements are in theirs but not in mine (adds)
    let myIds = mine.map((v) => getUniqueId(v));
    let theirIds = theirs.map((v) => getUniqueId(v));

    let theirIdsSet = new Set(theirIds);
    let commonElementsAIds = [];
    let commonElementsObjectA = {};
    let deletes = [];
    for (var i = 0; i < myIds.length; i++) {
      if (theirIdsSet.has(myIds[i])) {
        commonElementsAIds.push(myIds[i]);
        commonElementsObjectA[myIds[i]] = mine[i];
      } else {
        deletes.push(mine[i]);
      }
    }

    let myIdsSet = new Set(myIds);
    let commonElementsBIds = [];
    let commonElementsObjectB = {};
    let adds = [];
    for (var i = 0; i < theirIds.length; i++) {
      if (myIdsSet.has(theirIds[i])) {
        commonElementsBIds.push(theirIds[i]);
        commonElementsObjectB[theirIds[i]] = theirs[i];
      } else {
        adds.push(theirs[i]);
      }
    }

    // Delete everything in mine that isn't in theirs
    deletes.forEach((del) => {
      addToResult(result, path, getUniqueId(del), 'Delete');
    });

    // Add everything to mine that is in theirs
    adds.forEach((add) => {
      // We just need the key to be unique, so we'll use whatever is shorter.
      let checksum = commonUtils.getHash(add);
      let value = JSON.stringify(add);
      let key = value.length <= checksum.length ? value : checksum;
      addToResult(
        result,
        path,
        key,
        'ArrayAdd',
        JSON.stringify(add),
        theirs.indexOf(add)
      );
    });

    // If they are not in the same order, re-order them
    if (!arraysEqual(commonElementsAIds, commonElementsBIds)) {
      let key = 'ReOrder';
      addToResult(
        result,
        path,
        key,
        'ReOrder',
        JSON.stringify(commonElementsAIds),
        JSON.stringify(commonElementsBIds)
      );
    }

    // Now diff each corresponding element in the array
    for (let i = 0; i < commonElementsAIds.length; i++) {
      let id = commonElementsAIds[i];
      diffInternal(
        commonElementsObjectA[id],
        commonElementsObjectB[id],
        path.concat(getUniqueId(commonElementsObjectA[id])),
        result
      );
    }
  } else if (
    mine !== null &&
    typeof mine === 'object' &&
    theirs !== null &&
    typeof theirs === 'object'
  ) {
    let myIds = Object.keys(mine);
    let theirIds = Object.keys(theirs);

    let theirIdsSet = new Set(theirIds);
    let commonElementsObjectA = {};
    let deletes = [];
    for (var i = 0; i < myIds.length; i++) {
      if (theirIdsSet.has(myIds[i])) {
        commonElementsObjectA[myIds[i]] = mine[i];
      } else {
        deletes.push(myIds[i]);
      }
    }

    let myIdsSet = new Set(myIds);
    let adds = [];
    for (var i = 0; i < theirIds.length; i++) {
      if (!myIdsSet.has(theirIds[i])) {
        adds.push(theirIds[i]);
      }
    }

    deletes.forEach((del) => {
      addToResult(result, path, del, 'Delete');
    });

    adds.forEach((add) => {
      return addToResult(result, path, add, 'Add', theirs[add]);
    });

    Object.keys(commonElementsObjectA).forEach((prop) => {
      diffInternal(mine[prop], theirs[prop], path.concat(prop), result);
    });
  } else if (mine !== Object(mine) && theirs !== Object(theirs)) {
    if (mine !== theirs) {
      addToResult(result, path, undefined, 'Edit', mine, theirs);
    }
  } else {
    throw (
      "I don't know how to diff objects of different types! " +
      typeof mine +
      ' ' +
      typeof theirs +
      ' ' +
      JSON.stringify(mine) +
      ' ' +
      JSON.stringify(theirs)
    );
  }
  return result;
};

// https://stackoverflow.com/questions/41239651/javascript-check-if-two-arrays-are-equal-when-arrays-contain-an-object-and-an
let arraysEqual = function (arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  for (var i = arr1.length; i--; ) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
};

let addToResult = function (result, path, value, op, param1, param2) {
  // If no value, we want to assign the inst to the last value in the path
  if (!value && value !== 0) {
    value = path.pop();
  }

  let handle = result;
  path.forEach((element) => {
    if (!handle[element.toString()] && handle[element.toString()] !== 0) {
      handle[element.toString()] = {};
    }
    handle = handle[element.toString()];
  });

  let inst = {
    op: op,
    key: value,
    param1: param1,
    param2: param2,
  };
  handle[value.toString()] = inst;
  return result;
};

// We can use the id property to identify what objects are the same during merge
let getUniqueId = function (value) {
  if (isObject(value)) {
    if (value.id || value.id === 0) {
      return value.id;
    } else if (Object.keys(value).length > 0) {
      // This object doesn't have an id field, identify it by its first key
      return Object.keys(value)[0];
    } else {
      throw 'Tried to find the id of an empty object';
    }
  } else {
    return value;
  }
};

/*
 * Applies a patch generated by the diff method to the provided object.
 * Note: this is not transactional, patches can get partially applied if an error occures while patching.
 *
 * skipOperationOnNonExistant - if true will skip patch operations where the data to be patched does not exist in the patch object. If false an error will be thrown instead.
 * skipDeletes - don't do delete operations if true (usefully for doing merges)
 */
let patch = function (
  toPatch,
  patchObj,
  skipOperationOnNonExistant,
  skipDeletes
) {
  Object.keys(patchObj).forEach(function (key) {
    if (isLeaf(patchObj[key])) {
      let op = patchObj[key].op;
      let value = patchObj[key].key;
      if (op == 'Delete') {
        if (skipDeletes) {
          console.log('Delete was skipped');
        } else {
          if (Array.isArray(toPatch)) {
            let delIndex = toPatch.findIndex(
              (v) => getUniqueId(v) === patchObj[key].key
            );
            if (delIndex === -1) {
              if (skipOperationOnNonExistant) {
                // Trying to delete somethign that has alrready been deleted? No problem.
                return;
              } else {
                throw new Error(
                  'Bad patch:\n' +
                    skipDeletes +
                    ' ' +
                    JSON.stringify(toPatch, null, 2) +
                    '\n' +
                    JSON.stringify(patchObj, null, 2)
                );
              }
            }
            toPatch.splice(delIndex, 1);
          } else {
            // What about primitiave?
            delete toPatch[key];
          }
        }
      } else if (op == 'ArrayAdd') {
        let newEntry = JSON.parse(patchObj[key].param1);
        let existingIndex = toPatch.findIndex(
          (v) => getUniqueId(v) === getUniqueId(newEntry)
        );
        if (existingIndex == -1) {
          let position = patchObj[key].param2;
          toPatch.splice(position, 0, newEntry);
        } else {
          if (skipOperationOnNonExistant) {
            let subpatch = diff(toPatch[existingIndex], newEntry); // NOTE: we are ignoring the insertion index here if the entity already exists
            patch(toPatch[existingIndex], subpatch, true, true); // We want to merge these two objects, not overwrite the existing one. So we'll specify skip delete.
          } else {
            throw new Error(
              'This patch can not be applied: Attempting to arrayAdd ' +
                JSON.stringify(newEntry) +
                ' but a property with that id already exists ' +
                JSON.stringify(toPatch[existingIndex])
            );
          }
        }
      } else if (op == 'ReOrder') {
        let oldOrder = JSON.parse(patchObj[key].param1);
        let newOrder = JSON.parse(patchObj[key].param2);
        let indexesInToPatch = [];
        for (let i = 0; i < oldOrder.length; i++) {
          let indexToMove = toPatch.findIndex(
            (v) => getUniqueId(v) === oldOrder[i]
          ); // May not be adjacent, so we need to search
          indexesInToPatch.push(indexToMove);
        }
        let replacements = []; // {1:----}, {2:----}
        for (let i = 0; i < oldOrder.length; i++) {
          let index = newOrder.indexOf(oldOrder[i]);
          replacements.push({
            destination: indexesInToPatch[index],
            whatToMove: toPatch[indexesInToPatch[i]],
          });
        }
        for (let i = 0; i < replacements.length; i++) {
          toPatch[replacements[i].destination] = replacements[i].whatToMove;
        }
      } else if (op == 'Add') {
        if (toPatch[value] !== undefined) {
          // We are attempting to add something that already exists, either merge it or throw an error
          if (skipOperationOnNonExistant) {
            let subpatch = diff(toPatch[value], patchObj[key].param1);
            patch(toPatch[value], subpatch, true, true); // Instead we want to merge these two objects, so we'll specify skip delete
          } else {
            throw new Error(
              'This patch can not be applied: Attempting to add ' +
                patchObj[key].param1 +
                ' but a property with that id already exists ' +
                toPatch[value]
            );
          }
        } else {
          toPatch[value] = patchObj[key].param1;
        }
      } else if (op == 'Edit') {
        if (toPatch) {
          // TODO: Check if value is param2 before change?
          toPatch[value] = patchObj[key].param2;
        } else if (!skipOperationOnNonExistant) {
          throw new Error(
            `This patch can not be applied: Attempting an edit to an object that doesn't exist ${patchObj[key].param2}`
          );
        }
      } else {
        throw (
          'Unrecognized operation: ' + op + ' ' + JSON.stringify(patchObj[key])
        );
      }
    } else {
      let toPatchSubtree;
      if (Array.isArray(toPatch)) {
        let index = toPatch.findIndex((v) => {
          return v.id == key;
        }); // Can't do array of arrays I think?
        if (index < 0) {
          index = toPatch.findIndex((v) => v === patchObj);
        }
        toPatchSubtree = toPatch[index];
      } else if (toPatch && toPatch.hasOwnProperty(key)) {
        toPatchSubtree = toPatch[key];
      } else {
        if (!skipOperationOnNonExistant) {
          throw new Error(
            "This patch can not be applied: Can't find key " +
              key +
              ' in ' +
              toPatch
          );
        } else {
          // Partial patches are allowed, don't apply this part
          return;
        }
      }
      patch(
        toPatchSubtree,
        patchObj[key],
        skipOperationOnNonExistant,
        skipDeletes
      );
    }
  });
  return toPatch; // This modifies the passed in object, is also returning the modified object misleading?
};

// Returns true if none of the object's properties are objects themselves.
let isLeaf = function (obj) {
  let keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i++) {
    let key = keys[i];
    if (obj[key] !== null && typeof obj[key] === 'object') {
      return false;
    }
  }
  return true;
};

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 * https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge
 */
let mergeDeep = function (target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
};

let isObject = function (item) {
  return item && typeof item === 'object' && !Array.isArray(item);
};

let diff3 = function (mine, ancestor, theirs) {
  let patch1 = diff(ancestor, theirs);
  let patch2 = diff(ancestor, mine);
  // My changes will overwrite their changes
  return mergeDeep(patch1, patch2);
};

module.exports = {
  diff: diff,
  patch: patch,
};