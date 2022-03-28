import fetch from "node-fetch";
import puppeteer from "puppeteer";

let getUrl = (city) => {
	return `https://in.bookmyshow.com/explore/movies-${city}`;
};

let formatMovieName = (name) => name.toLowerCase().trim().replace(/\s/g, "");

let delay = (time) => {
	return new Promise(function (resolve) {
		setTimeout(resolve, time);
	});
};

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

let getMoviesList = async (city) => {
	let url = getUrl(city);
	const browser = await puppeteer.launch({ headless: false });
	const page = await browser.newPage();
	await page.goto(url, { waitUntil: "domcontentloaded" });
	await autoScroll(page);
	// await console.log("hi");
	// await page.screenshot({ path: "example.png", fullPage: true });

	const movies = await page.evaluate(() => {
		let images = Array.from(document.getElementsByTagName("img"));
		console.log(images);
		images = images.map((ele) => [ele.clientHeight / ele.clientWidth, ele]).filter(([ele, z]) => ele > 1.4 && ele < 2);
		images = images.map(([z, ele]) => {
			let alt = ele.alt;
			while (ele.tagName != "A") ele = ele.parentNode;
			return [alt, ele.href];
		});
		//  console.log(images);
		return images;
	});
	// await console.log(movies);
	// await browser.close();
	return movies;
};

let getDatesFromMovie = async (movieLink) => {
	const browser = await puppeteer.launch({ headless: false });
	const page = await browser.newPage();
	await page.goto(movieLink);
	await autoScroll(page);
	await page._client.send("Page.stopLoading");
	let oldUrl = page.url();

	let buttons = await page.evaluateHandle(() =>
		Array.from(document.getElementsByTagName("button")).filter(
			(ele) => ele.innerText.toLowerCase().trim().replace(/\s/g, "") === "booktickets"
		)
	);
	let originalLists = await page.evaluateHandle(() => Array.from(document.getElementsByTagName("li")));
	originalLists = await originalLists.getProperties();
	originalLists = Array.from(originalLists.values());

	buttons = await buttons.getProperties();
	let buttons_arr = Array.from(buttons.values());

	const [_, navigation] = await Promise.allSettled([buttons_arr[0].click(), page.waitForNavigation()]);
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

			const [_, navigation] = await Promise.allSettled([clickable.click(), page.waitForNavigation()]);
			await page._client.send("Page.stopLoading");
			// await clickable.click();
			return;
		}
		return;
	})();

	await page.waitForNavigation({ waitUntil: "domcontentloaded" });
	await page._client.send("Page.stopLoading");
	let links = await page.evaluate(() => {
		console.log("heelo");
		let lists = Array.from(document.getElementsByTagName("li"));
		// console.log(links);
		lists = lists.filter((ele) => ele.classList.contains("date-details"));
		console.log(lists);

		lists = lists.map((ele) => {
			let name = ele.innerText.replace(/\s/g, " ");
			let url = Array.from(ele.childNodes).filter((ele) => ele.nodeName == "A")[0].href;
			console.log(url);
			return [name, url];
		});
		return lists;
	});
	// console.log(links);
	return links;
};

let doesMovieExist = async (city, movieName) => {
	let movies = await getMoviesList(city);
	movies = await movies.map((ele) => ele.trim().toLowerCase().replace(/\s/g, ""));
	movieName = formatMovieName(movieName);
	// await console.log(movies);
	for (let i = 0; i < movies.length; i++) {
		const movie = movies[i];
		if (movie.includes(movieName)) return true;
	}
	movies.forEach((movie) => {});
	return false;
};

let getMoviesFromDate = async (date) => {
	const browser = await puppeteer.launch({ headless: false });
	const page = await browser.newPage();
	await page.goto(date, { waitUntil: "domcontentloaded" });
	await page._client.send("Page.stopLoading");
	await autoScroll(page);
	// await console.log("hi");
	// await page.screenshot({ path: "example.png", fullPage: true });

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
			console.log(links);
			links.filter((link) => {
				if (link.classList.contains("nameSpan")) {
					name = link.innerHTML;
				}
				if (link.classList.contains("showtime-pill")) {
					times.push(link.innerText);
				}
			});
			console.log(name, type, times);
			return [name, type, times];
		});

		// console.log(list);
		return list;
	});
	// await console.log(movies);

	// await browser.close();

	return movies;
};

let getNoOfShowsFromDateAndMovieAndFormat = async (date, movieName, format = "") => {
	let movies = await getMoviesFromDate(date);
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

let getDatesFromTheatre = async (theatre) => {
	const browser = await puppeteer.launch({ headless: true });
	const page = await browser.newPage();
	await page.goto(theatre, { waitUntil: "domcontentloaded" });
	await page._client.send("Page.stopLoading");
	await autoScroll(page);

	const dates = await page.evaluate(() => {
		let dates = Array.from(document.getElementsByClassName("date-details"));
		// console.log(dates)
		dates = dates.map((date) => [date.textContent.trim().replace(/\s/g, ""), date.getElementsByTagName("a")[0].href]);
		console.log(dates);
		return dates;
	});
	await browser.close();
	return dates;
};

let checkForCondition = async (func, value, time, notify) => {
	let timer = setInterval(async () => {
		let result = await func();
		notify(result);
		if (result == value) {
			console.log("condition met, exiting");
			clearInterval(timer);
		}
	}, time);
};

// getMoviesList("kolkata");
(async () => {
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
	// let result = await getDatesFromMovie("https://in.bookmyshow.com/kharagpur/movies/rrr/ET00094579");
	// let result = await getAllShowsInCity("https://in.bookmyshow.com/kharagpur/movies/rrr/ET00094579");
	await console.log(result);

	// await checkForCondition(() => doesMovieExist("kharagpur", "rrr"), true, 5000, console.log);
})();
