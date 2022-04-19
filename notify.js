import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

let notify = async (toEmails, subject = "", html = "") => {
	if (subject == "") subject = "You have a notification from the BMS app";
	if (html == "") html = "<b>Hello world?</b>";
	// console.log(process.env.MailID);

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
			to: toEmails, // list of receivers
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

// await notify("satyasaibhushan@gmail.com");

export { notify };
