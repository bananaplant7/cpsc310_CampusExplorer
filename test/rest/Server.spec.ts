import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";

import * as fs from "fs-extra";
import {expect} from "chai";
import request, {Response} from "supertest";
import {InsightDatasetKind} from "../../src/controller/IInsightFacade";

describe("Facade D3", function () {
	let facade: InsightFacade;
	let server: Server;

	let section10: Buffer;
	let section5001: Buffer;
	let rooms: Buffer;

	let emptyQuery = {
		WHERE: {},
		OPTIONS: {
			COLUMNS: ["sections_dept", "sections_avg"],
			ORDER: "sections_avg",
		},
	};

	before(async function () {
		facade = new InsightFacade();
		server = new Server(4321);
		await server.start();

		section10 = await fs.readFile("test/resources/archives/section10.zip");
		section5001 = await fs.readFile("test/resources/archives/section5001.zip");
		rooms = await fs.readFile("test/resources/archives/campus.zip");
		// TODO: start server here once and handle errors properly
	});

	after(function () {
		// TODO: stop server here once!
		server.stop().catch((err) => {
			console.log(err);
		});
	});

	beforeEach(async function () {
		console.info("----------- start of test -----------");
	});

	afterEach(async function () {
		console.info("------------ end of test -------------");
	});

	describe("tests with reset", function () {
		afterEach(async function () {
			await request("http://localhost:4321")
				.purge("/reset")
				.then((res: Response) => {
					expect(res.status).to.be.equal(200);
					expect(res.body.result).to.be.empty;
				});
			console.info("------------ data reset -------------");
		});

		// sanity check
		it("test echo", async function () {
			try {
				const res = await request("http://localhost:4321").get("/echo/hello");
				// console.log(res);
				expect(res.status).to.be.equal(200);
				expect(res.body.result).to.include("hello");
			} catch (err: any) {
				expect.fail(err);
			}
		});

		// put add dataset tests
		it("PUT test for courses dataset", async function () {
			try {
				const res = await request("http://localhost:4321")
					.put("/dataset/section10/sections")
					.send(section10)
					.set("Content-Type", "application/x-zip-compressed");
				expect(res.status).to.be.equal(200);
				expect(res.body.result).to.deep.equal(["section10"]);
			} catch (err: any) {
				expect.fail(err);
			}
		});

		it("PUT test for rooms dataset", async function () {
			try {
				return request("http://localhost:4321")
					.put("/dataset/campusrooms/rooms")
					.send(rooms)
					.set("Content-Type", "application/x-zip-compressed")
					.then(function (res: Response) {
						expect(res.status).to.be.equal(200);
						expect(res.body.result).to.deep.equal(["campusrooms"]);
					})
					.catch(function (err) {
						expect.fail(err);
					});
			} catch (err: any) {
				expect.fail(err);
			}
		});

		it("PUT test for courses dataset, duplicate name", async function () {
			try {
				await request("http://localhost:4321")
					.put("/dataset/section10/sections")
					.send(section10)
					.set("Content-Type", "application/x-zip-compressed")
					.then(function (res: Response) {
						// some logging here please!
						expect(res.status).to.be.equal(200);
						expect(res.body.result).to.deep.equal(["section10"]);
					})
					.catch(function (err) {
						expect.fail(err);
					});

				return request("http://localhost:4321")
					.put("/dataset/section10/sections")
					.send(section10)
					.set("Content-Type", "application/x-zip-compressed")
					.then(function (res: Response) {
						// some logging here please!
						expect(res.status).to.be.equal(400);
						expect(typeof res.body.error === "string");

					})
					.catch(function (err) {
						expect.fail(err);
					});
			} catch (err: any) {
				expect.fail(err);
			}
		});

		it("PUT test for invalid name", function () {
			return request("http://localhost:4321")
				.put("/dataset/section10_/sections")
				.send(section10)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					// some logging here please!
					expect(res.status).to.be.equal(400);
					expect(typeof res.body.error === "string");
				})
				.catch(function (err) {
					expect.fail(err);
				});
		});

		// remove datasets test
		it("DELETE test for sections", async function () {
			try {
				const addRes = await request("http://localhost:4321")
					.put("/dataset/section10/sections")
					.send(section10)
					.set("Content-Type", "application/x-zip-compressed");
				expect(addRes.status).to.be.equal(200);
				expect(addRes.body.result).to.deep.equal(["section10"]);

				const delRes = await request("http://localhost:4321").delete("/dataset/section10");
				expect(delRes.status).to.be.equal(200);
				expect(delRes.body.result).to.deep.equal("section10");
			} catch (err: any) {
				expect.fail(err);
			}
		});

		it("DELETE test for rooms dataset", async function () {
			try {
				await request("http://localhost:4321")
					.put("/dataset/campusrooms/rooms")
					.send(rooms)
					.set("Content-Type", "application/x-zip-compressed")
					.then(function (res: Response) {
						expect(res.status).to.be.equal(200);
						expect(res.body.result).to.deep.equal(["campusrooms"]);
					})
					.catch(function (err) {
						expect.fail(err);
					});

				const delRes = await request("http://localhost:4321").delete("/dataset/campusrooms");
				expect(delRes.status).to.be.equal(200);
				expect(delRes.body.result).to.deep.equal("campusrooms");
			} catch (err: any) {
				expect.fail(err);
			}
		});

		it("DELETE error testing", async function () {
			try {
				const addRes = await request("http://localhost:4321")
					.put("/dataset/section10/sections")
					.send(section10)
					.set("Content-Type", "application/x-zip-compressed");
				expect(addRes.status).to.be.equal(200);
				expect(addRes.body.result).to.deep.equal(["section10"]);

				const addRes2 = await request("http://localhost:4321")
					.put("/dataset/section102/sections")
					.send(section10)
					.set("Content-Type", "application/x-zip-compressed");
				expect(addRes2.status).to.be.equal(200);
				expect(addRes2.body.result).to.deep.include("section10", "section102");

				const delRes = await request("http://localhost:4321").delete("/dataset/section10");
				expect(delRes.status).to.be.equal(200);
				expect(delRes.body.result).to.deep.equal("section10");

				const failRes = await request("http://localhost:4321").delete("/dataset/section10");
				expect(failRes.status).to.be.equal(400);
				expect(typeof failRes.body.error === "string");


				await request("http://localhost:4321")
					.delete("/dataset/section102")
					.then((res) => {
						expect(res.status).to.be.equal(200);
					});

				await request("http://localhost:4321")
					.delete("/dataset/section102")
					.then((res) => {
						expect(res.status).to.be.equal(404);
						expect(typeof res.body.error === "string");

					});
			} catch (err: any) {
				expect.fail(err);
			}
		});

		// list datasets test
		it("GET on datasets", async function () {
			try {
				const res = await request("http://localhost:4321")
					.put("/dataset/section10/sections")
					.send(section10)
					.set("Content-Type", "application/x-zip-compressed");
				expect(res.status).to.be.equal(200);
				expect(res.body.result).to.deep.equal(["section10"]);

				const listRes = await request("http://localhost:4321").get("/datasets");

				expect(listRes.body.result).to.deep.equal([
					{
						id: "section10",
						kind: InsightDatasetKind.Sections,
						numRows: 10,
					},
				]);
			} catch (err: any) {
				expect.fail(err);
			}
		});
	});

	describe("POST tests", async function () {
		after(async function () {
			await request("http://localhost:4321")
				.purge("/reset")
				.then((res: Response) => {
					expect(res.status).to.be.equal(200);
					expect(res.body.result).to.be.empty;
				});
			console.info("------------ data reset -------------");
		});
		before(async function () {
			try {
				await request("http://localhost:4321")
					.put("/dataset/rooms/room")
					.send(rooms)
					.set("Content-Type", "application/x-zip-compressed");

				await request("http://localhost:4321")
					.put("/dataset/section10/sections")
					.send(section10)
					.set("Content-Type", "application/x-zip-compressed");

				await request("http://localhost:4321")
					.put("/dataset/section5001/sections")
					.send(section5001)
					.set("Content-Type", "application/x-zip-compressed");
			} catch (e: any) {
				expect.fail(e);
			}
		});

		it("room query", async function () {
			const res = await request("http://localhost:4321")
				.post("/query")
				.send({
					WHERE: {},
					OPTIONS: {
						COLUMNS: ["rooms_furniture"]
					},
				});
			expect(res.status).to.be.equal(200);
			expect(res.body.result).have.length(364);
		});

		it("section query", async function () {
			const res = await request("http://localhost:4321")
				.post("/query")
				.send({
					WHERE: {},
					OPTIONS: {
						COLUMNS: ["section10_avg"]
					},
				});
			expect(res.status).to.be.equal(200);
			expect(res.body.result).have.length(10);
		});

		it("too large error query", async function () {
			const res = await request("http://localhost:4321")
				.post("/query")
				.send({
					WHERE: {},
					OPTIONS: {
						COLUMNS: ["section5001_avg"]
					},
				});
			expect(res.status).to.be.equal(400);
			expect(typeof res.body.error === "string");
		});
	});
});
