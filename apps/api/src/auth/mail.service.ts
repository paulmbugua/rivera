import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  async send(email: string, subject: string, path: string, token: string) {
    const link = `${process.env.APP_URL ?? 'http://localhost:3000'}${path}?token=${encodeURIComponent(token)}`;
    if (process.env.NODE_ENV !== 'production') { this.logger.log(`[development email to ${email}] ${subject}: ${link}`); return; }
    if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) throw new ServiceUnavailableException('Email service is unavailable');
    const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT ?? 587), secure: process.env.SMTP_PORT === '465', auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined });
    await transport.sendMail({ from: process.env.SMTP_FROM, to: email, subject, text: `Open this link to continue with Rivera: ${link}\n\nIf you did not request this, ignore this email.` });
  }
}
