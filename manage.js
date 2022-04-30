import { getFileData, initializeListeners, addListeners, removeListener, listenerNames } from "./index.js";
import { getStringsFromListeners, getStringFromListener, inquire } from "./inquirer.js";

await (async () => {
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
