import inquirer from "inquirer";
import { table } from "table";

let isValidKey = (key) => {
	if (key == "city" || key == "movieName" || key == "date" || key == "format" || key == "theatreUrl") return true;
	else return false;
};
let getStringFromListener = ({ type, listener, options }, isForDuplicateCheck = false) => {
	let string = `${type} - ${listener}`;
	for (const [key, value] of Object.entries(options)) {
		if ((isForDuplicateCheck && isValidKey(key)) || !isForDuplicateCheck) string += ` - ${value}`;
	}
	return string;
};
let getStringsFromListeners = (listeners) => [listeners.map((ele) => ele.id), listeners.map(getStringFromListener)];
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
	if (time == "") time = 10000;
	if (time < 5000) time = 5000;
	return time;
};
let inquireEmails = async () => {
	let emailsOut = await inquirer
		.prompt({
			name: "ifEmail",
			type: "list",
			message: "Do you want to enable email notifications?",
			choices: ["Yes", "No"],
		})
		.then(async ({ ifEmail }) => {
			if (ifEmail == "Yes") {
				let { emails } = await inquirer.prompt({
					name: "emails",
					type: "input",
					message: "Enter the emails with a seperated comma",
				});
				if (emails == "") emails = "satyasaibhushan@gmail.com";
				return emails;
			} else {
				return null;
			}
		});
	return emailsOut;
};

let inquireSms = async () => {
	return;
	let smsOut = await inquirer
		.prompt({
			name: "ifSms",
			type: "list",
			message: "Do you want to enable sms notifications?",
			choices: ["Yes", "No"],
		})
		.then(async ({ ifSms }) => {
			if (ifSms == "Yes") {
				let { numbers } = await inquirer.prompt({
					name: "numbers",
					type: "input",
					message: "Enter the mobile numbers with a seperated comma ",
				});
				if (numbers == "") numbers = "7970070007";
				return numbers;
			} else {
				return;
			}
		});
	return smsOut;
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
			let emails;
			let sms;
			switch (answers) {
				case "a movie to appear":
					time = await inquireTime();
					emails = await inquireEmails();
					// console.log(await emails);
					sms = await inquireSms();
					return [0, { time, movieName, city, emails, sms }];
				case "an extra date to appear for a given movie":
					time = await inquireTime();
					emails = await inquireEmails();
					sms = await inquireSms();
					return [1, { time, movieName, city, emails, sms }];
				case "an extra show appears for a given movie":
					let format = await inquireFormat();
					let date = await inquireDate();
					time = await inquireTime();
					emails = await inquireEmails();
					sms = await inquireSms();
					return [2, { time, movieName, city, date, format, emails, sms }];
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
	let { theatreUrl } = await inquirer.prompt({
		name: "theatreUrl",
		type: "input",
		message: "Enter the theatre's link you want to add listener for",
	});
	let { theatreName } = await inquirer.prompt({
		name: "theatreName",
		type: "input",
		message: "Enter the theatre's name of the given link",
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
			let emails;
			let sms;
			switch (answers) {
				case "an extra date to appear for a given theatre":
					time = await inquireTime();
					emails = await inquireEmails();
					sms = await inquireSms();
					return [0, { time, theatreUrl, theatreName, emails, sms }];
				case "an extra show appears for a given movie":
					let date = await inquireDate();
					let movieName = await inquireMovieName();
					let format = await inquireFormat();
					time = await inquireTime();
					emails = await inquireEmails();
					sms = await inquireSms();
					return [1, { time, movieName, date, theatreUrl, theatreName, format, emails, sms }];
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
				console.log("Prompt couldn't be rendered in the current environment")
				// Prompt couldn't be rendered in the current environment
			} else {
				console.log(error)
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

let getTable = (data) => {
	let table = [["Type", "Listener", "Latest \nConsole", "Target \nConsole", "Options", "Count"]];
	for (let i = 0; i < data.length; i++) {
		const ele = data[i];
		let arr = [];
		arr.push(ele.type);
		arr.push(ele.listener);
		if (ele.latestConsole == false) {
			arr.push(false);
			arr.push(true);
		} else {
			ele.latestConsole ? arr.push(ele.latestConsole.length) : arr.push(null);
			ele.targetConsole ? arr.push(`> ${ele.targetConsole.length}`) : arr.push(null);
		}
		let options = ``;
		if (ele.type == "city") {
			options = `city: ${ele.options.city} \nmovie: ${ele.options.movieName}`;
			if (ele.options.date && ele.options.date != "") {
				options += `\n date: ${ele.options.date} \nformat: ${ele.options.format}`;
			}
		} else {
			options = `theatre: ${ele.options.theatreName} `;
			if (ele.options.date && ele.options.date != "") {
				options += `\nmovie: ${ele.options.movieName} \ndate: ${ele.options.date} \nformat: ${ele.options.format}`;
			}
		}
		arr.push(options);
		arr.push(ele.count);
		table.push(arr);
	}
	return table;
};

let inquire = async (addListener, getIds, removeListener, getTableData, initialize, isrecur = false) => {
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
					await initialize();
					await inquire(addListener, getIds, removeListener, getTableData, initialize, true);
					break;
				case "remove a listener":
					// console.log("j");
					result = await inquireDelete(getIds);
					// console.log(await result);
					await removeListener(await result);
					await initialize();
					await inquire(addListener, getIds, removeListener, getTableData, initialize, true);
					break;
				case "show the current listeners":
					// console.log("hey");
					console.log(table(getTable(await getTableData())));
					await initialize();
					await inquire(addListener, getIds, removeListener, getTableData, initialize, true);
					break;
				case "start listeners":
					await initialize();
					await inquire(addListener, getIds, removeListener, getTableData, initialize, true);
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

export { inquire, getStringsFromListeners, getStringFromListener };
