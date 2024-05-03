import {InsightDatasetKind, InsightError, InsightResult, ResultTooLargeError} from "../controller/IInsightFacade";
import {Query} from "../model/Query";
import {FILTERS} from "./Enums";
import {isValidApplyKey, isValidApplyToken, isValidDirection, isValidMFIELD, isValidSFIELD} from "./Validators";
import {applyFilter} from "./FilterHelpers";
import {Apply} from "../model/Apply";
import {getAvg, getCount, getMax, getMin, getSum} from "./ApplyHelpers";
import {Order} from "../model/Order";

export let datasetID: string;
export let datasetKind: string;
export let applyKeys: string[] = [];

function handleQuery(query: Query, emptyArr: string[]) {
	applyKeys = emptyArr;

	// validation
	let where = query.WHERE;
	let options = query.OPTIONS;
	let transformations = query.TRANSFORMATIONS;

	if (typeof where !== "object") {
		throw new InsightError("WHERE is wrong type");
	}
	if (where == null) {
		throw new InsightError("WHERE is null");
	}

	if (typeof options !== "object") {
		throw new InsightError("OPTIONS is wrong type");
	}
	if (options == null) {
		throw new InsightError("OPTIONS is null");
	}

	if (Object.keys(query).length > 3) {
		throw new InsightError("query has wrong number of keys");
	}
}

async function handleFilter(query: any, data: any) {
	let filter = Object.keys(query.WHERE)[0];
	let columns = query.OPTIONS.COLUMNS;
	if (columns == null) {
		throw new InsightError("COLUMNS must be defined");
	} else if (columns.length === 0) {
		throw new InsightError("COLUMNS must be non-empty");
	}
	for (let col of columns) {
		if (col.includes("_")) {
			datasetID = col.split("_")[0];
			break;
		}
	}

	let rows;
	// get rows from correct dataset
	for (let dataset of data) {
		if (dataset.getName() === datasetID) {
			rows = dataset;
			if (rows.kind === InsightDatasetKind.Sections) {
				datasetKind = "section";
			} else {
				datasetKind = "room";
			}
			break;
		}
	}
	try {
		rows = await rows.getRows();
	} catch (err) {
		throw new InsightError(`failed to getRows from ${datasetID}`);
	}

	// if no filter, exit (it's allowed)
	if (filter == null) {
		return rows;
	}

	// invalid filter
	if (!Object.values(FILTERS).includes(filter)) {
		throw new InsightError(`invalid filter key ${filter}`);
	}

	rows = applyFilter(query, query.WHERE, rows);

	return rows;
}

function handleGroup(query: any, rows: any) {
	let group = query.TRANSFORMATIONS.GROUP;

	let grouped: any = {};
	for (let section of rows) {
		let groupKey = group.map((key: string) => section[key.split("_")[1]]).join("_");
		if (!grouped[groupKey]) {
			grouped[groupKey] = [];
		}
		grouped[groupKey].push(section);
	}
	return grouped;
}

function handleApply(query: any, grouped: any) {
	let apply = query.TRANSFORMATIONS.APPLY;
	let singles: any = [];
	if (apply.length === 0) {
		for (let grouping in grouped) {
			let representative = grouped[grouping][0];
			singles.push(representative);
		}
		return singles;
	} else {
		for (let grouping in grouped) {
			let representative = grouped[grouping][0];
			for (let i = 0; i < apply.length; i++) {
				let applyKeyName = applyKeys[i];
				let applyObj: Apply = apply[i];
				let applyToken = Object.keys(applyObj[applyKeyName])[0]; // eg MAX
				let key = Object.values(applyObj[applyKeyName])[0].split("_")[1]; // eg rooms_furniture -> furniture
				if (!isValidApplyToken(applyToken)) {
					throw new InsightError("invalid apply token");
				}

				if (!isValidMFIELD(key) && !isValidSFIELD(key)) {
					throw new InsightError(`invalid field ${key}`);
				}

				let filtered = grouped[grouping].filter(
					(x: any) => !(x.key === "" || x.key === "_" || x.key === Number.NEGATIVE_INFINITY)
				);
				if (filtered.length > 5000) {
					throw new ResultTooLargeError("group has > 5000 results");
				}
				if (applyToken === "MAX" && isValidMFIELD(key)) {
					representative[applyKeyName] = getMax(filtered, key);
				} else if (applyToken === "MIN" && isValidMFIELD(key)) {
					representative[applyKeyName] = getMin(filtered, key);
				} else if (applyToken === "AVG" && isValidMFIELD(key)) {
					representative[applyKeyName] = getAvg(filtered, key);
				} else if (applyToken === "SUM" && isValidMFIELD(key)) {
					representative[applyKeyName] = getSum(filtered, key);
				} else if (applyToken === "COUNT" && (isValidMFIELD(key) || isValidSFIELD(key))) {
					representative[applyKeyName] = getCount(filtered, key);
				} else {
					throw new InsightError(`check validity of field: ${key}`);
				}
			}
			singles.push(representative);
		}
		return singles;
	}
}

