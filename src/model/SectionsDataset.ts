import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
import {zipToSections} from "../fileUtilities/DatasetFileUtility";
import {Dataset} from "./Dataset";
import * as fs from "fs-extra";
import Section from "./Section";

export default class SectionDataset implements Dataset {
	public kind: InsightDatasetKind;
	private name: string;
	private rows: Section[];
	private numRows: number;
	private loaded: boolean;

	constructor(name: string, numRows: number) {
		this.kind = InsightDatasetKind.Sections;
		this.name = name;
		this.rows = [];
		this.numRows = numRows;
		this.loaded = false;
	}

	// this should only ever be called once for each dataset
	public async addRows(rows: string) {
		try {
			this.rows = await zipToSections(rows);
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

	public async getRows(): Promise<Section[]> {
		if (this.loaded) {
			return this.rows;
		} else {
			return await this.loadRows();
		}
	}

	public isLoaded(): boolean {
		return this.loaded;
	}

	public getNumRows(): number {
		return this.numRows;
	}

	// writes basic information to ./data/${name}.json then writes all row data in a seperate json
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

	// retrieves row data in json ./data/rows/${name}Rows.json
	private async loadRows(): Promise<Section[]> {
		let rows = await fs.readJSON(`./data/rows/${this.name}Rows.json`);
		this.loaded = true;
		this.rows = rows.data;
		return this.rows;
	}

	// deletes all json files associated with this dataset in ./data
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
