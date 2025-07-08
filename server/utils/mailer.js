import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.ALERT_EMAIL,
    pass: process.env.ALERT_EMAIL_PASSWORD,
  },
});

export async function sendAlertEmail(subject, message) {
  await transporter.sendMail({
    from: `"Macie Alert" <${process.env.ALERT_EMAIL}>`,
    to: process.env.ALERT_RECEIVER,
    subject,
    text: message,
  });
}
