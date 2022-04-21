import nodemailer from "nodemailer";
import dotenv from "dotenv";
import fetch from "node-fetch";
dotenv.config();

let notifyViaEmail = async (recievers, subject = "", html = "") => {
	if (subject == "") subject = "You have a notification from the BMS app";
	if (html == "") html = "<b>Hello world?</b>";

	// create reusable transporter object using the default SMTP transport
	let transporter = nodemailer.createTransport({
		host: "smtp.gmail.com",
		port: 587,
		secure: false, // true for 465, false for other ports
		auth: {
			user: process.env.MailID, // generated ethereal user
			pass: process.env.MailPassword, // generated ethereal password
		},
	});

	// send mail with defined transport object
	transporter.sendMail(
		{
			from: `"BMS mailer" <${process.env.MailID}>`, // sender address
			to: recievers, // list of receivers
			subject, // Subject line
			text: "Test", // plain text body
			html: html, // html body
		},
		(err, info) => {
			if (err) console.log("err:", err);
			else console.log(info);
			return;
		}
	);

	// console.log("Message sent: %s", info.messageId);
	// Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

	// Preview only available when sending through an Ethereal account
	// console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
};
let notifyViaSms = async (recievers, subject = "", html = "") => {
	//fast2sms cost 6k per year
	// const response = await fetch(
	// 	`\n https://www.fast2sms.com/dev/bulkV2?authorization=${process.env.SmsApiKey}
	// 	&route=v3&sender_id=${process.env.SmsSenderId}&message=${subject}\n ${html}&language=english&flash=0&numbers=${recievers}`,
	// 	{
	// 		headers: { "cache-control": "no-cache" },
	// 	}
	// );
	// const data = await response.json();

	// console.log(data);
};
export { notifyViaEmail, notifyViaSms };
