import JSZip, {JSZipObject} from "jszip";
import Section from "../model/Section";
import {InsightError} from "../controller/IInsightFacade";
import Room, {GeoResponse} from "../model/Room";
import {parse} from "parse5";
import {ChildNode, Document, Element} from "parse5/dist/tree-adapters/default";
import {findTables} from "./DatasetFileUtility";

export function findNode(tr: Element, id: string) {
	return tr.childNodes.find((el) => {
		return (
			el.nodeName === "td" &&
			"attrs" in el &&
			el.attrs.some(
				(el2) =>
					el2.name === "class" && el2.value.includes(id)
			)
		);
	});
}

export async function roomTableToRooms(
	roomTable: Element,
	title: string,
	address: string,
	shortName: string,
	geo: GeoResponse
): Promise<Room[]> {
	let rooms: Room[] = [];
	let jobs = [];
	if ("childNodes" in roomTable) {
		let tbody = roomTable.childNodes.find((el) => el.nodeName === "tbody");
		if (tbody === undefined || !("childNodes" in tbody)) {
			throw new Error("should have asserted that tbody exists exists already");
		}
		for (let tr of tbody.childNodes) {
			if ("childNodes" in tr) {
				jobs.push(
					makeRoom(tr, title, shortName, address, geo).then((room) => {
						rooms.push(room);
					})
				);
			}
		}
	}
	await Promise.allSettled(jobs);
	if (rooms.length === 0) {
		return Promise.reject();
	}
	return rooms;
}

function makeRoom(tr: Element, title: string, shortName: string, address: string, geo: GeoResponse): Promise<Room> {
	let roomNumber = getRoomNumber(tr);
	let roomLink = getRoomLink(tr);
	let capacity = parseInt(getRoomInfo(tr, "views-field-field-room-capacity").trim(), 10) || Number.NEGATIVE_INFINITY;
	let getFurniture = getRoomInfo(tr, "views-field-field-room-furniture").trim();
	let roomType = getRoomInfo(tr, "views-field-field-room-type").trim();
	let room = new Room(
		title,
		shortName,
		roomNumber,
		shortName + "_" + roomNumber,
		address,
		capacity,
		roomType,
		getFurniture,
		roomLink,
		geo.lon || 0,
		geo.lat || 0
	);
	return Promise.resolve(room);
}

export function getRoomInfo(tr: Element, info: string): string {
	let roomInfoNode = tr.childNodes.find((el) => {
		if ("attrs" in el) {
			return el.attrs.some((att) => att.value.includes(info));
		}
	});
	if (roomInfoNode === undefined) {
		throw new InsightError("no td matching needed info");
	}
	if (!("childNodes" in roomInfoNode) || roomInfoNode.childNodes.every((el) => el.nodeName !== "#text")) {
		return "";
	}
	let roomInfoText = roomInfoNode.childNodes.find((el) => el.nodeName === "#text");
	if (roomInfoText !== undefined && "value" in roomInfoText) {
		return roomInfoText.value;
	}
	return "";
}

export function getRoomNumber(tr: Element): string {
	let roomNumberNode = tr.childNodes.find((el) => {
		if ("attrs" in el) {
			return el.attrs.some((att) => att.value.includes("views-field-field-room-number"));
		}
	});
	if (roomNumberNode === undefined) {
		throw new InsightError("no room number in tr");
	}
	if (!("childNodes" in roomNumberNode)) {
		return "";
	}
	let roomNumberHref = roomNumberNode.childNodes.find((el) => el.nodeName === "a");
	if (roomNumberHref !== undefined && "childNodes" in roomNumberHref) {
		let linkNode = roomNumberHref.attrs.find((el) => {
			return el.name === "href";
		});
		let textNode: ChildNode | undefined = roomNumberHref.childNodes.find((text) => text.nodeName === "#text");
		if (textNode !== undefined && linkNode !== undefined && "value" in textNode) {
			return textNode.value;
		}
	}
	return "";
}

export function getRoomLink(tr: Element): string {
	let roomNumberNode = tr.childNodes.find((el) => {
		if ("attrs" in el) {
			return el.attrs.some((att) => att.value.includes("views-field-field-room-number"));
		}
	});
	if (roomNumberNode === undefined) {
		return "";
	}
	if (!("childNodes" in roomNumberNode)) {
		return "";
	}
	let roomNumberHref = roomNumberNode.childNodes.find((el) => el.nodeName === "a");
	if (roomNumberHref !== undefined && "childNodes" in roomNumberHref) {
		let linkNode = roomNumberHref.attrs.find((el) => {
			return el.name === "href";
		});
		if (linkNode !== undefined) {
			return linkNode.value;
		}
	}
	return "";
}

export function isValidRoomTable(table: Element): boolean {
	let found = false;
	if ("childNodes" in table) {
		let tbody = table.childNodes.find((el) => el.nodeName === "tbody");
		if (tbody === undefined || !("childNodes" in tbody)) {
			return false;
		}
		for (let tr of tbody.childNodes) {
			if ("childNodes" in tr) {
				for (let td of tr.childNodes) {
					if ("attrs" in td && td.attrs.some((att) => att.value.includes("views-field-field-room-number"))) {
						return true;
					}
				}
			}
		}
	}
	return false;
}

export function getGeoResponse(address: string) {
	return Room.getCoords(address);
}

