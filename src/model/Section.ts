export default class Section {
	constructor(
		public uuid: string,
		public id: string,
		public title: string,
		public instructor: string,
		public dept: string,
		public year: number,
		public avg: number,
		public pass: number,
		public fail: number,
		public audit: number
	) {}
}
