import puppeteer from "puppeteer";
import { getListener, updateListener, removeListener } from "./index.js";
import { notifyViaEmail, notifyViaSms } from "./notify.js";
import { getStringFromListener } from "./inquirer.js";

let cachedLinksForCity = {};
let cachedDatesForMovie = {};
let ticks = 0;

let notify = async (emails, sms, subject, body) => {
	if (emails) await notifyViaEmail(emails, subject, body);
	if (sms) await notifyViaSms(sms, subject, body);
};

let updateTicks = async () => {
	let timer = setInterval(async () => {
		if (ticks > 10) {
			// console.log("Quit, Urgent :", ticks);
			await notifyViaEmail("satyasaibhushan@gmail.com", "process quit", "Please check!!");
			await notifyViaSms("7970070007", "process quit", "Please check!!");
			process.exit();
			clearInterval(timer);
			return;
		}
		// console.log(ticks);
		// ticks = 0;
	}, 2000);
};
let decreaseTicks = async() => ticks--;

let updateCacheForCity = (date, format, link, shouldUpdateLink = true, isForLinks = true) => {
	let cacheRepo;
	if (!isForLinks) cacheRepo = cachedDatesForMovie;
	else cacheRepo = cachedLinksForCity;
	// console.log(cacheRepo[`${date}+${format}`]);
	if (cacheRepo[`${date}+${format}`] == "" || !cacheRepo[`${date}+${format}`])
		cacheRepo[`${date}+${format}`] = { link: "", count: 0 };
	if (shouldUpdateLink) cacheRepo[`${date}+${format}`].link = link;
	cacheRepo[`${date}+${format}`].count++;
	if (cacheRepo[`${date}+${format}`].count % 5 == 0) {
		cacheRepo[`${date}+${format}`].link = "";
		cacheRepo[`${date}+${format}`].count = 0;
	}
};

//get url of city's BMS page
let getUrl = (city) => {
	return `https://in.bookmyshow.com/explore/movies-${city}`;
};

//format movie name or any name to simple lowercase with no spaces/tabs
let formatMovieName = (name) => name.toLowerCase().trim().replace(/\s/g, "");

//to add a delay
let delay = (time) => {
	return new Promise(function (resolve) {
		setTimeout(resolve, time);
	});
};

//auto scroll to end of the page
async function autoScroll(page) {
	await page.evaluate(async () => {
		await new Promise((resolve, reject) => {
			var totalHeight = 0;
			var distance = 10000;
			var timer = setInterval(() => {
				var scrollHeight = document.body.scrollHeight;
				window.scrollBy(0, distance);
				totalHeight += distance;

				if (totalHeight >= scrollHeight || totalHeight > 100000) {
					clearInterval(timer);
					resolve();
				}
			}, 100);
		});
	});
}

//Launch puppeteer browser and load the page
let launchPuppeteer = async (url, isHeadless = false, waitUntil = "domcontentloaded") => {
	const browser = await puppeteer.launch({ headless: isHeadless });
	const page = await browser.newPage();
	ticks++;
	await page.goto(url, { waitUntil: waitUntil });
	await autoScroll(page);
	await page._client.send("Page.stopLoading");
	return [browser, page];
};

//type:city
//gets all the movies currently in a city
let getMoviesList = async (city) => {
	let [browser, page] = await launchPuppeteer(getUrl(city), true, "networkidle0");

	const movies = await page.evaluate(async () => {
		let images = Array.from(document.getElementsByTagName("img"));
		images = images.map((ele) => [ele.clientHeight / ele.clientWidth, ele]).filter(([ele, z]) => ele > 1.4 && ele < 2);
		images = await images.map(([z, ele]) => {
			let alt = ele.alt;
			while (ele.tagName != "A") ele = ele.parentNode;
			return [alt, ele.href];
		});
		// console.log(images);
		return await images;
	});
	await browser.close();
	ticks--;
	// console.log(await movies);
	return await movies;
};

//type:city
//uses above function to check if a movie exists in a city
let doesMovieExist = async (city, movieName) => {
	let movies = await getMoviesList(city);
	// let a = await movies;
	// console.log(a);
	movies = await movies.map(([ele, link]) => [
		ele
			.trim()
			.toLowerCase()
			.replace(/\s/g, "")
			.replace(/[^a-zA-Z ]/g, ""),
		link,
	]);
	movieName = formatMovieName(movieName).replace(/[^a-zA-Z ]/g, "");
	for (let i = 0; i < movies.length; i++) {
		const movie = movies[i][0];
		if (movie.includes(movieName)) return movies[i][1];
	}
	// console.log(await a, "asdfafa");
	return false;
};

