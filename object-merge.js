/**
 *	This is a hastily written library to diff and merge objects with similar structures.
 */
let diff = function(mine, theirs) {
	return diffInternal(mine, theirs, [], {});
}

let diffInternal = function(mine, theirs, path, result) {
	if(Array.isArray(mine) && Array.isArray(theirs)) {
		let deletes = mine.filter(x => !theirs.find(v => getUniqueId(v) === getUniqueId(x)));
		deletes.forEach( 
			(del) => {addToResult(result, path, getUniqueId(del), "Delete")}
		);
		let adds = theirs.filter(x => !mine.find(v => getUniqueId(v) === getUniqueId(x)));
		adds.forEach( 
			(add) => {addToResult(result, path, JSON.stringify(add), "ArrayAdd", JSON.stringify(add), theirs.indexOf(add))} 
		);
		// TODO: merge these four lines into two
		let moveA = mine.filter(x => theirs.find(v => getUniqueId(v) === getUniqueId(x)));
		let moveB = theirs.filter(x => mine.find(v => getUniqueId(v) === getUniqueId(x)));
		let orderA = moveA.map(v => getUniqueId(v));
		let orderB = moveB.map(v => getUniqueId(v));
		if(!arraysEqual(orderA, orderB)) {
			let someHopefullyUniqueKey = "ReOrder"; // + b_crc32(JSON.stringify(orderA)); // I don't think this needs to be unique anymore
			addToResult(result, path, someHopefullyUniqueKey, "ReOrder", JSON.stringify(orderA), JSON.stringify(orderB));
		}
		for(let i = 0; i < moveA.length; i++) {
			let bIndex = moveB.findIndex( el => {if(el === moveA[i]) { return true; } else if ((el.id || el.id===0) && el.id === moveA[i].id) { return true;} } );
			diffInternal(moveA[i], moveB[bIndex], path.concat(getUniqueId(moveA[i])),result);
		};
	} else if ((mine !== null && typeof mine === 'object') && (mine !== null && typeof mine === 'object')) {
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
		throw "I don't know how to diff objects of different types!";
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
	if (value !== null && typeof value === 'object') {
		if(value.id || value.id === 0) {
			return value.id
		} else {
			//throw "Id not found" + value;
			return Object.keys(value)[0];
		}
	} else {
		return value;
	}
}

let patch = function(toPatch, patchObj) {
	Object.keys(patchObj).forEach(function(key) {
		if(isRoot(patchObj[key])) {
			let op = patchObj[key].op;
			let value = patchObj[key].key;
			if(op == "Delete") {
				if(Array.isArray(toPatch)) {
					let delIndex = toPatch.findIndex(v => getUniqueId(v) == patchObj[key]);
					toPatch.splice(delIndex, 1);
				} else { // What about primitiave?
					delete toPatch[key];
				}
			} else if(op == "ArrayAdd") {
				let position = patchObj[key].param2;//= patchObj[key].param2 < toPatch.length ? patchObj[key].param2 : (toPatch.length-1);
				toPatch.splice(position, 0, JSON.parse(patchObj[key].param1));
			} else if(op == "ReOrder") {
				let newOrder = JSON.parse(patchObj[key].param2);
				let oldOrder = JSON.parse(patchObj[key].param1);
				let replacements = []; // {1:----}, {2:----}
				for(let i = 0; i < oldOrder.length; i++) {
					let indexOld = toPatch.findIndex(v => getUniqueId(v) == oldOrder[i]);
					let indexNew = toPatch.findIndex(v => getUniqueId(v) == newOrder[i]);

					replacements.push({destination:indexNew, whatToMove:toPatch[indexOld]});
				}
				for(let i = 0; i < replacements.length; i++) {
					toPatch[replacements[i].destination] = replacements[i].whatToMove;
				}
			} else if(op == "Add") {
				toPatch[value] = patchObj[key].param1; // prim only
			} else if(op == "Edit") {
				// TODO: Check if value is param2 before change?
				toPatch[value] = patchObj[key].param2; // prim only
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
			} else if(toPatch.hasOwnProperty(key)) {
				//console.log("Prop: " + key);
				toPatchSubtree = toPatch[key]
			} else {
				throw "Can't get element from path";
			}
			patch(toPatchSubtree,patchObj[key]);
		}
	});
	return toPatch; // This modifies the passed in object, is returning that object misleading?
}

// Returns true if none of the object's properties are objects themselves.
let isRoot = function (obj) {
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