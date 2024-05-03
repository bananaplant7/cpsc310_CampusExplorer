import JSZip, {JSZipObject} from "jszip";
import Section from "../model/Section";
import {InsightError} from "../controller/IInsightFacade";
import Room, {GeoResponse} from "../model/Room";
import {parse} from "parse5";
import {ChildNode, Document, Element} from "parse5/dist/tree-adapters/default";
import {findNode, getGeoResponse, getRoomInfo, isValidRoomTable, roomTableToRooms} from "./roomParser";

const requiredKeys = ["id", "Course", "Title", "Professor", "Subject", "Year", "Avg", "Pass", "Fail", "Audit"];

// gets each file "x" in the zip/courses/"x", tries to parse json and creates a section from it
// ignores every json without required fields as outlines in Section datatype
// ignores every file outside of courses
// ignores every file without proper json formatting
// returns the list of sections found
export async function zipToSections(zipString: string): Promise<Section[]> {
	let sections: Section[] = [];
	let promises = [];
	let zip = await JSZip.loadAsync(zipString, {base64: true});
	let files: JSZipObject[] = [];

	zip.folder("courses/")?.forEach((name, obj) => {
		files.push(obj);
	});

	for (const file of files) {
		promises.push(
			file
				.async("string")
				.then((data) => {
					let dataObject = JSON.parse(data);
					for (const zipSection of dataObject.result) {
						let dataKeys: string[] = Object.keys(zipSection);
						if (requiredKeys.every((el) => dataKeys.includes(el))) {
							let newSection = new Section(
								zipSection.id,
								zipSection.Course,
								zipSection.Title,
								zipSection.Professor,
								zipSection.Subject,
								zipSection.Year,
								zipSection.Avg,
								zipSection.Pass,
								zipSection.Fail,
								zipSection.Audit
							);
							if (zipSection.Section === "overall") {
								newSection.year = 1900;
							}
							sections.push(newSection);
						}
					}
				})
				.catch((err) => {
					throw new InsightError(`${err}`);
				})
		);
	}

	await Promise.allSettled(promises);
	if (sections.length === 0) {
		return Promise.reject(new InsightError("no valid sections"));
	}
	return Promise.resolve(sections);
}

let roomzip: JSZip;

export async function zipToRooms(zipString: string): Promise<Room[]> {
	roomzip = await JSZip.loadAsync(zipString, {base64: true});

	let html = await roomzip.files["index.htm"].async("string");

	// find all tables
	let htmObject = parse(html);
	let tables = findTables(htmObject);
	let rooms: Room[] = await filterHtmlTable(tables);

	if (rooms.length === 0) {
		return Promise.reject(new InsightError("no rooms found"));
	}

	return Promise.resolve(rooms);
}

export function findTables(htmObject: Document) {
	let tables: Element[] = [];

	htmObject.childNodes.forEach((ele) => {
		findTablesHelper(ele, tables);
	});

	return tables;
}

function findTablesHelper(node: ChildNode, tables: Element[]) {
	if (node.nodeName === "table") {
		tables.push(node);
	}
	if ("childNodes" in node) {
		node.childNodes.forEach((ele) => {
			findTablesHelper(ele, tables);
		});
	}
}

async function filterHtmlTable(tables: Element[]) {
	let foundValidTable = false;
	let jobs = [];
	let jobs2: Array<Promise<void>> = [];
	let rows: Room[] = [];
	for (let table of tables) {
		let body: ChildNode | undefined = table.childNodes.find((el) => el.nodeName === "tbody");
		if (body !== undefined && "childNodes" in body) {
			let trs: ChildNode[] = body.childNodes.filter((el) => el.nodeName === "tr");
			for (let tr of trs) {
				if ("childNodes" in tr) {
					let linkNode = findNode(tr, "views-field-title");
					let addressNode = findNode(tr, "views-field-field-building-address");
					let shortName = "";
					try {
						shortName = getRoomInfo(tr, "views-field-field-building-code").trim();
					} catch (e) { /* empty */ }
					if (linkNode !== undefined && addressNode !== undefined) {
						jobs.push(
							getRoomsFromBuilding(linkNode, addressNode, shortName).then((rooms) => {
								for (let r of rooms) {
									rows.push(r);
								}
							})
						);
						foundValidTable = true;
					}
				}
			}
			if (foundValidTable === true) {
				break;
			}
		}
	}
	await Promise.allSettled(jobs);
	await Promise.allSettled(jobs2);
	return Promise.resolve(rows);
}

async function getRoomsFromBuilding(linkNode: ChildNode, addressNode: ChildNode, shortName: string): Promise<Room[]> {
	if ("childNodes" in linkNode) {
		let linklink = linkNode.childNodes.find((el) => el.nodeName === "a");
		if (linklink !== undefined && "attrs" in linklink) {
			let link = linklink.attrs.find((el) => el.name === "href")?.value;
			if (link === undefined) {
				return Promise.reject();
			}
			let titleNode = linklink.childNodes.find((el) => el.nodeName === "#text");
			if (!("childNodes" in addressNode)) {
				return Promise.reject("no address node");
			}
			if (addressNode === undefined || !("childNodes" in addressNode)) {
				return Promise.reject("no address info");
			}
			let roomInfoText = addressNode.childNodes.find((el) => el.nodeName === "#text");
			if (roomInfoText === undefined || !("value" in roomInfoText)) {
				return Promise.reject("badly formatted addressNode");
			}
			let address = roomInfoText.value.trim();
			let geo: GeoResponse = await getGeoResponse(address);
			if (geo.error) {
				return Promise.reject();
			}
			let title = "";
			if (titleNode !== undefined && "value" in titleNode) {
				title = titleNode.value.trim();
			}
			if (link !== undefined) {
				let htmstring = await roomzip.file(link.substring(2))?.async("string");
				if (htmstring === undefined) {
					return Promise.reject("could not find file");
				}
				let buildingHTM = parse(htmstring);
				let roomTables = findTables(buildingHTM);
				let roomTable = roomTables.find((el) => isValidRoomTable(el));
				if (roomTable === undefined) {
					return Promise.reject("no valid room table");
				}
				return roomTableToRooms(roomTable, title, address, shortName, geo);
			}
		}
	}
	throw new Error("no childNodes");
}
