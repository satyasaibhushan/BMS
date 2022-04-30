import { initializeListeners, getFileData } from "./index.js";
import { inquire } from "./inquirer.js";

await (async () => {
	await initializeListeners();
	// await inquire(
	// 	async () => {},
	// 	async () => await getFileData(),
	// 	async () => {},
	// 	async () => await getFileData(),
	// 	async () => {},
	// 	true
	// );
})();
