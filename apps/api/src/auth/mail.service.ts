import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';

export type MailMessage = { to: string; subject: string; text: string; html: string; developmentUrl?: string };
export interface MailProvider { send(message: MailMessage): Promise<void>; }
export const MAIL_PROVIDER = Symbol('MAIL_PROVIDER');

export class ConsoleMailProvider implements MailProvider {
  private readonly logger = new Logger('ConsoleMailProvider');
  async send(message: MailMessage) {
    this.logger.log(`[MAIL DEV] ${message.subject} for ${message.to}${message.developmentUrl ? `\n${message.developmentUrl}` : ''}`);
  }
}

export class SmtpMailProvider implements MailProvider {
  async send(message: MailMessage) {
    const from = process.env.SMTP_FROM || process.env.MAIL_FROM || (process.env.MAIL_FROM_ADDRESS
      ? { name: process.env.MAIL_FROM_NAME ?? 'Rivera', address: process.env.MAIL_FROM_ADDRESS }
      : undefined);
    if (!process.env.SMTP_HOST || !from) throw new ServiceUnavailableException('Email service is unavailable');
    const port = Number(process.env.SMTP_PORT ?? 587);
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD } : undefined,
    });
    await transport.sendMail({ from, replyTo: process.env.MAIL_REPLY_TO, to: message.to, subject: message.subject, text: message.text, html: message.html });
  }
}

const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[character]!);
const template = (heading: string, copy: string, label?: string, url?: string) => `<!doctype html><html><body style="margin:0;background:#f5f5f3;font-family:Arial,sans-serif;color:#171714"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:auto;background:#fff;border:1px solid #deded8;border-radius:18px"><tr><td style="padding:32px"><p style="margin:0 0 28px;font-weight:800;font-size:22px">R<span style="color:#0f766e">.</span> rivera</p><h1 style="font-size:28px;line-height:1.2;margin:0 0 16px">${escape(heading)}</h1><p style="font-size:16px;line-height:1.6;color:#52524b">${escape(copy)}</p>${url && label ? `<p style="margin:28px 0"><a href="${escape(url)}" style="display:inline-block;background:#171714;color:#fff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700">${escape(label)}</a></p><p style="font-size:13px;line-height:1.5;color:#73736b;word-break:break-all">${escape(url)}</p>` : ''}<p style="font-size:13px;color:#73736b;margin-top:32px">If you did not request this, you can safely ignore this email.</p></td></tr></table></td></tr></table></body></html>`;

@Injectable()
export class MailService {
  constructor(@Inject(MAIL_PROVIDER) private readonly provider: MailProvider) {}
  private link(path: string, token: string) { return `${process.env.APP_URL ?? 'http://localhost:3000'}${path}?token=${encodeURIComponent(token)}`; }
  sendVerificationEmail(email: string, token: string) {
    const url = this.link('/verify-email', token);
    return this.provider.send({ to: email, subject: 'Verify your Rivera email', text: `Welcome to Rivera. Verify your email to finish setting up your account: ${url}`, html: template('Verify your email', 'Welcome to Rivera. Verify your email to finish setting up your account.', 'Verify Email', url), developmentUrl: url });
  }
  sendPasswordResetEmail(email: string, token: string) {
    const url = this.link('/reset-password', token);
    return this.provider.send({ to: email, subject: 'Reset your Rivera password', text: `Reset your Rivera password: ${url}`, html: template('Reset your password', 'Use the secure link below to choose a new Rivera password.', 'Reset Password', url), developmentUrl: url });
  }
  sendWelcomeEmail(email: string, firstName: string) {
    return this.provider.send({ to: email, subject: 'Welcome to Rivera', text: `Welcome to Rivera, ${firstName}. Your email is verified.`, html: template(`Welcome, ${firstName}`, 'Your email is verified. You can now finish setting up your Rivera profile.') });
  }
}