//type:city/theatre
//given a page to book tickets from, this function gets all the possible dates
let getDatesFromPage = async (theatre) => {
	let [browser, page] = await launchPuppeteer(theatre);
	await page._client.send("Page.stopLoading");

	let links = await page.evaluate(() => {
		let lists = Array.from(document.getElementsByTagName("li"));
		lists = lists.filter((ele) => ele.classList.contains("date-details"));

		lists = lists.map((ele) => {
			let name = ele.innerText.replace(/\s/g, " ").replace(/\D+/g, "").replace(/^0+/, "");
			let url = Array.from(ele.childNodes).filter((ele) => ele.nodeName == "A")[0].href;
			return [name, url];
		});
		return lists;
	});
	await browser.close();
	ticks--;
	return links;
};

//type:city
//Given a movie link in a city, it gets the dates links for that movie using the above function
// this funciton also handles the case if the movie in the city has multiple formats
let getDatesFromMovie = async (city, movieName) => {
	if (
		cachedDatesForMovie[`${city}+${movieName}`] &&
		cachedDatesForMovie[`${city}+${movieName}`].link != "" &&
		cachedDatesForMovie[`${city}+${movieName}`].count != 0
	) {
		try {
			let dates = await getDatesFromPage(cachedDatesForMovie[`${city}+${movieName}`].link);
			updateCacheForCity(city, movieName, "", false, false);
			console.log(await dates.length);
			if ((await dates.length) == 0) {
			} else return dates;
		} catch (e) {
			console.log("error", e);
		}
	}

	let movieLink = await doesMovieExist(city, movieName);
	if (movieLink === false) {
		console.log("movie does not exist", movieLink);
		return [];
	}
	// console.log(await movieLink);

	let [browser, page] = await launchPuppeteer(await movieLink, null, "networkidle0");

	let oldUrl = await page.url();

	let buttons = await page.evaluateHandle(() =>
		Array.from(document.getElementsByTagName("button")).filter(
			(ele) => ele.innerText.toLowerCase().trim().replace(/\s/g, "") === "booktickets"
		)
	);
	let originalLists = await page.evaluateHandle(() => Array.from(document.getElementsByTagName("li")));
	originalLists = await originalLists.getProperties();
	originalLists = Array.from(originalLists.values());

	buttons = await buttons.getProperties();
	let buttons_arr = Array.from(await buttons.values());

	const [_, navigation] = await Promise.allSettled([
		buttons_arr[0].click(),
		page.waitForNavigation({ waitUntil: "domcontentloaded" }),
	]);
	await page._client.send("Page.stopLoading");
	await (async () => {
		if (oldUrl == page.url()) {
			console.log("multiple formats");
			let output = await page.evaluateHandle(async (originalLists) => {
				let diff = Array.from(document.getElementsByTagName("li")).filter((x) => !originalLists.includes(x));
				let a = diff[0];
				while (a.tagName != "SPAN" && a.childNodes) {
					a = a.childNodes[a.childNodes.length - 1];
				}
				return [a];
			}, originalLists);
			output = await output.getProperties();
			let clickable = Array.from(output.values())[0];

			const [_, navigation] = await Promise.allSettled([
				clickable.click(),
				page.waitForNavigation({ waitUntil: "networkidle0" }),
			]);
			await page.waitForNavigation({ waitUntil: "domcontentloaded" });
			await page._client.send("Page.stopLoading");
			return;
		}
		return;
	})();

	await page._client.send("Page.stopLoading");
	await browser.close();
	ticks--;
	// return await page.url();
	let link = await page.url();
	updateCacheForCity(city, movieName, link, true, false);
	return await getDatesFromPage(link);
};

//type:city
//given a link of the movie in any format, this gets the links of all the formats
let getFormats = async (movieLink) => {
	if (movieLink == "") {
		console.log("invalid link 2");
		return;
	}
	let [browser, page] = await launchPuppeteer(movieLink);

	let formats = await page.evaluate(() =>
		Array.from(document.getElementById("filterLanguage").childNodes)
			.filter((ele) => ele.tagName == "LI")
			.map((ele) => [
				ele.textContent.toLowerCase().trim().replace(/\s/g, ""),
				Array.from(ele.childNodes).filter((ele) => ele.tagName == "A")[0].href,
			])
	);
	await browser.close();
	ticks--;
	return formats;
};

