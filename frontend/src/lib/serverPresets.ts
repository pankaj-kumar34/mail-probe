import { ServerProfile } from "../types";

export interface ServerPreset {
  id: string;
  name: string;
  description: string;
  badge: string;
  server: string;
  port: number;
  authType: string;
  startTLS: boolean;
  skipVerify: boolean;
  usernamePlaceholder?: string;
  passwordPlaceholder?: string;
}

export const SERVER_PRESETS: ServerPreset[] = [
  {
    id: "mailpit",
    name: "Mailpit / MailHog",
    description: "Standard local development SMTP catcher",
    badge: "Local",
    server: "localhost",
    port: 1025,
    authType: "plain",
    startTLS: false,
    skipVerify: true,
    usernamePlaceholder: "Optional",
    passwordPlaceholder: "Optional",
  },
  {
    id: "gmail",
    name: "Gmail SMTP",
    description: "Google Mail with TLS and App Password",
    badge: "Google",
    server: "smtp.gmail.com",
    port: 587,
    authType: "plain",
    startTLS: true,
    skipVerify: false,
    usernamePlaceholder: "you@gmail.com",
    passwordPlaceholder: "16-character App Password",
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    description: "Twilio SendGrid transactional relay",
    badge: "Cloud",
    server: "smtp.sendgrid.net",
    port: 587,
    authType: "plain",
    startTLS: true,
    skipVerify: false,
    usernamePlaceholder: "apikey",
    passwordPlaceholder: "SG.xxxxxxxxxxxx",
  },
  {
    id: "ses",
    name: "Amazon SES",
    description: "AWS Simple Email Service (us-east-1)",
    badge: "AWS",
    server: "email-smtp.us-east-1.amazonaws.com",
    port: 587,
    authType: "plain",
    startTLS: true,
    skipVerify: false,
    usernamePlaceholder: "SES SMTP Username",
    passwordPlaceholder: "SES SMTP Secret Key",
  },
  {
    id: "office365",
    name: "Microsoft 365",
    description: "Outlook / Exchange Online SMTP Auth",
    badge: "Microsoft",
    server: "smtp.office365.com",
    port: 587,
    authType: "login",
    startTLS: true,
    skipVerify: false,
    usernamePlaceholder: "you@company.com",
    passwordPlaceholder: "App Password or Password",
  },
  {
    id: "postmark",
    name: "Postmark",
    description: "Fast transactional email delivery",
    badge: "Fast",
    server: "smtp.postmarkapp.com",
    port: 587,
    authType: "plain",
    startTLS: true,
    skipVerify: false,
    usernamePlaceholder: "Server API Token",
    passwordPlaceholder: "Server API Token",
  },
  {
    id: "inbucket",
    name: "Inbucket Local",
    description: "Local test server on port 2500",
    badge: "Local",
    server: "localhost",
    port: 2500,
    authType: "plain",
    startTLS: false,
    skipVerify: true,
    usernamePlaceholder: "Optional",
    passwordPlaceholder: "Optional",
  },
];

export function applyPreset(profile: ServerProfile, preset: ServerPreset): ServerProfile {
  return {
    ...profile,
    server: preset.server,
    port: preset.port,
    authType: preset.authType,
    startTLS: preset.startTLS,
    skipVerify: preset.skipVerify,
  };
}
