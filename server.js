//require dotenv to read .env variables into Node
require("dotenv").config();

//require express to create and configure our HTTP server
const express = require("express");
const app = express();
const cors = require("cors");
app.use(cors());

//require mongoose to connect to our MongoDB database
const mongoose = require("mongoose");

// middleware
app.use(express.json());


// connect to db
mongoose
	.connect(process.env.MONGO_URI)
	.then(() => {
		console.log("connected to database");
		// listen to port
		app.listen(process.env.PORT, () => {
			console.log("listening for requests on port", process.env.PORT);
		});
	})
	.catch((err) => {
		console.log(err);
	});


app.use("/", (req,res) => {
    res.send("Medpal Cron Helper");
});

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: "medpal96@gmail.com",
		pass: process.env.PASS,
	},
});


app.use("/api/dailyreminder", async (req,res) => {
    console.log("running a check every hour");
	const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
	console.log(now);
	const hour = now.getHours();

	// check if it's time to send emails for morning, afternoon, evening, and night
	if (hour === 8 || hour === 13 || hour === 17 || hour === 21) {
		const medicines = await  Medicines.find({
			// find all medicines that have the respective timeOfDay set to true
			[`timeOfDay.${hourToTimeOfDay(hour)}.yesOrNot`]: true,
		});

		for (const medicine of medicines) {
			const user = await getUserById(medicine.user_id);
			console.log("user", user);
			const message = `Dear ${user.name}, it's time to take your medicine: ${medicine.name}`;

			// send an email to the user
			transporter.sendMail(
				{
					from: "medpal96@gmail.com",
					to: user.email,
					subject: "Medicine Reminder",
					text: message,
				},
				(error, info) => {
					if (error) {
						console.error(error);
					} else {
						console.log(`Email sent to ${user.email}: ${message}`);
					}
				}
			);
		}
	}
});

app.use("/api/expiryreminderdaily", async (req,res) => {
	console.log("running a check every day");
		const now = new Date(
			new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
		);

		const medicines = await Medicines.find({
			// find all medicines whose expiry date is equal to the current date
			expiry: now.toISOString().slice(0, 10),
		});

		for (const medicine of medicines) {
			const user = await getUserById(medicine.user_id);
			console.log("user", user);
			const message = `Dear ${user.name}, your medicine: ${medicine.name} has expired today. Kindly discard it from your physical inventory.`;

			// send an email to the user
			transporter.sendMail(
				{
					from: "medpal96@gmail.com",
					to: user.email,
					subject: "Medicine Expiry Warning",
					text: message,
				},
				(error, info) => {
					if (error) {
						console.error(error);
					} else {
						console.log(`Email sent to ${user.email}: ${message}`);
					}
				}
			);
		}
});

app.use("/api/expiryremindermonthly", async (req,res) => {
	console.log("running a check on the first day of every month");
		const now = new Date();
		const thisMonth = now.getMonth() + 1;
		const thisYear = now.getFullYear();

		// find all medicines that expire on the current month and year
		const medicines = await Medicines.find({
			expiry: {
				$gte: new Date(`${thisYear}-${thisMonth}-01`),
				$lt: new Date(`${thisYear}-${thisMonth + 1}-01`),
			},
		});

		console.log(medicines);

		for (const medicine of medicines) {
			const user = await getUserById(medicine.user_id);
			console.log("user", user);
			const message = `Dear ${user.name}, your medicine ${medicine.name} will expire this month.`;

			// send an email to the user
			transporter.sendMail(
				{
					from: "medpal96@gmail.com",
					to: user.email,
					subject: "Medicine Expiry Reminder",
					text: message,
				},
				(error, info) => {
					if (error) {
						console.error(error);
					} else {
						console.log(`Email sent to ${user.email}: ${message}`);
					}
				}
			);
		}
});

app.use("/api/appointmentreminderearly", async (req,res) => {
	console.log("checking.....");
		// Get the appointments scheduled for the next day
		const tomorrow = new Date(
			new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
		);
		console.log(tomorrow);
		tomorrow.setDate(tomorrow.getDate() + 1);
		const appointments = await Appointments.find({
			timeAndDate: {
				$gte: tomorrow.setHours(0, 0, 0, 0),
				$lt: tomorrow.setHours(23, 59, 59, 999),
			},
		});

		for (const appointment of appointments) {
			const user = await getUserById(appointment.user_id);
			console.log("user", user);
			const message = `Dear ${user.name}, you have an appointment tomorrow with ${appointment.doctorName} at ${appointment.timeAndDate.toTimeString()}. Check MedPal for more details.`;

			// send an email to the user
			transporter.sendMail(
				{
					from: "medpal96@gmail.com",
					to: user.email,
					subject: "Appointment Reminder",
					text: message,
				},
				(error, info) => {
					if (error) {
						console.error(error);
					} else {
						console.log(`Email sent to ${user.email}: ${message}`);
					}
				}
			);
		}
});

app.use("/api/appointmentreminderpresent", async (req,res) => {
	console.log("checking.....");
		// Get the appointments scheduled for the next day
		const today = new Date(
			new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
		);
		console.log(today);
		today.setDate(today.getDate());
		const appointments = await Appointments.find({
			timeAndDate: {
				$gte: today.setHours(5, 0, 0, 0),
				$lt: today.setHours(23, 59, 59, 999),
			},
		});

		for (const appointment of appointments) {
			const user = await getUserById(appointment.user_id);
			console.log("user", user);
			const message = `Dear ${user.name}, you have an appointment today with ${appointment.doctorName} at ${appointment.timeAndDate.toTimeString()}. Check MedPal for more details.`;
			console.log(message);
			// send an email to the user
			transporter.sendMail(
				{
					from: "medpal96@gmail.com",
					to: user.email,
					subject: "Appointment Reminder",
					text: message,
				},
				(error, info) => {
					if (error) {
						console.error(error);
					} else {
						console.log(`Email sent to ${user.email}: ${message}`);
					}
				}
			);
		}
});

function hourToTimeOfDay(hour) {
	if (hour === 8) return "morning";
	if (hour === 13) return "afternoon";
	if (hour === 17) return "evening";
	if (hour === 21) return "night";
	throw new Error("Invalid hour");
}

async function getUserById(userId) {
	const config = {
		method: "get",
		url: "https://medpal-backend.onrender.com/api/user/" + userId,
		headers: {},
	};

	try {
		const response = await axios.request(config);
		console.log(JSON.stringify(response.data));
		return response.data;
	} catch (error) {
		console.log(error);
		throw new Error("Unable to get user");
	}
}
