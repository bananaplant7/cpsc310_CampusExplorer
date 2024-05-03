import http from "node:http";
export interface GeoResponse {
	lat?: number;
	lon?: number;
	error?: string;
}

export default class Room {
	public lon: number;
	public lat: number;

	constructor(
		public fullname: string,
		public shortname: string,
		public number: string,
		public name: string,
		public address: string,
		public seats: number,
		public type: string,
		public furniture: string,
		public href: string,
		lon: number,
		lat: number
	) {
		this.lon = lon;
		this.lat = lat;
	}

	public static async getCoords(address: string): Promise<GeoResponse> {
		let addressToRequest = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team186/${address.replaceAll(
			" ",
			"%20"
		)}`;

		let data: GeoResponse = await this.makeRequest(addressToRequest);
		if (!data.error) {
			return Promise.resolve({lon: data.lon, lat: data.lat});
		}
		return Promise.reject();
	}

	private static makeRequest(addressToRequest: string): Promise<object> {
		return new Promise((resolve, reject) => {
			let req = http.get(addressToRequest, (res) => {
				res.setEncoding("utf8");
				let rawData = "";
				res.on("data", (chunk) => {
					rawData += chunk;
				});
				res.on("end", () => {
					try {
						const parsedData = JSON.parse(rawData);
						resolve(parsedData);
					} catch (e) {
						console.error(e);
					}
				});
			});
		});
	}
}
