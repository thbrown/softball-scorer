/**
 *	This is a hastily written library to diff and merge objects with similar structures.
 */
let diff = function(mine, theirs) {
	return diffInternal(mine, theirs, [], {});
}

let diffInternal = function(mine, theirs, path, result) {
	if(Array.isArray(mine) && Array.isArray(theirs)) {
		// Delete everything in mine that isn't in theirs
		let deletes = mine.filter(x => !theirs.find(v => getUniqueId(v) === getUniqueId(x)));
		deletes.forEach( 
			(del) => {addToResult(result, path, getUniqueId(del), "Delete")}
		);

		// Add everything to mine that is in theirs
		let adds = theirs.filter(x => !mine.find(v => getUniqueId(v) === getUniqueId(x)));
		adds.forEach( 
			(add) => {addToResult(result, path, JSON.stringify(add), "ArrayAdd", JSON.stringify(add), theirs.indexOf(add))} 
		);

		// Determine which the intersection of the elements in each list so we can compare order
		let commonElementsA = mine.filter(x => theirs.find(v => getUniqueId(v) === getUniqueId(x)));
		let commonElementsB = theirs.filter(x => mine.find(v => getUniqueId(v) === getUniqueId(x)));

		// If they are not in the same order, re-order them
		let commonElementsAIds = commonElementsA.map(v => getUniqueId(v));
		let commonElementsBIds = commonElementsB.map(v => getUniqueId(v));
		if(!arraysEqual(commonElementsAIds, commonElementsBIds)) {
		       let key = "ReOrder";
		       addToResult(result, path, key, "ReOrder", JSON.stringify(commonElementsAIds), JSON.stringify(commonElementsBIds));
		}
		// Now diff each corresponding element in the array
		for(let i = 0; i < commonElementsA.length; i++) {
		       let bIndex = commonElementsB.findIndex( el => getUniqueId(el) === getUniqueId(commonElementsA[i]) );
		       diffInternal(commonElementsA[i], commonElementsB[bIndex], path.concat(getUniqueId(commonElementsA[i])),result);
		};
	} else if ((mine !== null && typeof mine === 'object') && (theirs !== null && typeof theirs === 'object')) {
		let deletes = Object.keys(mine).filter(x => !Object.keys(theirs).find(v => getUniqueId(mine[v]) === getUniqueId(mine[x])));
		deletes.forEach( 
			(del) => {addToResult(result, path, getUniqueId(del), "Delete")}
		);
		let adds = Object.keys(theirs).filter(x => !Object.keys(mine).find(v => getUniqueId(v) === getUniqueId(x)));
		adds.forEach( 
			(add) => {return addToResult(result, path, getUniqueId(add), "Add", theirs[add]);}
		);
		let commonProps = Object.keys(theirs).filter(x => Object.keys(mine).find(v => getUniqueId(v) === getUniqueId(x)));
		commonProps.forEach( prop => {
			diffInternal(mine[prop], theirs[prop], path.concat(prop), result);
		});
	} else if ((mine !== Object(mine)) && (theirs !== Object(theirs))) {
		if(mine !== theirs) {
			addToResult(result, path, undefined ,"Edit", mine, theirs);
		}
	} else {
		throw "I don't know how to diff objects of different types!" + typeof mine + " " + typeof theirs;
	}
	return result;
}

// https://stackoverflow.com/questions/41239651/javascript-check-if-two-arrays-are-equal-when-arrays-contain-an-object-and-an
let arraysEqual = function (arr1, arr2) {
    if (arr1.length !== arr2.length)
        return false;
    for (var i = arr1.length; i--;) {
        if (arr1[i] !== arr2[i])
            return false;
    }
    return true;
}

let addToResult = function(result, path, value, op, param1, param2) {
	// If no value, we want to assign the inst to the last value in the path
	if(!value && value !== 0) {
		value = path.pop();
	} 

	let handle = result;
	path.forEach( element => {
		if(!handle[element.toString()] && handle[element.toString()] !== 0) {
			handle[element.toString()] = {};
		}
		handle = handle[element.toString()];
	});

	let inst = {
		op:op,
		key:value,
		param1:param1,
		param2:param2
	};
	handle[value.toString()] = inst;
	return result;
}

