#!/usr/bin/env node
import fs from "fs";
import shortid from "shortid";

import {
	doesMovieExist,
	getDatesFromMovie,
	getAllShowsInCity,
	getDatesFromPage,
	getShowsFromDateAndMovieAndFormat,
	checkForCondition,
	getTheatreDateUrl,
} from "./scraping.js";
import { getStringFromListener } from "./inquirer.js";

let fileName = "data.json";
//type: city (or) theatre
//listener: string, the type of listener
//latestConsole: the latest output of the given function
//targetConsole: the target value of the output of the function
//options: opitons for the funciton; name, date, format, timePeriod
//count: times the funciton has been called

//maps the listeners to their strings, used to id them and avoid duplication
let listenersStrings = [];

let listenerNames = [
	["does movie exist", "extra date appears", "extra show appears"],
	["extra date appears", "extra show appears"],
];
let getDifferent = (target, original) => {
	for (let i = 0; i < target.length; i++) {
		const ele = target[i];
		let flag = 0;
		for (let j = 0; j < original.length; j++) {
			const ele2 = original[j];
			if (ele2[0] == ele[0]) {
				flag = 1;
				break;
			}
		}
		if (flag == 0) return ele;
	}
};

const writeToFile = async (filename, obj) => {
	await fs.writeFileSync(filename, await JSON.stringify(obj), function (err) {
		if (err) {
			return console.log(err);
		}
	});
};

const updateFile = async (arr) => {
	if (arr != getFileData(fileName)) await writeToFile(fileName, arr);
};

let getFileData = async () => {
	let array, file;
	try {
		file = await fs.readFileSync(fileName);
		array = await JSON.parse(file.toString());
	} catch (error) {
		console.log(error);
		console.log("creating file");
		writeToFile(fileName, []);
		array = [];
	}
	return array;
};

const getListener = async (id, isIndex) => {
	let arr = await getFileData();
	let listener = null;
	await arr.forEach((ele, i) => {
		if (ele.id == id) listener = isIndex ? i : ele;
	});

	if (listener == null) {
		console.log("listener does not exist");
		return null;
	}
	return listener;
};

const updateListener = async (id, obj) => {
	let arr = await getFileData();
	let i = await getListener(id, true);
	if (!i && i !== 0) return;
	arr[i] = obj;
	await updateFile(arr);
};

const removeListener = async (id) => {
	let arr = await getFileData();
	let i = await getListener(id, true);
	if (!i && i !== 0) return;
	arr.splice(i, 1);
	await updateFile(arr);
};

let initializeListeners = async () => {
	// console.log("initializing");
	let data = await getFileData();
	if ((await data.length) != 0) {
		await Promise.all(
			await data.map(async (ele) => {
				let { type, listener, latestConsole, targetConsole, options, count, id } = ele;
				await addListeners(type, listener, options, latestConsole, targetConsole, id, false);
			})
		);
	}
};

