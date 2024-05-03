import {InsightDatasetKind} from "../controller/IInsightFacade";
import Section from "./Section";

export interface Dataset {
	kind: InsightDatasetKind;
	addRows(rows: string): Promise<void>;
	getName(): string;
	getRows(): Promise<object[]>;
	isLoaded(): boolean;
	getNumRows(): number;
	datasetToDisk(): Promise<void[]>;
	removeFromDisk(): Promise<string>;
}
