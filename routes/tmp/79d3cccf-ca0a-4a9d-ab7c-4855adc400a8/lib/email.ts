// email-utils.ts

import * as nodemailer from 'nodemailer';
import Resend from 'resend';

const resendClient = Resend('your_resend_api_key');

export const sendEmailWithResend = async (to: string, subject: string, html: string) => {
  try {
    await resendClient.emails.send({
      to,
      from: 'your_email@example.com',
      subject,
      html,
    });
  } catch (error) {
    console.error('Error sending email with Resend:', error);
  }
};

export const sendEmailWithNodemailer = async (to: string, subject: string, html: string) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.example.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: 'your_email@example.com',
        pass: 'your_email_password',
      },
    });

    await transporter.sendMail({
      from: 'your_email@example.com',
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('Error sending email with Nodemailer:', error);
  }
};