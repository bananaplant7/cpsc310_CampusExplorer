import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";

import chai, {assert, expect, use, should} from "chai";
import chaiAsPromised from "chai-as-promised";
import {clearDisk, getContentFromArchives, readFileQueries} from "../TestUtil";
import {Dataset} from "../../src/model/Dataset";
import SectionsDataset from "../../src/model/SectionsDataset";

use(chaiAsPromised);
chai.should();

export interface ITestQuery {
	title: string;
	input: unknown;
	errorExpected: boolean;
	expected: any;
}

describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let sectionsMixedValid: string;
	let sections10: string;
	let sections5000: string;
	let emptyZip: string;
	let emptyCourses: string;
	let garbageData: string;
	let courseAndGarbage: string;
	let rooms: string;

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("pair.zip");
		sections10 = await getContentFromArchives("section10.zip");
		sections5000 = await getContentFromArchives("section5000.zip");
		sectionsMixedValid = await getContentFromArchives("twoCourseMixedValid.zip");
		emptyZip = await getContentFromArchives("empty.zip");
		emptyCourses = await getContentFromArchives("emptyWithCourses.zip");
		garbageData = await getContentFromArchives("garbageData.zip");
		courseAndGarbage = await getContentFromArchives("oneCourseWithGarbage.zip");
		rooms = await getContentFromArchives("campus.zip");
		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();
	});

	describe("AddDataset", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		it("should reject with  an empty dataset id", async function () {
			const result = facade.addDataset("", sections, InsightDatasetKind.Sections);

			return result.should.to.eventually.be.rejectedWith(InsightError);
		});
		it("should reject with a white-space dataset id", async function () {
			const result = facade.addDataset("    ", sections, InsightDatasetKind.Sections);

			return result.should.to.eventually.be.rejectedWith(InsightError);
		});
		it("empty zip", function () {
			return facade
				.addDataset("emptydataset", emptyZip, InsightDatasetKind.Sections)
				.should.eventually.be.rejectedWith(InsightError);
		});
		it("id includes underscore", function () {
			return facade
				.addDataset("under_score", sections, InsightDatasetKind.Sections)
				.should.eventually.be.rejectedWith(InsightError);
		});
		it("null data sections", function () {
			return facade
				.addDataset("sections", "", InsightDatasetKind.Sections)
				.should.eventually.be.rejectedWith(InsightError);
		});
		it("null data rooms", function () {
			return facade
				.addDataset("sections", "", InsightDatasetKind.Rooms)
				.should.eventually.be.rejectedWith(InsightError);
		});
		it("no courses in zip", function () {
			return facade
				.addDataset("courses empty", emptyZip, InsightDatasetKind.Sections)
				.should.eventually.be.rejectedWith(InsightError);
		});
		it("no rooms in zip", function () {
			return facade
				.addDataset("rooms empty", emptyZip, InsightDatasetKind.Rooms)
				.should.eventually.be.rejectedWith(InsightError);
		});
		it("no files in courses", function () {
			return facade
				.addDataset("courses empty", emptyCourses, InsightDatasetKind.Sections)
				.should.eventually.be.rejectedWith(InsightError);
		});
		it("garbage data in courses folder", function () {
			return facade
				.addDataset("courses empty", garbageData, InsightDatasetKind.Sections)
				.should.eventually.be.rejectedWith(InsightError);
		});
		it("simple add", async function () {
			let datasets: string[] = await facade.addDataset("10 sections", sections10, InsightDatasetKind.Sections);
			datasets.should.deep.equal(["10 sections"]);
			return facade.listDatasets().should.eventually.deep.equal([
				{
					id: "10 sections",
					kind: InsightDatasetKind.Sections,
					numRows: 10,
				},
			]);
		});
		it("simple room add", async function () {
			await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
			let datasets = await facade.listDatasets();
			datasets.should.be.length(1);
			datasets[0].should.have.property("kind", InsightDatasetKind.Rooms);
		});
		// it("one room add", async function () {
		// 	await facade.addDataset(
		// 		"rooms",
		// 		await getContentFromArchives("campus_one_room.zip"),
		// 		InsightDatasetKind.Rooms
		// 	).should.eventually.fulfilled;
		// 	let datasets = await facade.listDatasets();
		// 	datasets.should.be.length(1);
		// 	datasets[0].should.have.property("kind", InsightDatasetKind.Rooms);
		// });
		it("adding sections with course zip", async function () {
			return facade
				.addDataset("10 sections", sections10, InsightDatasetKind.Rooms)
				.should.eventually.be.rejectedWith(InsightError);
		});
		it("complex add", function () {
			return facade
				.addDataset("pair", sections, InsightDatasetKind.Sections)
				.should.eventually.deep.equal(["pair"]);
		});
		it("checking time", function () {
			return facade
				.addDataset("5000", sections5000, InsightDatasetKind.Sections)
				.should.eventually.deep.equal(["5000"]);
		});
		it("should not be able to add identical id's", async function () {
			await facade.addDataset("one course", sections10, InsightDatasetKind.Sections);
			let datasets = await facade
				.addDataset("one course", sections10, InsightDatasetKind.Sections)
				.should.eventually.be.rejectedWith(InsightError);
			return facade.listDatasets().should.eventually.have.lengthOf(1);
		});
		it("identical ids only returns one of ids", async function () {
			await facade.addDataset("one section", sections10, InsightDatasetKind.Sections);
			await facade
				.addDataset("one section", sections10, InsightDatasetKind.Sections)
				.should.eventually.rejectedWith(InsightError);
			let addedDatasets = await facade.addDataset("second section", sections10, InsightDatasetKind.Sections);
			addedDatasets.should.have.length(2);
			addedDatasets.should.includes("one section");
			addedDatasets.should.includes("second section");
		});
		it("mixed set prunes invalid", async function () {
			await facade.addDataset("two sections one invalid", sectionsMixedValid, InsightDatasetKind.Sections);
			const datasets = await facade.listDatasets();
			return datasets.should.to.deep.equal([
				{
					id: "two sections one invalid",
					kind: InsightDatasetKind.Sections,
					numRows: 1,
				},
			]);
		});
		it("mixed set prunes garbage", async function () {
			await facade.addDataset("two sections one garbage", courseAndGarbage, InsightDatasetKind.Sections);
			const datasets = await facade.listDatasets();
			return datasets.should.to.deep.equal([
				{
					id: "two sections one garbage",
					kind: InsightDatasetKind.Sections,
					numRows: 1,
				},
			]);
		});
		it("two datasets", async function () {
			await facade.addDataset("two sections", sections10, InsightDatasetKind.Sections);
			await facade.addDataset("second two sections", sectionsMixedValid, InsightDatasetKind.Sections);

			const datasets = await facade.listDatasets();
			return datasets.should.deep.equal([
				{
					id: "two sections",
					kind: InsightDatasetKind.Sections,
					numRows: 10,
				},
				{
					id: "second two sections",
					kind: InsightDatasetKind.Sections,
					numRows: 1,
				},
			]);
		});
		it("persistent between facades", async function () {
			await facade.addDataset("section", sections10, InsightDatasetKind.Sections);
			await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
			facade = new InsightFacade();
			const datasets = await facade.listDatasets();
			datasets.should.deep.contain({
				id: "section",
				kind: InsightDatasetKind.Sections,
				numRows: 10,
			});
			datasets.should.be.lengthOf(2);
		});
		it("loading rows", async function () {
			await facade.addDataset("section", sections10, InsightDatasetKind.Sections);
			await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
			facade = new InsightFacade();
			let datasets = await facade.listDatasets();
			datasets.should.have.lengthOf(2);
			await facade.performQuery({
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["section_dept", "section_avg"],
					ORDER: "section_avg",
				},
			}).should.eventually.have.length(10);

			await facade.performQuery({
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["rooms_furniture"]
				},
			}).should.eventually.have.length(364);

		});
	});

	describe("removeDataset", function () {
		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
		});
		it("remove single set", async function () {
			await facade.addDataset("ten course", sections10, InsightDatasetKind.Sections);
			await facade.removeDataset("ten course").should.eventually.equal("ten course");
			return await facade.listDatasets().should.eventually.be.empty;
		});
		it("can add back removed dataset", async function () {
			await facade.addDataset("ten course", sections10, InsightDatasetKind.Sections);
			await facade.removeDataset("ten course");
			return facade
				.addDataset("ten course", sections10, InsightDatasetKind.Sections)
				.should.eventually.be.fulfilled.deep.equal(["ten course"]);
		});
		it("double remove same id", async function () {
			await facade.addDataset("ten course", sections10, InsightDatasetKind.Sections);
			await facade.removeDataset("ten course");
			return await facade.removeDataset("ten course").should.eventually.be.rejectedWith(NotFoundError);
		});

		it("two set remove first", async function () {
			await facade.addDataset("ten course", sections10, InsightDatasetKind.Sections);
			await facade.addDataset("second ten course", sections10, InsightDatasetKind.Sections);
			await facade.removeDataset("ten course").should.eventually.equal("ten course");
			await facade.listDatasets().should.eventually.be.length(1);
			const datasets = await facade.listDatasets();
			datasets.should.deep.equal([
				{
					id: "second ten course",
					kind: InsightDatasetKind.Sections,
					numRows: 10,
				},
			]);
		});
		it("remove empty name", async function () {
			await facade.addDataset("dataset", sections10, InsightDatasetKind.Sections);
			return facade.removeDataset("").should.eventually.rejectedWith(InsightError);
		});
		it("remove underscore name", async function () {
			await facade.addDataset("name", sections10, InsightDatasetKind.Sections);
			return facade.removeDataset("_name").should.eventually.rejectedWith(InsightError);
		});
		it("remove whitespace name", async function () {
			await facade.addDataset("dataset", sections10, InsightDatasetKind.Sections);
			return facade.removeDataset(" ").should.eventually.rejectedWith(InsightError);
		});
		it("remove from empty db", async function () {
			return facade.removeDataset(" ").should.eventually.be.rejectedWith(InsightError);
		});
		it("remove from empty db valid name", async function () {
			return facade.removeDataset("valid name").should.eventually.be.rejectedWith(NotFoundError);
		});
		it("remove valid rooms section", async function () {
			await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
			await facade.removeDataset("rooms").should.eventually.be.equal("rooms");
		});
	});

	/*
	 * This test suite dynamically generates tests from the JSON files in test/resources/queries.
	 * You can and should still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	describe("PerformQuery", function () {
		before(async function () {
			facade = new InsightFacade();

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
				facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms),
			];

			try {
				await Promise.all(loadDatasetPromises);
			} catch (err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}
		});

		after(async function () {
			await clearDisk();
		});

		describe("perform query basic funcitonality tests", function () {
			let testdb: InsightFacade;
			let emptyQuery = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept", "sections_avg"],
					ORDER: "sections_avg",
				},
			};

			describe("5000sections", function () {
				it("5000 give error", async function () {
					await clearDisk();
					testdb = new InsightFacade();
					await testdb.addDataset(
						"sections",
						await getContentFromArchives("section5000.zip"),
						InsightDatasetKind.Sections
					);
					return testdb.performQuery(emptyQuery).should.eventually.have.length(5000);
				});
				it("5001 sections", async function () {
					await clearDisk();
					testdb = new InsightFacade();
					await testdb.addDataset(
						"sections",
						await getContentFromArchives("section5001.zip"),
						InsightDatasetKind.Sections
					);
					return testdb.performQuery(emptyQuery).should.eventually.rejectedWith(ResultTooLargeError);
				});
			});

			describe("one section", function () {
				beforeEach(async function () {
					await clearDisk();
					testdb = new InsightFacade();
					await testdb.addDataset(
						"sections",
						await getContentFromArchives("section1.zip"),
						InsightDatasetKind.Sections
					);
				});
				it("one section open query", async function () {
					// since empty where should return all which in this case is only 1 row
					let queryResults: InsightResult[] = await testdb.performQuery(emptyQuery);
					expect(queryResults).to.deep.equal([{sections_dept: "1", sections_avg: 1}]);
					expect(queryResults).to.have.length(1);
				});
				it("reference invalid dataset", async function () {
					return testdb
						.performQuery({
							WHERE: {},
							OPTIONS: {
								COLUMNS: ["sections_dept", "sections2_avg"],
								ORDER: "sections_avg",
							},
						})
						.should.eventually.be.rejectedWith(InsightError);
				});
				it("reference two datasets should fail", async function () {
					await testdb.addDataset(
						"sections2",
						await getContentFromArchives("section10.zip"),
						InsightDatasetKind.Sections
					);
					return testdb
						.performQuery({
							WHERE: {},
							OPTIONS: {
								COLUMNS: ["sections_dept", "sections2_avg"],
								ORDER: "sections_avg",
							},
						})
						.should.eventually.be.rejectedWith(InsightError);
				});
			});
		});

		describe("valid queries with order", function () {
			let validQueries: ITestQuery[];
			try {
				validQueries = readFileQueries("valid with order");
			} catch (e: unknown) {
				expect.fail(`Failed to read one or more test queries. ${e}`);
			}

			validQueries.forEach(function (test: any) {
				it(`${test.title}`, async function () {
					try {
						const result = await facade.performQuery(test.input);
						result.should.have.deep.members(test.expected);
					} catch (err) {
						assert.fail(`performQuery threw unexpected error: ${err}`);
					}
				});
			});
		});

		describe("valid queries without order", function () {
			let validQueries: ITestQuery[];
			try {
				validQueries = readFileQueries("valid without order");
			} catch (e: unknown) {
				expect.fail(`Failed to read one or more test queries. ${e}`);
			}

			validQueries.forEach(function (test: any) {
				it(`${test.title}`, async function () {
					try {
						const result = await facade.performQuery(test.input);
						result.should.have.deep.members(test.expected);
					} catch (err) {
						assert.fail(`performQuery threw unexpected error: ${err}`);
					}
				});
			});
		});

		describe("invalid queries", function () {
			let invalidQueries: ITestQuery[];

			try {
				invalidQueries = readFileQueries("invalid");
			} catch (e: unknown) {
				expect.fail(`Failed to read one or more test queries. ${e}`);
			}

			invalidQueries.forEach(function (test: any) {
				it(`${test.title}`, async function () {
					try {
						const result = await facade.performQuery(test.input);
						assert.fail(`performQuery resolved when it should have rejected with ${test.expected}`);
					} catch (err) {
						if (test.expected === "InsightError") {
							expect(err).to.be.instanceOf(InsightError);
						} else if (test.expected === "ResultTooLargeError") {
							expect(err).to.be.instanceof(ResultTooLargeError);
						} else {
							assert.fail("Query threw unexpected error");
						}
					}
				});
			});
		});

		describe("valid queries with order (rooms)", function () {
			let validQueries: ITestQuery[];
			try {
				validQueries = readFileQueries("valid with order (rooms)");
			} catch (e: unknown) {
				expect.fail(`Failed to read one or more test queries. ${e}`);
			}

			validQueries.forEach(function (test: any) {
				it(`${test.title}`, async function () {
					try {
						const result = await facade.performQuery(test.input);
						result.should.deep.equal(test.expected);
					} catch (err) {
						assert.fail(`performQuery threw unexpected error: ${err}`);
					}
				});
			});
		});

		describe("valid queries without order (rooms)", function () {
			let validQueries: ITestQuery[];
			try {
				validQueries = readFileQueries("valid without order (rooms)");
			} catch (e: unknown) {
				expect.fail(`Failed to read one or more test queries. ${e}`);
			}

			validQueries.forEach(function (test: any) {
				it(`${test.title}`, async function () {
					try {
						const result = await facade.performQuery(test.input);
						result.should.have.deep.members(test.expected);
					} catch (err) {
						assert.fail(`performQuery threw unexpected error: ${err}`);
					}
				});
			});
		});

		describe("invalid queries (rooms)", function () {
			let invalidQueries: ITestQuery[];

			try {
				invalidQueries = readFileQueries("invalid (rooms)");
			} catch (e: unknown) {
				expect.fail(`Failed to read one or more test queries. ${e}`);
			}

			invalidQueries.forEach(function (test: any) {
				it(`${test.title}`, async function () {
					try {
						const result = await facade.performQuery(test.input);
						assert.fail(`performQuery resolved when it should have rejected with ${test.expected}`);
					} catch (err) {
						if (test.expected === "InsightError") {
							expect(err).to.be.instanceOf(InsightError);
						} else if (test.expected === "ResultTooLargeError") {
							expect(err).to.be.instanceof(ResultTooLargeError);
						} else {
							assert.fail("Query threw unexpected error");
						}
					}
				});
			});
		});
	});
});
