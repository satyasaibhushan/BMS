import inquirer from "inquirer";

let getStringsFromListeners = (listeners) => {
	return [
		listeners.map((ele) => ele.id),
		listeners.map(({ type, listener, options }) => {
			let string = `${type} - ${listener}`;
			for (const [key, value] of Object.entries(options)) {
				string += ` - ${value}`;
			}
			return string;
		}),
	];
};

let getChoices = (isrecur) => {
	return isrecur
		? ["show the current listeners"]
		: ["add a listener", "remove a listener", "show the current listeners", "start listeners"];
};

let inquireTime = async () => {
	let { time } = await inquirer.prompt({
		name: "time",
		type: "input",
		message: "Enter the frequency of listener in ms",
	});
	if (time < 5000) time = 5000;
	return time;
};

let inquireDate = async () => {
	let { date } = await inquirer.prompt({
		name: "date",
		type: "input",
		message: "Enter the Date of the movie required",
	});
	return date;
};

let inquireFormat = async () => {
	let { format } = await inquirer.prompt({
		name: "format",
		type: "input",
		message: "Enter the Format of the movie required",
	});

	return format;
};
let inquireMovieName = async () => {
	let { movieName } = await inquirer.prompt({
		name: "movieName",
		type: "input",
		message: "Enter the movie you want to add listener for",
	});
	return movieName;
};

let inquireAddCity = async () => {
	let { cityName: city } = await inquirer.prompt({
		name: "cityName",
		type: "input",
		message: "Enter the city you want to add listener for",
	});
	let movieName = await inquireMovieName();

	let ans = await inquirer
		.prompt({
			name: "cityListener",
			type: "list",
			message: "Do you want to add listener for",
			choices: [
				"a movie to appear",
				"an extra date to appear for a given movie",
				"an extra show appears for a given movie",
			],
		})
		.then(async ({ cityListener: answers }) => {
			let time;
			switch (answers) {
				case "a movie to appear":
					time = await inquireTime();
					return [0, { time, movieName, city }];
				case "an extra date to appear for a given movie":
					time = await inquireTime();
					return [1, { time, movieName, city }];
				case "an extra show appears for a given movie":
					let format = await inquireFormat();
					let date = await inquireDate();
					time = await inquireTime();
					return [2, { time, movieName, city, date, format }];
				default:
					break;
			}
		})
		.catch((error) => {
			if (error.isTtyError) {
				// Prompt couldn't be rendered in the current environment
			} else {
				// Something else went wrong
			}
		});
	return await ans;
};

let inquireAddTheatre = async () => {
	let { theatreName } = await inquirer.prompt({
		name: "theatreName",
		type: "input",
		message: "Enter the theatre's link you want to add listener for",
	});

	let ans = await inquirer
		.prompt({
			name: "theatreListener",
			type: "list",
			message: "Do you want to add listener for",
			choices: ["an extra date to appear for a given theatre", "an extra show appears for a given movie"],
		})
		.then(async ({ theatreListener: answers }) => {
			let time;
			switch (answers) {
				case "an extra date to appear for a given theatre":
					time = await inquireTime();
					return [0, { time, theatreName }];
				case "an extra show appears for a given movie":
					let date = await inquireDate();
					let movieName = await inquireMovieName();
					time = await inquireTime();
					return [1, { time, movieName, date, theatreName }];
				default:
					break;
			}
		})
		.catch((error) => {
			if (error.isTtyError) {
				// Prompt couldn't be rendered in the current environment
			} else {
				// Something else went wrong
			}
		});
	return await ans;
};

let inquireAdd = async () => {
	// console.log("inquire addd");
	return await inquirer
		.prompt({
			name: "listenerType",
			type: "list",
			message: "Do you want to add listener to a city/theatre",
			choices: ["city", "theatre"],
		})
		.then(async ({ listenerType: answers }) => {
			switch (answers) {
				case "city":
					return [0, ...(await inquireAddCity())];
				case "theatre":
					return [1, ...(await inquireAddTheatre())];
				default:
					break;
			}
		})
		.catch((error) => {
			if (error.isTtyError) {
				// Prompt couldn't be rendered in the current environment
			} else {
				// Something else went wrong
			}
		});
};

let inquireDelete = async (getIds) => {
	// console.log("hji", getStringsFromListeners(await getIds()));
	let [ids, strings] = getStringsFromListeners(await getIds());
	// console.log(await ids, await strings);
	return await inquirer
		.prompt({
			name: "ids",
			type: "list",
			message: "Select the listener you want to remove ",
			choices: [...strings],
			loop: false,
		})
		.then(async ({ ids: answers }) => {
			// console.log(answers);
			return ids[strings.indexOf(answers)];
		})
		.catch((error) => {
			if (error.isTtyError) {
				// Prompt couldn't be rendered in the current environment
			} else {
				// Something else went wrong
			}
		});
};

let inquire = async (addListener, getIds, removeListener, printTable, initialize, isrecur = false) => {
	await inquirer
		.prompt({
			name: "choice",
			type: "list",
			message: "choose an aciton",
			choices: getChoices(isrecur),
		})
		.then(async ({ choice: answers }) => {
			let result;
			switch (answers) {
				case "add a listener":
					result = await inquireAdd();
					// console.log(result);
					await addListener(...result);
					await inquire(addListener, getIds, removeListener, printTable, initialize, true);
					break;
				case "remove a listener":
					// console.log("j");
					result = await inquireDelete(getIds);
					// console.log(await result);
					await removeListener(await result);
					await inquire(addListener, getIds, removeListener, printTable, initialize, true);
					break;
				case "show the current listeners":
					// console.log("hey");
					await printTable();
					await inquire(addListener, getIds, removeListener, printTable, initialize, true);
					break;
				case "start listeners":
					await initialize();
					await inquire(addListener, getIds, removeListener, printTable, initialize, true);
					break;

				default:
					break;
			}
		})
		.catch((error) => {
			if (error.isTtyError) {
				// Prompt couldn't be rendered in the current environment
			} else {
				// Something else went wrong
			}
		});
};

export { inquire };
