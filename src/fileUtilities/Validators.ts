import {APPLYTOKEN, DIRECTION, MFIELD, MFIELDROOM, SFIELD, SFIELDROOM} from "./Enums";
import {applyKeys, datasetKind} from "./QueryHelpers";

export function isValidMFIELD(field: string) {
	if (field.includes("_")) {
		field = field.split("_")[1];
	}
	if (datasetKind === "section") {
		return Object.keys(MFIELD).includes(field);
	} else {
		return Object.keys(MFIELDROOM).includes(field);
	}
}

export function isValidSFIELD(field: string) {
	if (field.includes("_")) {
		field = field.split("_")[1];
	}
	if (datasetKind === "section") {
		return Object.keys(SFIELD).includes(field);
	} else {
		return Object.keys(SFIELDROOM).includes(field);
	}
}

export function isValidApplyKey(field: string) {
	return (applyKeys.length > 0 && applyKeys.includes(field));
}

export function isValidApplyToken(field: string) {
	return Object.keys(APPLYTOKEN).includes(field);
}

export function isValidDirection(field: string) {
	return Object.keys(DIRECTION).includes(field);
}

function isSubsetOf() {
	return null;
}
