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
			(del) => {addToResult(result,path,getUniqueId(del),"Delete")}
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
			// This is not great.
			// There should not be anything in mine or theirs that has this key. We'll try to make it unique enough.
			let someHopefullyUniqueKey = "ReOrder" + b_crc32(JSON.stringify(orderA));
			addToResult(result, path, someHopefullyUniqueKey, "ReOrder", JSON.stringify(orderA), JSON.stringify(orderB));
		}
		for(let i = 0; i < moveA.length; i++) {
			let bIndex = moveB.findIndex( el => {if(el === moveA[i]) { return true; } else if ((el.id || el.id===0) && el.id === moveA[i].id) { return true;} } );
			diffInternal(moveA[i], moveB[bIndex], path.concat(getUniqueId(moveA[i])),result);
		};
	} else if ((mine !== null && typeof mine === 'object') && (mine !== null && typeof mine === 'object')) {
		let deletes = Object.keys(mine).filter(x => !Object.keys(theirs).find(v => getUniqueId(mine[v]) === getUniqueId(mine[x])));
		deletes.forEach( 
			(del) => {addToResult(result,path,getUniqueId(del),"Delete")}
		);
		let adds = Object.keys(theirs).filter(x => !Object.keys(mine).find(v => getUniqueId(v) === getUniqueId(x)));
		adds.forEach( 
			(add) => {addToResult(result,path,getUniqueId(add),"Add",theirs[add])}
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

// https://stackoverflow.com/questions/18638900/javascript-crc32
let a_table = "00000000 77073096 EE0E612C 990951BA 076DC419 706AF48F E963A535 9E6495A3 0EDB8832 79DCB8A4 E0D5E91E 97D2D988 09B64C2B 7EB17CBD E7B82D07 90BF1D91 1DB71064 6AB020F2 F3B97148 84BE41DE 1ADAD47D 6DDDE4EB F4D4B551 83D385C7 136C9856 646BA8C0 FD62F97A 8A65C9EC 14015C4F 63066CD9 FA0F3D63 8D080DF5 3B6E20C8 4C69105E D56041E4 A2677172 3C03E4D1 4B04D447 D20D85FD A50AB56B 35B5A8FA 42B2986C DBBBC9D6 ACBCF940 32D86CE3 45DF5C75 DCD60DCF ABD13D59 26D930AC 51DE003A C8D75180 BFD06116 21B4F4B5 56B3C423 CFBA9599 B8BDA50F 2802B89E 5F058808 C60CD9B2 B10BE924 2F6F7C87 58684C11 C1611DAB B6662D3D 76DC4190 01DB7106 98D220BC EFD5102A 71B18589 06B6B51F 9FBFE4A5 E8B8D433 7807C9A2 0F00F934 9609A88E E10E9818 7F6A0DBB 086D3D2D 91646C97 E6635C01 6B6B51F4 1C6C6162 856530D8 F262004E 6C0695ED 1B01A57B 8208F4C1 F50FC457 65B0D9C6 12B7E950 8BBEB8EA FCB9887C 62DD1DDF 15DA2D49 8CD37CF3 FBD44C65 4DB26158 3AB551CE A3BC0074 D4BB30E2 4ADFA541 3DD895D7 A4D1C46D D3D6F4FB 4369E96A 346ED9FC AD678846 DA60B8D0 44042D73 33031DE5 AA0A4C5F DD0D7CC9 5005713C 270241AA BE0B1010 C90C2086 5768B525 206F85B3 B966D409 CE61E49F 5EDEF90E 29D9C998 B0D09822 C7D7A8B4 59B33D17 2EB40D81 B7BD5C3B C0BA6CAD EDB88320 9ABFB3B6 03B6E20C 74B1D29A EAD54739 9DD277AF 04DB2615 73DC1683 E3630B12 94643B84 0D6D6A3E 7A6A5AA8 E40ECF0B 9309FF9D 0A00AE27 7D079EB1 F00F9344 8708A3D2 1E01F268 6906C2FE F762575D 806567CB 196C3671 6E6B06E7 FED41B76 89D32BE0 10DA7A5A 67DD4ACC F9B9DF6F 8EBEEFF9 17B7BE43 60B08ED5 D6D6A3E8 A1D1937E 38D8C2C4 4FDFF252 D1BB67F1 A6BC5767 3FB506DD 48B2364B D80D2BDA AF0A1B4C 36034AF6 41047A60 DF60EFC3 A867DF55 316E8EEF 4669BE79 CB61B38C BC66831A 256FD2A0 5268E236 CC0C7795 BB0B4703 220216B9 5505262F C5BA3BBE B2BD0B28 2BB45A92 5CB36A04 C2D7FFA7 B5D0CF31 2CD99E8B 5BDEAE1D 9B64C2B0 EC63F226 756AA39C 026D930A 9C0906A9 EB0E363F 72076785 05005713 95BF4A82 E2B87A14 7BB12BAE 0CB61B38 92D28E9B E5D5BE0D 7CDCEFB7 0BDBDF21 86D3D2D4 F1D4E242 68DDB3F8 1FDA836E 81BE16CD F6B9265B 6FB077E1 18B74777 88085AE6 FF0F6A70 66063BCA 11010B5C 8F659EFF F862AE69 616BFFD3 166CCF45 A00AE278 D70DD2EE 4E048354 3903B3C2 A7672661 D06016F7 4969474D 3E6E77DB AED16A4A D9D65ADC 40DF0B66 37D83BF0 A9BCAE53 DEBB9EC5 47B2CF7F 30B5FFE9 BDBDF21C CABAC28A 53B39330 24B4A3A6 BAD03605 CDD70693 54DE5729 23D967BF B3667A2E C4614AB8 5D681B02 2A6F2B94 B40BBE37 C30C8EA1 5A05DF1B 2D02EF8D";
let b_table = a_table.split(' ').map(function(s){ return parseInt(s,16) });
function b_crc32 (str) {
    var crc = -1;
    for(var i=0, iTop=str.length; i<iTop; i++) {
        crc = ( crc >>> 8 ) ^ b_table[( crc ^ str.charCodeAt( i ) ) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
};

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
			console.log(op);
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

// Reutrns true if none of the object's properties are objects themselves.
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