function handleTransformValidation(query: any) {
	let transformations = query.TRANSFORMATIONS;
	if (transformations) {
		for (let key of transformations.GROUP) {
			if (!key.includes("_") || (!isValidSFIELD(key.split("_")[1]) && !isValidMFIELD(key.split("_")[1]))) {
				throw new InsightError("invalid group key");
			}
		}
		if (transformations.GROUP == null || transformations.APPLY == null) {
			throw new InsightError("given transformation, both GROUP & APPLY must be defined");
		} else if (transformations.GROUP.length === 0) {
			throw new InsightError("group can't be empty");
		} else if (transformations.APPLY.length !== 0) {
			for (let applyKey of transformations.APPLY) {
				let applyKeyName = Object.keys(applyKey)[0];
				if (applyKeyName.includes("_")) {
					throw new InsightError("applykey can't include _");
				}
				applyKeys.push(applyKeyName);
			}
			if (Array.from(new Set(applyKeys)).length < transformations.APPLY.length) {
				throw new InsightError("duplicate applykey name");
			}
		}
	}
}
function handleTransform(query: any, rows: any) {
	handleTransformValidation(query);
	if (query.TRANSFORMATIONS == null) {
		return rows;
	}

	let grouped = handleGroup(query, rows);
	let singles = handleApply(query, grouped);

	return singles;
}

function handleorderValidation(query: Query) {
	let options = query.OPTIONS;
	let columns = options.COLUMNS;
	let order = options.ORDER;
	if (order === undefined) {
		return;
	}
	if (typeof order === "string") {
		let orderField = order.split("_")[1];
		if (order === "") {
			throw new InsightError("ORDER shouldn't be empty str");
		} else if (!isValidMFIELD(orderField) && !isValidSFIELD(orderField)) {
			throw new InsightError("invalid ORDER key");
		} else if (order && order.split("_")[0] !== datasetID) {
			throw new InsightError("ORDER references diff dataset");
		} else if (!columns.includes(order)) {
			throw new InsightError("ORDER must be in COLUMNS");
		}
	} else if (typeof order === "object") {
		if (order.dir == null || order.keys == null) {
			throw new InsightError("dir or keys null in order object");
		} else if (Object.keys(order).length > 2) {
			throw new InsightError("wrong number of keys in order object");
		} else if (Array.isArray(order.keys) && order.keys.length === 0) {
			throw new InsightError("order keys isn't array or is empty");
		} else if (!isValidDirection(order.dir)) {
			throw new InsightError("invalid order direction");
		} else {
			for (let x of order.keys) {
				if (typeof x !== "string") {
					throw new InsightError("order key not a string");
				} else if (!isValidMFIELD(x) && !isValidSFIELD(x) && !applyKeys.includes(x)) {
					throw new InsightError("order keys contains invalid key");
				}
			}
		}
	} else {
		throw new InsightError("order is wrong type");
	}
}

function handleOptionsValidation(query: Query) {
	let options = query.OPTIONS;
	let columns = options.COLUMNS;

	// OPTIONS checking
	if (typeof options !== "object") {
		throw new InsightError("OPTIONS is wrong type");
	} else if (Object.keys(options).length > 2) {
		throw new InsightError("OPTIONS has wrong number of keys");
	} else if (options == null) {
		throw new InsightError("OPTIONS is null");
	}

	// COLUMNS checking
	if (columns == null) {
		throw new InsightError("COLUMNS is null");
	} else if (columns.length === 0) {
		throw new InsightError("COLUMNS must be non-empty");
	}
	// check that each column has the same ID
	for (let entry of columns) {
		if (entry.includes("_")) {
			if (entry.split("_")[0] !== datasetID) {
				throw new InsightError("COLUMNS must request fields from a single dataset");
			} else {
				continue;
			}
		} else if (applyKeys.length > 0 && !applyKeys.includes(entry)) {
			throw new InsightError("not a valid applykey");
		}
	}

	// ORDER checking
	handleorderValidation(query);
}

function handleOptions(query: Query, rows: any) {
	// validation
	if (rows.length > 5000) {
		throw new ResultTooLargeError("too many results");
	}
	let options = query.OPTIONS;
	let columns = options.COLUMNS;
	handleOptionsValidation(query);

	// display correct columns
	let ans: InsightResult[] = [];
	for (let section of rows) {
		let obj: InsightResult = {};
		for (let entry of columns) {
			let field = "";
			if (entry.includes("_")) {
				field = entry.split("_")[1];
			} else {
				field = entry;
			}

			if (!query.TRANSFORMATIONS) {
				if (isValidSFIELD(field)) {
					obj[entry] = String(section[field]);
				} else if (isValidMFIELD(field)) {
					obj[entry] = Number(section[field]);
				} else {
					throw new InsightError(`invalid field ${field}`);
				}
			} else {
				// check that COLUMNS is a subset of group or apply

				if (isValidApplyKey(field) || query.TRANSFORMATIONS.GROUP.includes(`${datasetID}_${field}`)) {
					obj[entry] = section[field];
				} else {
					throw new InsightError("if TRANSFORMATIONS present, columns must be in GROUP or APPLY");
				}
			}

		}
		ans.push(obj);
	}

	return handleOrder(query, ans);
}

function handleOrder(query: any, ans: InsightResult[]) {
	let order = query.OPTIONS.ORDER;
	if (typeof order === "string") {
		ans.sort((a, b): any => {
			return a[order] > b[order] ? 1 : -1;
		});
	} else if (typeof order === "object") {
		ans.sort((a, b): any => {
			for (let key of order.keys) {
				if (a[key] > b[key]) {
					return order.dir === "UP" ? 1 : -1;
				} else if (a[key] < b[key]) {
					return order.dir === "UP" ? -1 : 1;
				}
			}
		});
	}
	return ans;
}

export {handleQuery, handleOptions, handleFilter, handleTransform};
