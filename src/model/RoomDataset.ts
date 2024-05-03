import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
import {zipToRooms} from "../fileUtilities/DatasetFileUtility";
import {Dataset} from "./Dataset";
import Room from "./Room";
import * as fs from "fs-extra";

export default class RoomDataset implements Dataset {
	public kind: InsightDatasetKind;
	private name: string;
	private rows: Room[];
	private numRows: number;
	private loaded: boolean;

	constructor(name: string, numRows: number) {
		this.kind = InsightDatasetKind.Rooms;
		this.name = name;
		this.rows = [];
		this.numRows = numRows;
		this.loaded = false;
	}

	public async addRows(rows: string): Promise<void> {
		try {
			this.rows = await zipToRooms(rows);
			this.loaded = true;
			this.numRows = this.rows.length;
			await this.datasetToDisk();
		} catch (err) {
			throw new InsightError(`reading zip failed with ${err}`);
		}
	}

	public getName(): string {
		return this.name;
	}

	public async getRows(): Promise<Room[]> {
		if (!this.loaded) {
			await this.loadRows();
		}
		return this.rows;
	}

	private async loadRows(): Promise<Room[]> {
		let rows = await fs.readJSON(`./data/rows/${this.name}Rows.json`);
		this.loaded = true;
		this.rows = rows.data;
		return this.rows;
	}

	public isLoaded(): boolean {
		return this.loaded;
	}

	public getNumRows(): number {
		return this.numRows;
	}

	public async datasetToDisk(): Promise<void[]> {
		let jobs = [];
		jobs.push(
			fs.outputJSON(`./data/${this.name}.json`, {
				name: this.name,
				kind: this.kind,
				numRows: this.numRows,
			})
		);
		jobs.push(
			fs.outputJSON(`./data/rows/${this.name}Rows.json`, {
				data: this.rows,
			})
		);
		return Promise.all(jobs);
	}

	public async removeFromDisk(): Promise<string> {
		let jobs = [fs.remove(`./data/${this.name}.json`), fs.remove(`./data/rows/${this.name}Rows.json`)];
		try {
			await Promise.all(jobs);
			return this.name;
		} catch (err) {
			throw new InsightError(`${err}`);
		}
	}
}
