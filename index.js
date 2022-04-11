#!/usr/bin/env node
import fs from "fs";
import chalkAnimation from "chalk-animation";
import ansi from "ansi";
import shortid from "shortid";

import {
	doesMovieExist,
	getDatesFromMovie,
	getAllShowsInCity,
	getDatesFromPage,
	getNoOfShowsFromDateAndMovieAndFormat,
	checkForCondition,
} from "./scraping.js";
import { getStringsFromListeners, getStringFromListener, inquire } from "./inquirer.js";

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
// let str = "Loading...";
// const rainbow = chalkAnimation.rainbow(str);
// rainbow.stop();
let cursor = ansi(process.stdout);

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
					(e) => e,
					options.time,
					console.log,
					"city/doesMovieExist",
					id
				);
				break;
			case listenerNames[0][1]:
				await checkForCondition(
					async () => {
						let cachedUrl;
						if (!options.cachedData) {
							let listener = await getListener(id);
							if (await listener) {
								options = listener.options;
							}
						}
						if (options.cachedData) cachedUrl = options.cachedData.cachedUrl;
						// console.log(cachedUrl);
						if (listener.count % 10 == 0) cachedUrl = "";
						let a = await getDatesFromMovie(options.city, options.movieName, cachedUrl);
						return await [a[0].length, a[1]];
					},
					async (e) => {
						let a = await getListener(id);
						a = await a.targetConsole;
						if (!(await a) && a !== 0) return false;
						return (await e) > (await a);
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
						a = await a.map((ele) => ele[1].length);
						a = await a.reduce((a, b) => a + b, 0);
						return await a;
					},
					async (e) => {
						let a = await getListener(id);
						a = await a.targetConsole;
						if (!(await a) && a !== 0) return false;
						return (await e) > (await a);
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
					async () => {
						let a = await getDatesFromPage(options.theatreUrl);
						// console.log(a)
						return await a.length;
					},
					async (e) => {
						let a = await getListener(id);
						a = await a.targetConsole;
						if (!(await a) && a !== 0) return false;
						return (await e) > (await a);
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
						await getNoOfShowsFromDateAndMovieAndFormat(
							options.theatreUrl,
							options.movieName,
							options.date,
							options.format
						),
					async (e) => {
						let a = await getListener(id);
						a = await a.targetConsole;
						if (!(await a) && a !== 0) return false;
						return (await e) > (await a);
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
	[...(await getFileData())].map((ele) => {
		listenersStrings.push(getStringFromListener(ele, true));
	});
	await inquire(
		async (i, j, options) => await addListeners(i == 0 ? "city" : "theatre", listenerNames[i][j], options),
		async () => await getFileData(),
		async (id) => await removeListener(id),
		async () => await getFileData(),
		async () => await initializeListeners()
	);
	// await initializeListeners();
	// addListeners("city", listenerNames[0][0], { city: "kharagpur", movieName: "kgf", time: 5000 });
	// addListeners("city", listenerNames[0][1], { city: "kharagpur", movieName: "kashmir", time: 15000 });
	// addListeners("city", listenerNames[0][2], {
	// 	city: "kolkata",
	// 	movieName: "rrr",
	// 	date: "2",
	// 	format: "hindi-2d",
	// 	time: 30000,
	// });
	// addListeners("theatre", listenerNames[1][0], {
	// 	theatreUrl: "https://in.bookmyshow.com/buytickets/miraj-cinemas-newtown-kolkata/cinema-kolk-MCKK-MT/20220403",
	// 	time: 5000,
	// });
	// addListeners("theatre", listenerNames[1][1], {
	// 	theatreUrl: "https://in.bookmyshow.com/buytickets/miraj-cinemas-newtown-kolkata/cinema-kolk-MCKK-MT/20220403",
	// 	movieName: "rrr",
	// 	date: "3",
	// 	time: 5000,
	// });
})();

// setTimeout(async () => {
// 	rainbow.replace(await getFileData());
// }, 1000);
//

export { getListener, updateListener, removeListener };
