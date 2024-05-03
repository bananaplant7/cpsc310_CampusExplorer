export enum FILTERS {
	AND = 1,
	OR,

	LT,
	GT,
	EQ,

	IS,

	NOT,
}

export enum MFIELD {
	avg = 1,
	pass,
	fail,
	audit,
	year,
}

export enum SFIELD {
	dept = 1,
	id,
	instructor,
	title,
	uuid
}

export enum MFIELDROOM {
	lat = 1,
	lon,
	seats
}

export enum SFIELDROOM {
	fullname = 1,
	shortname,
	number,
	name,
	address,
	type,
	furniture,
	href
}

export enum DIRECTION {
	UP = 1,
	DOWN
}

export enum APPLYTOKEN {
	MAX = 1,
	MIN,
	AVG,
	COUNT,
	SUM
}