//type:city
//gievn the movie link in a city, this gets all the shows of any date or any format
//dates param is used to avoid redundant calls to getDatesFromMovie
//giving date is highly recommended
let getAllShowsInCity = async (city, movieName, date = "", format = "", dates = "", isGivenLink = false) => {
	if (
		cachedLinksForCity[`${date}+${format}`] &&
		cachedLinksForCity[`${date}+${format}`].link != "" &&
		cachedLinksForCity[`${date}+${format}`].count != 0
	) {
		try {
			let shows = await getAllShowsInCityFromLink(cachedLinksForCity[`${date}+${format}`].link);
			updateCacheForCity(date, format, "", false);
			// console.log(await dates.length);
			if ((await shows.length) == 0) {
				cachedLinksForCity[`${date}+${format}`].count--;
			} else return shows;
		} catch (e) {
			console.log("error", e);
		}
	}
	let link = "";
	if (isGivenLink) {
		link = city;
	} else {
		let movieLink = await doesMovieExist(city, movieName);
		if ((await movieLink) === false) {
			console.log("movie does not exist");
			return;
		}

		if (dates == "") {
			dates = isGivenLink ? city : await getDatesFromMovie(city, movieName);
		}
		if (!dates) return;
		if (date != "") {
			date = formatMovieName(date);

			for (let i = 0; i < dates.length; i++) {
				if (formatMovieName(dates[i][0]) == date) {
					link = dates[i][1];
					break;
				}
			}
			if (link == "") {
				console.log("invalid date");
				return;
			}
		}

		if (date == "") {
			let arr = [];
			await Promise.all(
				await dates.map(async (ele) => {
					arr.push(...(await getAllShowsInCity(city, movieName, ele[0], format, dates)));
				})
			);
			// for (let i = 0; i < dates.length; i++) {
			// 	const ele = dates[i];
			// }
			return arr;
		}

		let formats = await getFormats(link);
		let flag = 0;
		if (format != "") {
			let formatConstraints = format.trim().toLowerCase().split(" ").join("-");
			for (let i = 0; i < formats.length; i++) {
				const ele = formats[i];
				if (ele[0] == formatConstraints) (flag = 1), (link = ele[1]);
			}
		}
		if (flag == 0) {
			let arr = [];
			for (let i = 0; i < formats.length; i++) {
				const ele = formats[i];
				arr.push(...(await getAllShowsInCity(ele[1], "", date, ele[0], dates, true)));
			}
			return arr;
		}
	}
	updateCacheForCity(date, format, link);
	return await getAllShowsInCityFromLink(link);
};

//type:city
//gievn the movie link in a city, this gets all the shows of any date or any format
//dates param is used to avoid redundant calls to getDatesFromMovie
//giving date is highly recommended
let getAllShowsInCityFromLink = async (link) => {
	let [browser, page] = await launchPuppeteer(link);

	let shows = await page.evaluate(async () => {
		let links = Array.from(document.getElementsByTagName("ul"))
			.filter((ele) => ele.id == "venuelist")
			.map((ele) => Array.from(ele.childNodes));
		links = links[0].filter((ele) => ele.tagName == "LI").map((ele) => Array.from(ele.childNodes));
		links = links.map((ele) => ele.filter((ele) => ele.tagName == "DIV"));
		return links.map((link) => {
			let [titleBox, timeBox] = link;

			let venue = Array.from(titleBox.getElementsByTagName("A")).filter((ele) =>
				ele.classList.contains("__venue-name")
			)[0];
			return [
				[venue.textContent.toLowerCase().trim().replace(/\s/g, ""), venue.href],
				Array.from(timeBox.getElementsByClassName("showtime-pill")).map((ele) => [
					ele.textContent.toLowerCase().trim().replace(/\s/g, ""),
					ele.href,
				]),
			];
		});
	});
	await browser.close();
	ticks--;
	// console.log(await shows);
	return shows;
};

//type:theatre
//similar to getAllShowsInCity but with some minor changes
let getMoviesFromTheatreDate = async (theatreDateUrl) => {
	let [browser, page] = await launchPuppeteer(theatreDateUrl);

	const movies = await page.evaluate(() => {
		let list = document.getElementById("showEvents");
		list = Array.from(list.getElementsByTagName("li")).filter((x) => {
			if (x.getAttribute("data-eventcode")) return true;
			else return false;
		});
		list = list.map((ele) => {
			let name,
				type,
				times = [];
			let links = Array.from(ele.getElementsByTagName("a"));
			type = ele.getElementsByClassName("eventInfo")[0].textContent;
			links.filter((link) => {
				if (link.classList.contains("nameSpan")) {
					name = link.innerHTML;
				}
				if (link.classList.contains("showtime-pill")) {
					times.push(link.innerText);
				}
			});
			return [name, type, times];
		});
		return list;
	});
	await browser.close();
	ticks--;
	return movies;
};

