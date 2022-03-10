import fetch from "node-fetch";
import puppeteer from "puppeteer";

let getUrl = (city) => {
	return `https://in.bookmyshow.com/explore/movies-${city}`;
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
	const browser = await puppeteer.launch({ headless: true });
	const page = await browser.newPage();
	await page.goto(url);
	await autoScroll(page);
	await console.log("hi");
	// await page.screenshot({ path: "example.png", fullPage: true });

	const movies = await page.evaluate(() => {
		let images = Array.from(document.getElementsByTagName("img"));
		// console.log(images);
		images = images
			.map((ele) => [ele.clientHeight / ele.clientWidth, ele.alt])
			.filter(([ele, z]) => ele > 1.4 && ele < 2)
			.map(([ele, x]) => x);
		//  console.log(images);
		return images;
	});
	// await console.log(movies);
	return movies;

	// await browser.close();
};

let doesMovieExist = async (city, movieName) => {
	let movies = await getMoviesList(city);
	movies = await movies.map((ele) => ele.trim().toLowerCase().replace(/\s/g, ""));
	movieName = movieName.toLowerCase().trim().replace(/\s/g, "");
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
	await console.log("hi");
	// await page.screenshot({ path: "example.png", fullPage: true });

	const movies = await page.evaluate(() => {
		let list = document.getElementById("showEvents");
		list = Array.from(list.getElementsByTagName("li")).filter((x) => {
			if (x.getAttribute("data-eventcode")) return true;
			else return false;
		});
		list = list.map((ele) => {
			let name, type;
			let links = Array.from(ele.getElementsByTagName("a"));
			type = ele.getElementsByClassName("eventInfo")[0].textContent;
			console.log(links);
			links.filter((link) => {
				if (link.classList.contains("nameSpan")) {
					name = link.innerHTML;
				}
			});
			console.log(name, type);
			return [name, type];
		});

		// console.log(list);
		return list;
	});
	// await console.log(movies);
    
	// await browser.close();

	return movies;

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

// getMoviesList("kolkata");
(async () => {
	// let result = await doesMovieExist("kharagpur", "Bheemlanayak");
	let result = await getDatesFromTheatre(
	    "https://in.bookmyshow.com/buytickets/bombay-cineplex-kharagpur/cinema-kgpr-BCKR-MT"
	);
	// let result = await getMoviesFromDate(
	// 	"https://in.bookmyshow.com/buytickets/bombay-cineplex-kharagpur/cinema-kgpr-BCKR-MT/20220312"
	// );
	await console.log(result);
})();
