import {isValidMFIELD, isValidSFIELD} from "./Validators";
import {InsightError} from "../controller/IInsightFacade";
import {Query} from "../model/Query";
import {datasetID} from "./QueryHelpers";

function handleMCOMP(filter: string) {
	if (filter === "LT") {
		return "<";
	} else if (filter === "GT") {
		return ">";
	} else if (filter === "EQ") {
		return "===";
	} else {
		return "";
	}
}

function handleLogic(query: Query, filter: string, filterObj: any, rows: any, newRows: any) {
	if (Object.keys(filterObj).length === 0) {
		throw new InsightError("filter object can't be empty");
	}
	let arr = filterObj[filter];
	if (arr.constructor !== Array) {
		throw new InsightError("logical filter doesn't have filter list");
	} else if (arr.length === 0) {
		throw new InsightError("logic filter has empty array");
	}
	newRows = [...rows];

	if (filter === "AND") {
		for (let item of arr) {
			newRows = applyFilter(query, item, newRows);
		}
	} else if (filter === "OR") {
		let ans: any[] = [];
		for (let item of arr) {
			let rowsCopy = applyFilter(query, item, newRows);
			ans = ans.concat(rowsCopy);
		}
		newRows = Array.from(new Set(ans)); // remove duplicates
	}

	return newRows;
}

function handleIS(val: string, field: string, rows: any, newRows: any) {
	if (typeof val !== "string" || !isValidSFIELD(field)) {
		throw new InsightError("scomp has wrong field or type");
	}
	// start*, *end, *contain*, exact
	let starCount = (val.match(/\*/g) || []).length;

	if (starCount === 0) {
		// exact string
		for (let section of rows) {
			if (section[field] === val) {
				newRows.push(section);
			}
		}
	} else if (starCount === 1 && val.startsWith("*")) {
		val = val.replace(/\*/g, "");
		for (let section of rows) {
			if (section[field].endsWith(val)) {
				newRows.push(section);
			}
		}
	} else if (starCount === 1 && val.endsWith("*")) {
		val = val.replace(/\*/g, "");

		for (let section of rows) {
			if (section[field].startsWith(val)) {
				newRows.push(section);
			}
		}
	} else if (starCount === 2 && val.startsWith("*") && val.endsWith("*")) {
		val = val.replace(/\*/g, "");
		for (let section of rows) {
			if (String(section[field]).includes(String(val))) {
				newRows.push(section);
			}
		}
	} else {
		throw new InsightError("'*' aren't right");
	}
	return newRows;
}

export function applyFilter(query: Query, filterObj: any, rows: any) {
	let filter = Object.keys(filterObj)[0]; // eg "GT"
	let key = Object.keys(filterObj[filter])[0]; // eg "sections_avg"
	let val = filterObj[filter][key]; // eg 95
	let field = "";

	let hasKey = /(LT|GT|EQ|IS)/;
	if (hasKey.test(filter)) {
		if (key == null) {
			throw new InsightError(`${filter} is empty`);
		} else if (Object.keys(filterObj[filter]).length > 1) {
			throw new InsightError(`${filter} must provide a single value`);
		}
		field = key.split("_")[1];
		if (key.split("_")[0] !== datasetID) {
			throw new InsightError("inconsistent dataset in filter");
		}
	}
	let comparator = "";
	let newRows: any[] = [];

	if (Object.keys(filterObj).length === 0) {
		throw new InsightError("filter object can't be empty");
	}

	if (filter === "LT" || filter === "GT" || filter === "EQ") {
		if (typeof val !== "number" || !isValidMFIELD(field)) {
			throw new InsightError("mcomp has wrong field or type");
		}
		comparator = handleMCOMP(filter);
	} else if (filter === "AND" || filter === "OR") {
		return handleLogic(query, filter, filterObj, rows, newRows);
	} else if (filter === "NOT") {
		newRows = [...rows];

		let positives = applyFilter(query, filterObj[filter], newRows);
		newRows = newRows.filter((item) => !positives.includes(item));

		return newRows;
	} else if (filter === "IS") {
		return handleIS(val, field, rows, newRows);
	} else {
		throw new InsightError("invalid comparator");
	}

	for (let section of rows) {
		if (Function(`return ${section[field]} ${comparator} ${val}`)()) {
			newRows.push(section);
		}
	}
	return newRows;
}
