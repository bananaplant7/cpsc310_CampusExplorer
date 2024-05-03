import {Order} from "./Order";

export interface Options {
	COLUMNS: string[];
	// ORDER?: string | undefined;
	ORDER?: string | Order | undefined;
}
