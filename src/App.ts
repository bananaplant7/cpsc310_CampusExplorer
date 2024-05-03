import * as fs from "fs-extra";
import Server from "./rest/Server";
import request, {Response} from "supertest";

/**
 * Main app class that is run with the node command. Starts the server.
 */
export class App {
	public async initServer(port: number) {
		console.info(`App::initServer( ${port} ) - start`);

		const server = new Server(port);
		try {
			await server
				.start();
			console.info("App::initServer() - started");
			let rooms: Buffer = await fs.readFile("test/resources/archives/campus.zip");
			await request("http://localhost:4321")
				.put("/dataset/campusrooms/rooms")
				.send(rooms)
				.set("Content-Type", "application/x-zip-compressed");
		} catch (err: any) {
			console.error(`App::initServer() - ERROR: ${err.message}`);
		}
	}
}

// This ends up starting the whole system and listens on a hardcoded port (4321)
console.info("App - starting");
const app = new App();
(async () => {
	await app.initServer(4321);
})();
