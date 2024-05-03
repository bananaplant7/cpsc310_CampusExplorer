import {Dataset} from "../model/Dataset";
import SectionsDataset from "../model/SectionsDataset";
import * as fs from "fs-extra";
import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";
import path from "path";
import {applyKeys, handleFilter, handleOptions, handleQuery, handleTransform} from "../fileUtilities/QueryHelpers";
import {Query} from "../model/Query";
import RoomDataset from "../model/RoomDataset";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private datasets: Dataset[];

	constructor() {
		this.datasets = [];
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (id === "") {
			throw new InsightError("empty string");
		} else if (id.includes("_")) {
			throw new InsightError("data set to add contains underscore");
		} else if (id.trim().length === 0) {
			throw new InsightError("string is all whitespace");
		}

		await this.loadFromStorage();

		if (this.datasets.some((el) => el.getName() === id)) {
			throw new InsightError("id taken");
		}

		if (kind === InsightDatasetKind.Sections) {
			let newDataset = new SectionsDataset(id, 0);
			try {
				await newDataset.addRows(content);
				this.datasets.push(newDataset);
				return Promise.resolve(this.datasets.map((el) => el.getName()));
			} catch (err) {
				return Promise.reject(err);
			}
		} else if (kind === InsightDatasetKind.Rooms) {
			let newDataset = new RoomDataset(id, 0);
			try {
				await newDataset.addRows(content);
				this.datasets.push(newDataset);
				return Promise.resolve(this.datasets.map((el) => el.getName()));
			} catch (err) {
				return Promise.reject(err);
			}
		}

		return Promise.reject(new InsightError());
	}

	public async getDatasets(): Promise<Dataset[]> {
		await this.loadFromStorage();
		return this.datasets;
	}

	private async loadFromStorage() {
		let files: string[];
		if (this.datasets.length !== 0) {
			return;
		}
		try {
			files = (await fs.readdir("./data")).filter((el) => path.extname(el) === ".json");
		} catch (err) {
			return;
		}
		let jobs = [];
		for (const file of files) {
			jobs.push(
				fs.readJSON(`data/${file}`).then((obj) => {
					if (obj.kind === InsightDatasetKind.Sections) {
						let recoveredDataset = new SectionsDataset(obj.name, obj.numRows);
						this.datasets.push(recoveredDataset);
					} else if (obj.kind === InsightDatasetKind.Rooms) {
						let recoveredDataset = new RoomDataset(obj.name, obj.numRows);
						this.datasets.push(recoveredDataset);
					}
				})
			);
		}
		await Promise.allSettled(jobs);
	}

	public async removeDataset(id: string): Promise<string> {
		if (id === "") {
			throw new InsightError("empty string");
		} else if (id.includes("_")) {
			throw new InsightError("data set to add contains underscore");
		} else if (id.trim().length === 0) {
			throw new InsightError("string is all whitespace");
		}
		if (this.datasets.length === 0) {
			return Promise.reject(new NotFoundError("no datasets to remove"));
		}
		let toRemove = this.datasets.find((dataset) => dataset.getName() === id);
		if (toRemove) {
			await toRemove.removeFromDisk();
			this.datasets = this.datasets.filter((dataset) => dataset.getName() !== id);
			return id;
		}
		return Promise.reject(new InsightError(`Could not find dataset ${id}`));
	}

	public async performQuery(query: Query): Promise<InsightResult[]> {
		try {

			let emptyArr: string[] = [];
			handleQuery(query, emptyArr);
			let rows = await handleFilter(query, this.datasets);
			rows = handleTransform(query, rows);
			let ans = handleOptions(query, rows);
			return Promise.resolve(ans);
		} catch (err) {
			return Promise.reject(err);
		}
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		await this.loadFromStorage();
		return Promise.resolve(
			this.datasets.map((ele) => {
				return {id: ele.getName(), kind: ele.kind, numRows: ele.getNumRows()};
			})
		);
	}
}
