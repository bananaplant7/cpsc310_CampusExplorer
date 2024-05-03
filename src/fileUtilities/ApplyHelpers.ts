import Decimal from "decimal.js";

export function getMax(arr: [], key: string): number {
	// arr is an array of objects and the token tells me which obj property I want to max
	// once max found, return max

	let maxObj = arr.reduce((prev, curr) => {
		return (prev[key] > curr[key]) ? prev : curr;
	});
	return maxObj[key];
}

export function getMin(arr: [], key: string): number {
	let maxObj = arr.reduce((prev, curr) => {
		return (prev[key] < curr[key]) ? prev : curr;
	});
	return maxObj[key];
}

export function getAvg(arr: [], key: string): number {
	let numRows = arr.length;
	let sum = new Decimal(0);

	for (let obj of arr) {
		sum = Decimal.add(new Decimal(obj[key]), sum);
	}
	let avg = sum.toNumber() / numRows;
	return Number(avg.toFixed(2));
}

export function getSum(arr: [], key: string): number {
	let sum = new Decimal(0);

	for (let obj of arr) {
		sum = Decimal.add(new Decimal(obj[key]), sum);
	}
	return Number(sum.toFixed(2));
}

export function getCount(arr: [], key: string): number {
	let occurences: any = [];

	for (let obj of arr) {
		occurences.push(obj[key]);
	}

	return Array.from(new Set(occurences)).length;
}