let addListeners = async (
	type,
	listener,
	options,
	latestConsole = null,
	targetConsole,
	id = null,
	shouldAddToList = true
) => {
	if (shouldAddToList) {
		let targetConsole = listener == listenerNames[0][0] ? true : latestConsole;
		let obj = {
			type: type,
			listener: listener,
			latestConsole: latestConsole,
			targetConsole: targetConsole,
			options: options,
			count: 0,
		};
		let generatedId = await shortid.generate();
		obj.id = generatedId;
		id = generatedId;
		let arr = await getFileData();
		let string = getStringFromListener(obj, true);
		if (listenersStrings.includes(string)) {
			console.log("listener already exists");
			return;
		} else {
			arr.push(obj);
			await updateFile(arr);
		}
	}
	if (type == "city") {
		switch (listener) {
			case listenerNames[0][0]:
				await checkForCondition(
					() => doesMovieExist(options.city, options.movieName),
					async (e) => {
						if (e !== false) {
							let listener = await getListener(id);
							let subject = `A new movie (${await listener.options.movieName}) 
								you want has appeared in a city (${await listener.options.city})`;
							let body = `Here's the link to the new movie: ${e}`;
							return [true, subject, body];
						} else return [false];
					},
					options.time,
					console.log,
					"city/doesMovieExist",
					id
				);
				break;
			case listenerNames[0][1]:
				await checkForCondition(
					async () => await getDatesFromMovie(options.city, options.movieName),
					async (e) => {
						let a = await getListener(id);
						a = await a.targetConsole;
						if (!((await a) && a.length !== 0)) return [false];
						if (e.length > (await a.length)) {
							let listener = await getListener(id);
							let [redirectDate, redirectLink] = getDifferent(e, a);
							// listener.redirectData = [...];
							// console.log(e);
							let subject = `A new Date (${await redirectDate}) 
								you want has appeared for a movie (${await listener.options.movieName})
								in a theatre (${await listener.options.city})`;
							let body = `Here's the link to the new date: ${redirectLink}`;
							return [true, subject, body];
						} else return [false];
					},
					options.time,
					console.log,
					"city/extraDateForMovie",
					id
				);
				break;
			case listenerNames[0][2]:
				await checkForCondition(
					async () => {
						let a = await getAllShowsInCity(options.city, options.movieName, options.date, options.format);
						// console.log(await a);
						return await a;
					},
					async (e) => {
						let a = await getListener(id);
						a = await a.targetConsole;
						if (!((await a) && a !== null)) return [false];
						let b = await a.map((ele) => ele[1].length);
						b = await b.reduce((x, y) => x + y, 0);
						let c = await e.map((ele) => ele[1].length);
						c = await c.reduce((x, y) => x + y, 0);
						if (c > (await b)) {
							let redirectTheatre, redirectTheatreLink, redirectShow, redirectShowLink;
							for (let i = 0; i < e.length; i++) {
								const ele = e[i];
								let flag = 0;
								for (let j = 0; j < a.length; j++) {
									const ele2 = a[j];
									if (ele2[0][0] == ele[0][0]) {
										if (ele[1].length > ele2[1].length) {
											console.log("show increase");
											//a show increased in this theatre
											let x = getDifferent(ele[1], ele2[1]);
											(redirectShow = x[0]), (redirectShowLink = x[1]);
											// [redirectShow, redirectShowLink] = getDifferent(ele[1], ele2[1]);
											(redirectTheatre = ele[0][0]), (redirectTheatreLink = ele[0][1]);

											break;
										}
										flag = 1;
									}
								}

								if (flag == 0) {
									//a theatre is increased
									(redirectTheatre = ele[0][0]), (redirectTheatreLink = ele[0][1]);
									break;
								}
							}
							let listener = await getListener(id);
							let subject, body;
							if (redirectShow) {
								subject = `A new Show (${await redirectShow})
									you want has appeared for a movie (${await listener.options.movieName})
									on date (${await listener.options.date}) and format (${await listener.options.format})
									in a city (${await listener.options.city})`;
								body = `Here's the link to the show: ${redirectShowLink} \n  
									Here's the link to the theatre(${redirectTheatre}): ${redirectTheatreLink} `;
								// console.log("redirect show", redirectShow);
							} else {
								subject = `A new Theatre (${await redirectTheatre})
									you want has appeared for a movie (${await listener.options.movieName})
									on date (${await listener.options.date}) and format (${await listener.options.format})
									in a city (${await listener.options.city})`;
								body = `Here's the link to that theatre: ${redirectTheatreLink} `;
							}
							return [true, subject, body];
						} else return [false];
					},
					options.time,
					console.log,
					"city/extraShow",
					id
				);
				break;

			default:
				break;
		}
	}
	if (type == "theatre") {
		switch (listener) {
			case listenerNames[1][0]:
				await checkForCondition(
					async () => await getDatesFromPage(options.theatreUrl),

					async (e) => {
						let a = await getListener(id);
						a = await a.targetConsole;
						if (!((await a) && a !== 0)) return [false];
						if (e.length > (await a.length)) {
							let listener = await getListener(id);
							let [redirectDate, redirectLink] = getDifferent(e, a);
							let subject = `A new Date (${await redirectDate}) 
								you want has appeared in a theatre (${await listener.options.theatreName})`;
							let body = `Here's a link to the new date: ${redirectLink}`;
							return [true, subject, body];
						} else return [false];
					},
					options.time,
					console.log,
					"theatre/extraDate",
					id
				);
				break;

			case listenerNames[1][1]:
				await checkForCondition(
					async () =>
						await getShowsFromDateAndMovieAndFormat(
							options.theatreUrl,
							options.movieName,
							options.date,
							options.format
						),
					async (e) => {
						let a = await getListener(id);
						a = await a.targetConsole;
						if (!((await a) && a !== 0)) return [false];
						if (e.length > (await a.length)) {
							let listener = await getListener(id);
							let redirectShow = e.filter((ele) => !a.includes(ele))[0];
							let theatreDateUrl = await getTheatreDateUrl(listener.options.theatreUrl, listener.options.date);
							let subject = `A new Show (${await redirectShow})
								you want for a movie (${await listener.options.movieName})
								on date (${await listener.options.date}) and format (${await listener.options.format})
								has appeared in a theatre (${await listener.options.theatreName})`;
							let body = `Here's a link to the date of the theatre: ${theatreDateUrl}`;
							return [true, subject, body];
						} else return [false];
					},
					options.time,
					console.log,
					"theatre/extraShow",
					id
				);
				break;

			default:
				break;
		}
	}
};

await (async () => {
	process.on("beforeExit", (code) => {
		console.log("Process beforeExit event with code: ", code);
	});
	[...(await getFileData())].map((ele) => {
		listenersStrings.push(getStringFromListener(ele, true));
	});
})();

export { getFileData, getListener, updateListener, removeListener, initializeListeners, addListeners,listenerNames };
