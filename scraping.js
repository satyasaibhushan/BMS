import puppeteer from "puppeteer";
import { getListener, updateListener, removeListener } from "./index.js";

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
	const browser = await puppeteer.launch({ headless: true });
	const page = await browser.newPage();
	await page.goto(url, { waitUntil: waitUntil });
	await autoScroll(page);
	await page._client.send("Page.stopLoading");
	return [browser, page];
};

//type:city
//gets all the movies currently in a city
let getMoviesList = async (city) => {
	let [browser, page] = await launchPuppeteer(getUrl(city));

	const movies = await page.evaluate(() => {
		let images = Array.from(document.getElementsByTagName("img"));
		images = images.map((ele) => [ele.clientHeight / ele.clientWidth, ele]).filter(([ele, z]) => ele > 1.4 && ele < 2);
		images = images.map(([z, ele]) => {
			let alt = ele.alt;
			while (ele.tagName != "A") ele = ele.parentNode;
			return [alt, ele.href];
		});
		return images;
	});
	// await browser.close();
	return movies;
};

//type:city
//uses above function to check if a movie exists in a city
let doesMovieExist = async (city, movieName, getLink = false) => {
	let movies = await getMoviesList(city);
	movies = await movies.map(([ele, link]) => [ele.trim().toLowerCase().replace(/\s/g, ""), link]);
	movieName = formatMovieName(movieName);
	for (let i = 0; i < movies.length; i++) {
		const movie = movies[i][0];
		if (movie.includes(movieName)) return getLink ? movies[i][1] : true;
	}
	return false;
};

//type:city/theatre
//given a page to book tickets from, this function gets all the possible dates
let getDatesFromPage = async (theatre) => {
	let [browser, page] = await launchPuppeteer(theatre);

	let links = await page.evaluate(() => {
		let lists = Array.from(document.getElementsByTagName("li"));
		lists = lists.filter((ele) => ele.classList.contains("date-details"));

		lists = lists.map((ele) => {
			let name = ele.innerText.replace(/\s/g, " ");
			let url = Array.from(ele.childNodes).filter((ele) => ele.nodeName == "A")[0].href;
			return [name, url];
		});
		return lists;
	});
	browser.close();
	return links;
};

//type:city
//Given a movie link in a city, it gets the dates links for that movie using the above function
// this funciton also handles the case if the movie in the city has multiple formats
let getDatesFromMovie = async (city, movieName) => {
	let movieLink = await doesMovieExist(city, movieName, true);
	if (movieLink === false) {
		console.log("movie does not exist");
		return;
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

	return await getDatesFromPage(await page.url());
};

//type:city
//given a link of the movie in any format, this gets the links of all the formats
let getFormats = async (movieLink) => {
	if (movieLink == "") {
		console.log("invalid link 2");
		return;
	}
	let [browser, page] = await launchPuppeteer(movieLink);

	let formats = page.evaluate(() =>
		Array.from(document.getElementById("filterLanguage").childNodes)
			.filter((ele) => ele.tagName == "LI")
			.map((ele) => [
				ele.textContent.toLowerCase().trim().replace(/\s/g, ""),
				Array.from(ele.childNodes).filter((ele) => ele.tagName == "A")[0].href,
			])
	);
	// await browser.close();
	return formats;
};

//type:city
//gievn the movie link in a city, this gets all the shows of any date or any format
//dates param is used to avoid redundant calls to getDatesFromMovie
//giving date is highly recommended
let getAllShowsInCity = async (city, movieName, date = "", format = "", dates = "") => {
	let movieLink = await doesMovieExist(city, movieName, true);
	if (movieLink === false) {
		console.log("movie does not exist");
		return;
	}

	if (dates == "") dates = await getDatesFromMovie(city, movieName);
	if (!dates) return;
	let link = "";
	if (date != "") {
		date = formatMovieName(date).replace(/\D+/g, "").replace(/^0+/, "");

		for (let i = 0; i < dates.length; i++) {
			if (formatMovieName(dates[i][0].replace(/\D+/g, "").replace(/^0+/, "")) == date) {
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
		dates.forEach((ele) => {
			arr.push(getAllShowsInCity(movieLink, ele[0], format, dates));
		});
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
			await arr.push(await getAllShowsInCity(ele[1], date, ele[0], dates));
		}
		return arr;
	}

	let [browser, page] = await launchPuppeteer(link);

	let shows = page.evaluate(() => {
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
	// await page.close();
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
	// await browser.close();
	return movies;
};

//type:theatre
//given a theatres date, this function gets the no.of shows with given date & format
let getNoOfShowsFromDateAndMovieAndFormat = async (theatre, movieName, date, format = "") => {
	let dates = await getDatesFromPage(theatre);
	let theatreDateUrl = "";

	date = formatMovieName(date).replace(/\D+/g, "").replace(/^0+/, "");

	for (let i = 0; i < dates.length; i++) {
		if (formatMovieName(dates[i][0].replace(/\D+/g, "").replace(/^0+/, "")) == date) {
			theatreDateUrl = dates[i][1];
			break;
		}
	}
	if (theatreDateUrl == "") {
		console.log("invalid date");
		return 0;
	}
	let movies = await getMoviesFromTheatreDate(theatreDateUrl);
	movieName = formatMovieName(movieName);
	let count = 0;

	movies.forEach((ele) => {
		if (formatMovieName(ele[0]).includes(movieName)) {
			if (format == "") count += ele[2].length;
			else if (ele[1] == format) count += ele[2].length;
		}
	});
	return count;
};

let checkForCondition = async (func, expression, time, notify, listenerName, id) => {
	let timer = setInterval(async () => {
		let result = await func();
		notify(result);
		let listener = await getListener(id);
		listener.latestConsole = result;

		listener.count++;
		console.log(listener);
		if (await expression(result)) {
			console.log("condition met, exiting");
			await removeListener(id);
			clearInterval(timer);
		} else {
			if (listener.targetConsole !== true) listener.targetConsole = result;
		}
		await updateListener(id, listener);
	}, time);
};

export {
	doesMovieExist,
	getDatesFromMovie,
	getAllShowsInCity,
	getDatesFromPage,
	getNoOfShowsFromDateAndMovieAndFormat,
	checkForCondition,
};

(async () => {
	// getMoviesList("kolkata");
	// let result = await doesMovieExist("kharagpur", "kashmir");
	// let result = await getMoviesList("kharagpur");
	// let result = await getDatesFromTheatre(
	// 	"https://in.bookmyshow.com/buytickets/bombay-cineplex-kharagpur/cinema-kgpr-BCKR-MT"
	// );
	// let result = await getMoviesFromDate(
	// 	"https://in.bookmyshow.com/buytickets/bombay-cineplex-kharagpur/cinema-kgpr-BCKR-MT/20220312"
	// );
	// let result = await getNoOfShowsFromDateAndMovieAndFormat(
	// 	"https://in.bookmyshow.com/buytickets/bombay-cineplex-kharagpur/cinema-kgpr-BCKR-MT/20220312",
	// 	"kashmir",
	// 	"Hindi, 2D"
	// );
	// let result = await getDatesFromMovie("Kharagpur", "kashmir");
	// let result = await getAllShowsInCity("kolkata", "rrr", "  3 ", "hindi-2d");
	// let result = await getFormats("https://in.bookmyshow.com/buytickets/rrr-kharagpur/movie-kgpr-ET00320580-MT/20220331");
	// console.log(await result);
	// await checkForCondition(() => doesMovieExist("kharagpur", "rrr"), true, 5000, console.log);
})();
