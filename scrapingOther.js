import { launchPuppeteer, decreaseTicks } from "./scraping.js";

let getAllLinksFromOkalama = async () => {
	let [browser, page] = await launchPuppeteer("https://oklama.com/", true, "networkidle0");

	let links = await page.evaluate(async () => {
		let links = Array.from(document.getElementsByTagName("a"));
		links = links.map((ele) => [ele.innerText, ele.href]);
		// console.log(links);
		return links;
	});
	await browser.close();
	await decreaseTicks();
	// console.log(await movies);
	return await links;
};

export { getAllLinksFromOkalama };
// (async () => {
// 	let result = await getAllLinksFromOkalama();
// 	console.log(await result);
// })();