// We can use the id property to identify what objects are the same during merge
let getUniqueId = function(value) {
	if (isObject(value)) {
		if(value.id || value.id === 0) {
			return value.id
		} else if (Object.keys(value).length >0) {
			// This object doesn't have an id field, identify it by its first key
			return Object.keys(value)[0];
		} else {
			throw "Tried to find the id of an empty object"
		}
	} else  {
		return value;
	}
}


let patch = function(toPatch, patchObj, allowPartialApplication) {
	Object.keys(patchObj).forEach(function(key) {
		if(isLeaf(patchObj[key])) {
			let op = patchObj[key].op;
			let value = patchObj[key].key;
			if(op == "Delete") {
				if(Array.isArray(toPatch)) {
					let delIndex = toPatch.findIndex(v => getUniqueId(v) === patchObj[key].key);
					if(delIndex === -1) {
						throw "Bad patch" + JSON.stringify(toPatch) + '\n' +  JSON.stringify(patchObj);
					}
					toPatch.splice(delIndex, 1);
				} else { // What about primitiave?
					delete toPatch[key];
				}
			} else if(op == "ArrayAdd") {
				let position = patchObj[key].param2;//= patchObj[key].param2 < toPatch.length ? patchObj[key].param2 : (toPatch.length-1);
				toPatch.splice(position, 0, JSON.parse(patchObj[key].param1));
			} else if(op == "ReOrder") {
				let oldOrder = JSON.parse(patchObj[key].param1);
				let newOrder = JSON.parse(patchObj[key].param2);
				let indexesInToPatch = [];
				for(let i = 0; i < oldOrder.length; i++) {
					let indexToMove = toPatch.findIndex(v => getUniqueId(v) === oldOrder[i]); // May not be adjacent, so we need to search
					indexesInToPatch.push(indexToMove);
				}
				let replacements = []; // {1:----}, {2:----}
				for(let i = 0; i < oldOrder.length; i++) {
					let index = newOrder.indexOf(oldOrder[i]);
					replacements.push({destination:indexesInToPatch[index], whatToMove:toPatch[indexesInToPatch[i]]});
				}
				for(let i = 0; i < replacements.length; i++) {
					toPatch[replacements[i].destination] = replacements[i].whatToMove;
				}
			} else if(op == "Add") {
				toPatch[value] = patchObj[key].param1;
			} else if(op == "Edit") {
				// TODO: Check if value is param2 before change?
				toPatch[value] = patchObj[key].param2;
			} else  {
				throw "Unrecognized operation: " + op + " " + JSON.stringify(patchObj[key])
			}
		} else {
			let toPatchSubtree;
			if(Array.isArray(toPatch)) {
				let index = toPatch.findIndex(v => {return v.id == key;}); // Can't do array of arrays I think?
				if(index < 0) {
					//console.log("Raw: " + patchObj);
					index = toPatch.findIndex(v => v === patchObj);
				} else {
					//console.log("Id: " + index);
				}
				toPatchSubtree = toPatch[index];
			} else if(toPatch && toPatch.hasOwnProperty(key)) {
				//console.log("Prop: " + key);
				toPatchSubtree = toPatch[key];
			} else {
				if(!allowPartialApplication) {
					throw "This patch can not be applied: Can't find key " + key + " in " + toPatch;
				} else {
					// Partial patches are allowed, don't apply this part
					return;
				}
			}
			patch(toPatchSubtree,patchObj[key],allowPartialApplication);
		}
	});
	return toPatch; // This modifies the passed in object, is returning that object misleading?
}

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
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 * https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge
 */
let mergeDeep = function(target, ...sources) {
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
}

let isObject = function(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

let diff3 = function(mine, ancestor, theirs) {
	let patch1 = diff(ancestor,theirs);
	let patch2 = diff(ancestor,mine);
	// My changes will overwrite their changes
	return mergeDeep(patch1, patch2);
}

module.exports = {  
    diff: diff,
    diff3: diff3,
    patch: patch
}