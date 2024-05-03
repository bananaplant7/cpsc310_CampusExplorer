import {Request, Response} from "express";
import {IInsightFacade, InsightDatasetKind, InsightError, NotFoundError} from "../controller/IInsightFacade";
import InsightFacade from "../controller/InsightFacade";
import * as fs from "fs-extra";

export default class InsightServer {
	private InsightFacade: IInsightFacade;
	private readonly persistDir = "./data";

	constructor() {
		this.InsightFacade = new InsightFacade();
	}

	public echo(req: Request, res: Response) {
		try {
			console.info(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
			const response = this.performEcho(req.params.msg);
			res.status(200).json({result: response});
		} catch (e) {
			return res.status(400).json({error: this.getErrorMessage(e)});
		}
	}

	private performEcho(msg: string): string {
		if (typeof msg !== "undefined" && msg !== null) {
			return `${msg}...${msg}`;
		} else {
			return "Message not provided";
		}
	}

	public async reset(req: Request, res: Response) {
		console.info("Server::reset()");
		try {
			await await fs.remove(this.persistDir);
			this.InsightFacade = new InsightFacade();
			res.status(200).json({result: await this.InsightFacade.listDatasets()});
		} catch (e) {
			res.status(400).json({error: this.getErrorMessage(e)});
		}


	}

	public async addDataset(req: Request, res: Response) {
		try {
			console.info(`Server::put(..) params: ${JSON.stringify(req.params)}`);
			const string = Buffer.from(req.body).toString("base64");
			const id = req.params.id;
			const kind = this.getDatasetKind(req.params.kind);
			const datasets: string[] = await this.InsightFacade.addDataset(id, string, kind);
			res.status(200).json({result: datasets});
		} catch(e) {
			console.info(`	Server::put(..) failed with: ${e}`);
			res.status(400).json({error: this.getErrorMessage(e)});
		}
	}

	public async removeDataset(req: Request, res: Response) {
		try {
			console.info(`Server::delete(..) params: ${JSON.stringify(req.params)}`);
			const id = req.params.id;
			const removedDataset: string = await this.InsightFacade.removeDataset(id);
			res.status(200).json({result: removedDataset});
		} catch (e) {
			console.info(`	Server::delete(..) failed with: ${e}`);
			if (e instanceof InsightError) {
				res.status(400).json({error: e});
			} else if (e instanceof NotFoundError) {
				res.status(404).json({error: this.getErrorMessage(e)});
			}
		}
	}

	public async listDatasets(req: Request, res: Response) {
		try {
			console.info("Server::get(..) ie. listDatasets");
			const datasetList = await this.InsightFacade.listDatasets();
			res.status(200).json({result: datasetList});
		} catch (e) {
			console.info(`	Server::get(..) failed with: ${e}`);
			res.status(400).json({error: this.getErrorMessage(e)});
		}
	}

	public async performQuery(req: Request, res: Response) {
		try {
			console.info(`Server::pos(..) ${req.params}`);
			console.log(typeof req.body);
			let query = req.body;
			const queryRes = await this.InsightFacade.performQuery(query);
			res.status(200).json({result: queryRes});
		} catch (e) {
			console.info(`	Server::post(..) failed with: ${e}`);
			res.status(400).json({error: this.getErrorMessage(e)});
		}
	}

	private getDatasetKind(kind: string) {
		if (kind.includes("section")) {
			return InsightDatasetKind.Sections;
		} else if (kind.includes("room")) {
			return InsightDatasetKind.Rooms;
		} else {
			throw new Error("no such insightKind");
		}
	}

	private getErrorMessage(error: unknown) {
		if (error instanceof Error) {
			return error.message;
		}
		return String(error);
	}
}
