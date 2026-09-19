/**
 * Critical HELD alerts — auto only when gate is HELD (issues present).
 * Channels (first that works): SMTP (Gmail app password) → Resend → FormSubmit → local outbox.
 */

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import nodemailer from "nodemailer";
import { logActivity } from "@/server/activity/logActivity";

const DEFAULT_TO = "ritish143khichi@gmail.com";

export function alertRecipient() {
  return process.env.ALERT_TO_EMAIL?.trim() || DEFAULT_TO;
}

async function writeOutbox(payload: {
  to: string;
  subject: string;
  body: string;
  leadId: string;
  ok: boolean;
  channel: string;
  error?: string;
}) {
  const dir = path.join(process.cwd(), "uploads", "email-outbox");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${Date.now()}-${payload.leadId}.json`);
  await writeFile(file, JSON.stringify({ ...payload, at: new Date().toISOString() }, null, 2));
  return file;
}

async function sendViaSmtp(opts: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ ok: boolean; error?: string }> {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) {
    return { ok: false, error: "SMTP not configured" };
  }
  const port = Number(process.env.SMTP_PORT || "587");
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  await transporter.sendMail({
    from: process.env.ALERT_FROM_EMAIL?.trim() || user,
    to: opts.to,
    subject: opts.subject,
    text: opts.body,
  });
  return { ok: true };
}

async function sendViaResend(opts: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return { ok: false, error: "RESEND_API_KEY not set" };
  const from =
    process.env.ALERT_FROM_EMAIL?.trim() || "CIMET QA <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, text: opts.body }),
  });
  if (!res.ok) {
    return { ok: false, error: await res.text() };
  }
  return { ok: true };
}

async function sendViaFormSubmit(opts: {
  to: string;
  subject: string;
  body: string;
  leadExternalId: string;
  agentId: string;
  failingCodes: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(
    `https://formsubmit.co/ajax/${encodeURIComponent(opts.to)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        _subject: opts.subject,
        message: opts.body,
        lead: opts.leadExternalId,
        agent: opts.agentId,
        checks: opts.failingCodes.join(", "),
        _template: "table",
        _captcha: false,
        _honey: "",
      }),
    },
  );
  const text = await res.text();
  if (!res.ok) return { ok: false, error: text };
  // FormSubmit returns success even on first activation-only send
  return { ok: true };
}

export async function sendCriticalAlert(opts: {
  leadExternalId: string;
  leadId: string;
  agentId: string;
  retailerId: string;
  failingCodes: string[];
  gateStatus: string;
  manual?: boolean;
}) {
  // Safety: never email on clean SUBMITTED unless manual test from UI
  if (opts.gateStatus !== "HELD" && !opts.manual) {
    await logActivity({
      type: "EMAIL_ALERT_SKIPPED",
      leadId: opts.leadId,
      message: `No email for ${opts.leadExternalId} — gate ${opts.gateStatus} (all clear / not held)`,
      meta: { gateStatus: opts.gateStatus },
    });
    return { ok: true as const, channel: "skipped", to: alertRecipient() };
  }

  if (!opts.failingCodes.length && !opts.manual) {
    await logActivity({
      type: "EMAIL_ALERT_SKIPPED",
      leadId: opts.leadId,
      message: `No email for ${opts.leadExternalId} — no critical fail codes`,
    });
    return { ok: true as const, channel: "skipped", to: alertRecipient() };
  }

  const to = alertRecipient();
  const subject = `[CIMET QA] Critical hold — ${opts.leadExternalId}`;
  const body = [
    `AUTOMATED ALERT — sale held for QA review`,
    ``,
    `Lead: ${opts.leadExternalId}`,
    `Gate: ${opts.gateStatus}`,
    `Retailer: ${opts.retailerId}`,
    `Agent: ${opts.agentId}`,
    `Failing checks: ${opts.failingCodes.join(", ") || "n/a"}`,
    `Open: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/leads/${opts.leadId}`,
    ``,
    opts.manual ? "(Manual resend from UI)" : "(Auto-triggered by scoring automation)",
  ].join("\n");

  let channel = "none";
  let error: string | undefined;

  const smtp = await sendViaSmtp({ to, subject, body }).catch((e) => ({
    ok: false as const,
    error: e instanceof Error ? e.message : String(e),
  }));
  if (smtp.ok) {
    channel = "smtp";
  } else {
    const resend = await sendViaResend({ to, subject, body }).catch((e) => ({
      ok: false as const,
      error: e instanceof Error ? e.message : String(e),
    }));
    if (resend.ok) {
      channel = "resend";
    } else {
      const fs = await sendViaFormSubmit({
        to,
        subject,
        body,
        leadExternalId: opts.leadExternalId,
        agentId: opts.agentId,
        failingCodes: opts.failingCodes,
      }).catch((e) => ({
        ok: false as const,
        error: e instanceof Error ? e.message : String(e),
      }));
      if (fs.ok) {
        channel = "formsubmit";
      } else {
        error = [smtp.error, resend.error, fs.error]
          .filter((x) => x && x !== "SMTP not configured" && x !== "RESEND_API_KEY not set")
          .join(" | ") || "All email channels failed";
        channel = "outbox-only";
      }
    }
  }

  const ok = channel !== "outbox-only" && channel !== "none";
  await writeOutbox({
    to,
    subject,
    body,
    leadId: opts.leadId,
    ok,
    channel,
    error,
  });

  await logActivity({
    type: ok ? "EMAIL_ALERT_SENT" : "EMAIL_ALERT_FAILED",
    leadId: opts.leadId,
    message: ok
      ? `Auto alert emailed to ${to} via ${channel} — ${opts.leadExternalId} [${opts.failingCodes.join(", ")}]`
      : `Alert FAILED for ${opts.leadExternalId} → ${to}: ${error?.slice(0, 180)}. Check FormSubmit activation or set SMTP_USER/SMTP_PASS (Gmail app password).`,
    meta: {
      to,
      channel,
      failingCodes: opts.failingCodes,
      gateStatus: opts.gateStatus,
      manual: !!opts.manual,
      ok,
      error: error?.slice(0, 500),
    },
  });

  return { ok, channel, to, error };
}
