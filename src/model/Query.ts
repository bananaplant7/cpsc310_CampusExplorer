import {Options} from "./Options";
import {Transformations} from "./Transformations";

export interface Query {
	WHERE: object;
	OPTIONS: Options;
	TRANSFORMATIONS?: Transformations;
}