let getTheatreDateUrl = async (theatre, date) => {
	let dates = await getDatesFromPage(theatre);
	let theatreDateUrl = "";

	date = formatMovieName(date);

	for (let i = 0; i < dates.length; i++) {
		if (formatMovieName(dates[i][0]) == date) {
			theatreDateUrl = dates[i][1];
			break;
		}
	}
	return theatreDateUrl;
};

//type:theatre
//given a theatres date, this function gets the no.of shows with given date & format
let getShowsFromDateAndMovieAndFormat = async (theatre, movieName, date, format = "") => {
	if (format !== "")
		format = format
			.trim()
			.toLowerCase()
			.split(" ")
			.join("-")
			.replace(/[^a-zA-Z-\d ]/g, "");

	let theatreDateUrl = await getTheatreDateUrl(theatre, date);
	if (theatreDateUrl == "") {
		console.log("invalid date");
		return 0;
	}
	let movies = await getMoviesFromTheatreDate(theatreDateUrl);
	movieName = formatMovieName(movieName).replace(/[^a-zA-Z ]/g, "");
	let count = 0;
	let arr = [];
	movies.forEach((ele) => {
		if (
			formatMovieName(ele[0])
				.replace(/[^a-zA-Z ]/g, "")
				.includes(movieName)
		) {
			if (format == "") arr.push(...ele[2]);
			else if (
				ele[1]
					.trim()
					.toLowerCase()
					.split(" ")
					.join("-")
					.replace(/[^a-zA-Z-\d ]/g, "") == format
			)
				arr.push(...ele[2]);
		}
	});
	return arr;
};

let checkForCondition = async (func, expression, time, notif, listenerName, id) => {
	let timer = setInterval(
		async () => {
			let listener = await getListener(id);
			let result;
			try {
				result = await func();
			} catch (e) {
				await notifyViaEmail(
					"satyasaibhushan@gmail.com",
					"There has been an error",
					`Please check!! \nFor listener,${getStringFromListener(listener)} `
				);
				console.log("error", e);
			}
			// let cachedData;
			// if (Array.isArray(result)) (cachedData = result[1]), (result = result[0]);

			console.log(result);
			if ((await listener) == null) {
				clearInterval(timer);
				return;
			}
			// listener.options.cachedData = cachedData;
			listener.latestConsole = await result;

			listener.count++;
			let [value, ...subj] = await expression(result);
			if (await value) {
				console.log("condition met, exiting");
				await notify(listener.options.emails, listener.options.sms, ...subj);
				await removeListener(id);
				clearInterval(timer);
			} else {
				if (listener.targetConsole !== true) listener.targetConsole = await result;
			}
			await updateListener(id, listener);
		},
		time < 5000 ? 5000 : time
	);
};

export {
	doesMovieExist,
	getDatesFromMovie,
	getAllShowsInCity,
	getDatesFromPage,
	getShowsFromDateAndMovieAndFormat,
	checkForCondition,
	getTheatreDateUrl,
	launchPuppeteer,
	decreaseTicks,
};

(async () => {
	await updateTicks();
	// getMoviesList("kolkata");
	// let result = await doesMovieExist("kharagpur", "kgf");
	// let result = await getMoviesList("kharagpur");
	// let result = await getDatesFromTheatre(
	// 	"https://in.bookmyshow.com/buytickets/bombay-cineplex-kharagpur/cinema-kgpr-BCKR-MT"
	// );
	// let result = await getMoviesFromDate(
	// 	"https://in.bookmyshow.com/buytickets/bombay-cineplex-kharagpur/cinema-kgpr-BCKR-MT/20220312"
	// );
	// let result = await getShowsFromDateAndMovieAndFormat(
	// 	"https://in.bookmyshow.com/buytickets/bombay-cineplex-kharagpur/cinema-kgpr-BCKR-MT/20220419",
	// 	"kgf",
	// 	"20",
	// 	"hindi-2d"
	// );
	// let result = await getDatesFromMovie("Kharagpur", "rrr");
	// let result = await getAllShowsInCity("kharagpur", "rrr", "  19 ", "hindi-2d");
	// let result = await getFormats("https://in.bookmyshow.com/buytickets/rrr-kharagpur/movie-kgpr-ET00320580-MT/20220331");
	// let result = getMoviesFromTheatreDate(
	// 	"https://in.bookmyshow.com/buytickets/bombay-cineplex-kharagpur/cinema-kgpr-BCKR-MT/20220419"
	// );
	// console.log(await result);
	// await checkForCondition(() => doesMovieExist("kharagpur", "rrr"), true, 5000, console.log);
})();
