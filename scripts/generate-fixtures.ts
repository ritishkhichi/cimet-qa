import { writeFileSync, mkdirSync, copyFileSync } from "fs";
import path from "path";

/** Base turns from docs/call-transcript-redacted.pdf (Speaker 1 = customer, 2 = agent) */
const BASE: Array<{ speaker: "1" | "2"; text: string }> = [
  { speaker: "1", text: "Hello. [CUSTOMER_NAME] speaking." },
  {
    speaker: "2",
    text: "Yes. Hi, Alex. Good day. This is Sam from Internet's comparison. How are you?",
  },
  { speaker: "1", text: "Good. Thanks. How are you?" },
  {
    speaker: "2",
    text: "Yeah. I'm good. Thank you. And we noticed that you're looking for better Internet plans, and we're calling to assist you with this. And as I check it, your address is [SERVICE_ADDRESS] Correct.",
  },
  { speaker: "1", text: "Yep. [SERVICE_ADDRESS]." },
  {
    speaker: "2",
    text: "By the way, please be advised that this call will be recorded for quality assurance and training purposes. K? Now let me double check the address. Bear with me. As I check it yeah. The address is already an NBN ready, fiber to the premises technology. Okay? Now just to ask, [CUSTOMER_NAME], who's your current Internet service provider?",
  },
  { speaker: "1", text: "IPRIMUS." },
  { speaker: "2", text: "You are currently with iPRIMUS. How much are you paying?" },
  {
    speaker: "1",
    text: "They reduced it today to sixty five. That's all right here.",
  },
  {
    speaker: "2",
    text: "Sixty five dollars for how many MBPS? Do you know the speed?",
  },
  { speaker: "1", text: "Twenty five." },
  {
    speaker: "2",
    text: "Twenty five Mbps? Okay. And how many people are using the Internet?",
  },
  {
    speaker: "1",
    text: "Just myself. I just watch Netflix and that sort of stuff, and I've seen my TV still at like channel seven channel nine. I stream that through the Internet.",
  },
  {
    speaker: "2",
    text: "And do you need the home phone line? Do you need a landline or no?",
  },
  { speaker: "1", text: "No." },
  {
    speaker: "2",
    text: "Okay. Because I just want to tell you, I can give you a twenty five MBPS for only forty two dollars and ninety for the first six months.",
  },
  { speaker: "1", text: "Yep. And then what does it go up to?" },
  { speaker: "2", text: "Seventy two dollars and ninety. That's the regular price." },
  {
    speaker: "1",
    text: "I might save myself twenty dollars a month for six months, but then it's then I have seven dollars a month here. Maybe I'll just stay where I am.",
  },
  {
    speaker: "2",
    text: "I really understand. I can also give you a free modem with that with no extra cost.",
  },
  { speaker: "1", text: "Who is that through?" },
  { speaker: "2", text: "That is from [PROVIDER_A]." },
  {
    speaker: "1",
    text: "Right. [PROVIDER_A]. So free modem. And forty two dollars a month. Dollars. Do I get a check for it?",
  },
  {
    speaker: "2",
    text: "No. All the NBN plans, they're using only one network, all the retailers. That's the NBN. But for the mobile SIM plan, kindly use it at Telstra network.",
  },
  { speaker: "1", text: "And would it be a new modem or a refurbished one?" },
  {
    speaker: "2",
    text: "So that's the brand new modem. It's all yours. It's hundred percent free. Even you switch provider, even you move to a different property, you can keep and use the same modem.",
  },
  {
    speaker: "1",
    text: "Okay. So how does it how does it work? How does get changed over?",
  },
  {
    speaker: "2",
    text: "We can quickly set this up for you without paying any setup fee. It will be delivered to you within three to five business days.",
  },
  { speaker: "1", text: "Okay. And is there a cost involved in having it delivered?" },
  { speaker: "2", text: "No. It's hundred percent. No extra cost." },
  { speaker: "1", text: "Okay. Alright. Yep. Sounds like a good deal." },
  {
    speaker: "2",
    text: "This value plan from [PROVIDER_A] comes with a month to month contract only and provides twenty five Mbps typical in download speed and eight point five Mbps typical in the upload speed from seven PM to eleven PM. The original plan cost is seventy two dollars and ninety per month, but we have an offer where you will get this plan as forty two dollars and ninety only per month for the first six months and then seventy two dollars and ninety. The modem that you will receive is the Netcom CF forty Wi Fi six modem. Again, it's hundred percent free.",
  },
  {
    speaker: "1",
    text: "Okay. So there's no setting up or anything like that. You just plug it in?",
  },
  {
    speaker: "2",
    text: "Because it's already preconfigured to [PROVIDER_A]. That's why you don't need to reconfigure it. And this will be under your name. Am I correct?",
  },
  { speaker: "1", text: "Yes. Missus [CUSTOMER_NAME]. [CUSTOMER_FULL_NAME]." },
  {
    speaker: "2",
    text: "Can you please verify again your first and last name as per ID, please?",
  },
  { speaker: "1", text: "[CUSTOMER_FULL_NAME]." },
  {
    speaker: "2",
    text: "Okay. And then your email address, can you please also verify it? It's [EMAIL]. Thank you. And then your mobile number, can you please also verify it?",
  },
  { speaker: "1", text: "[PHONE]." },
  { speaker: "2", text: "Okay. And your date of birth?" },
  { speaker: "1", text: "[DOB]." },
  { speaker: "2", text: "And you are currently with I Primus. Right?" },
  { speaker: "1", text: "That's correct. Yes." },
  { speaker: "2", text: "Are you able to pull up your I Primus bill or no?" },
  { speaker: "1", text: "Yep. Got [ACCOUNT_NUMBER]." },
  {
    speaker: "2",
    text: "The connection address will be [SERVICE_ADDRESS]. Correct? And how soon do you want your connection to be at the address?",
  },
  { speaker: "1", text: "As soon as possible." },
  {
    speaker: "2",
    text: "And do you want your modem to be delivered at the same address, or do you want a different address?",
  },
  {
    speaker: "1",
    text: "Just with the delivery of the modem, the [STREET_NAME] entrance is closed at the moment. So they will have to come to [DELIVERY_ADDRESS]. There's two entrances.",
  },
  {
    speaker: "2",
    text: "I see. Okay. It's already noted. To set up your account, we need to collect your preferred payment method. Are you using a credit card or debit card? But before that, I need to mute the recording. K? Okay. The recording is already resumed.",
  },
  {
    speaker: "2",
    text: "Can you please look for the Netcom CF forty Wi Fi six modem? Make sure that you selected it. You will see the total minimum cost of three hundred seventeen dollars. You don't have to worry about the new development fee of two hundred seventy five dollars because your address is already NBN ready.",
  },
  { speaker: "1", text: "Yep. I've selected that." },
  { speaker: "1", text: "It's [DELIVERY_ADDRESS]." },
  {
    speaker: "2",
    text: "Okay. Can you please select no and then select the exact address.",
  },
  { speaker: "1", text: "Okay. So a text message, [OTP_CODE]." },
  {
    speaker: "2",
    text: "And then click submit application. Just let me know if you already have the reference number.",
  },
  { speaker: "1", text: "Yep. [REFERENCE_NUMBER]." },
  {
    speaker: "2",
    text: "Thank you for that. That means that you already take advantage of the offer. Congratulations for choosing [PROVIDER_A]. You need to wait for the delivery of the modem. It will be three to five business days.",
  },
  {
    speaker: "2",
    text: "Again, thank you also, [CUSTOMER_NAME]. This is [AGENT_NAME] again from Equinix Comparison. It was a pleasure to help you out. Cheers, and have a wonderful day.",
  },
  { speaker: "1", text: "Okay. Thank you." },
  { speaker: "2", text: "You're welcome. Bye for now. Bye." },
];

type Scenario = {
  id: string;
  title: string;
  expect: string;
  agentId: string;
  campaign: string;
  mutate: (rows: typeof BASE) => typeof BASE;
};

const SCENARIOS: Scenario[] = [
  {
    id: "BB-CLEAN-001",
    title: "Clean pass — all critical facts match CRM",
    expect: "SUBMITTED (first-pass)",
    agentId: "agent_clean",
    campaign: "Broadband Compare - AU",
    mutate: (rows) => rows.map((r) => ({ ...r })),
  },
  {
    id: "BB-ALL-PASS-001",
    title: "All pass — no critical issues (email must NOT fire)",
    expect: "SUBMITTED — no auto email",
    agentId: "agent_allpass",
    campaign: "Broadband Compare - AU",
    mutate: (rows) => rows.map((r) => ({ ...r })),
  },
  {
    id: "BB-MODEM-FAIL-001",
    title: "Modem mismatch — agent says PS forty vs CRM CF40",
    expect: "HELD (MODEM_MODEL critical FAIL)",
    agentId: "agent_modem",
    campaign: "Broadband Compare - AU",
    mutate: (rows) =>
      rows.map((r) => ({
        ...r,
        text: r.text
          .replace(/Netcom CF forty/gi, "Netcom PS forty")
          .replace(/CF forty/gi, "PS forty"),
      })),
  },
  {
    id: "BB-PRICE-FAIL-001",
    title: "Promo price mismatch — quotes $39.90 instead of $42.90",
    expect: "HELD (PLAN_PROMO_PRICE critical FAIL)",
    agentId: "agent_price",
    campaign: "Broadband Promo - NSW",
    mutate: (rows) =>
      rows.map((r) => ({
        ...r,
        text: r.text
          .replace(/forty two dollars and ninety/gi, "thirty nine dollars and ninety")
          .replace(/forty two dollars a month/gi, "thirty nine dollars a month"),
      })),
  },
  {
    id: "BB-NO-DISCLAIMER-001",
    title: "Missing recording disclaimer",
    expect: "HELD (RECORDING_DISCLAIMER critical FAIL)",
    agentId: "agent_nodisc",
    campaign: "Broadband Compare - VIC",
    mutate: (rows) =>
      rows.map((r) => {
        if (!r.text.includes("call will be recorded")) return { ...r };
        return {
          ...r,
          text: r.text.replace(
            /By the way, please be advised that this call will be recorded for quality assurance and training purposes\. K\?\s*/i,
            "By the way, thanks for taking my call. ",
          ),
        };
      }),
  },
  {
    id: "BB-DELIVERY-NOTE-001",
    title: "Facts OK + heavy delivery-address confusion (Type C NOTE)",
    expect: "SUBMITTED with DELIVERY_CONFUSION NOTE",
    agentId: "agent_delivery",
    campaign: "Broadband Compare - QLD",
    mutate: (rows) => {
      const out = rows.map((r) => ({ ...r }));
      const idx = out.findIndex((r) =>
        r.text.includes("they will have to come to [DELIVERY_ADDRESS]"),
      );
      if (idx >= 0) {
        out.splice(
          idx + 1,
          0,
          {
            speaker: "2",
            text: "Sorry… so is that the service address or delivery? Just checking… [pause] …still with me? Okay, service is [SERVICE_ADDRESS] and delivery is [DELIVERY_ADDRESS], right? Let me confirm again…",
          },
          {
            speaker: "1",
            text: "Uh… yeah the service one stays, delivery is the other entrance. Hello?",
          },
          {
            speaker: "2",
            text: "Sorry about that dead air. Okay noted again — delivery [DELIVERY_ADDRESS], service [SERVICE_ADDRESS].",
          },
        );
      }
      return out;
    },
  },
];

const CRM = {
  email: "customer.demo@example.com",
  phone: "0412 555 018",
  planPromoPrice: 42.9,
  planRegularPrice: 72.9,
  downloadMbps: 25,
  uploadMbps: 8.5,
  modemModel: "Netcom CF40 Wi-Fi 6",
  currentProvider: "iPRIMUS",
  providerSold: "Provider A Broadband",
  serviceAddress: "14 Demo Street, Suburb NSW 2000",
  deliveryAddress: "Unit 2, 14 Demo Street, Suburb NSW 2000",
  nbnReady: true,
};

function stamp(
  rows: Array<{ speaker: "1" | "2"; text: string }>,
) {
  let cursor = 0;
  const gapMs = 4500;
  return rows.map((row) => {
    const speaker = row.speaker === "2" ? "agent" : "customer";
    const duration = Math.min(12000, Math.max(2500, row.text.length * 40));
    const startMs = cursor;
    const endMs = cursor + duration;
    cursor = endMs + gapMs;
    return { speaker, text: row.text, startMs, endMs };
  });
}

function build() {
  const outDir = path.join(process.cwd(), "fixtures");
  const publicDir = path.join(process.cwd(), "public", "fixtures");
  mkdirSync(outDir, { recursive: true });
  mkdirSync(publicDir, { recursive: true });

  const manifest: Array<{
    id: string;
    title: string;
    expect: string;
    agentId: string;
    file: string;
  }> = [];

  for (let i = 0; i < SCENARIOS.length; i++) {
    const s = SCENARIOS[i];
    const rows = s.mutate(BASE);
    const utterances = stamp(rows);
    const transcript = {
      source: "CIMET_REDACTED_PDF_VARIANT",
      scenario: s.id,
      title: s.title,
      expectGate: s.expect,
      note: "Synthetic timestamps for demo; redaction placeholders preserved from CIMET PDF constraints.",
      externalLeadId: s.id,
      utterances,
    };
    const lead = {
      externalLeadId: s.id,
      retailerId: "provider_a",
      agentId: s.agentId,
      callAt: new Date(Date.UTC(2026, 2, 10 + i, 4, 0, 0)).toISOString(),
      crmFields: { ...CRM, campaign: s.campaign },
    };

    const tName = `transcript-${s.id}.json`;
    const lName = `lead-${s.id}.json`;
    writeFileSync(path.join(outDir, tName), JSON.stringify(transcript, null, 2));
    writeFileSync(path.join(outDir, lName), JSON.stringify(lead, null, 2));
    copyFileSync(path.join(outDir, tName), path.join(publicDir, tName));
    manifest.push({
      id: s.id,
      title: s.title,
      expect: s.expect,
      agentId: s.agentId,
      file: tName,
    });
  }

  // Keep legacy sample names as the clean scenario for older links
  const cleanT = path.join(outDir, "transcript-BB-CLEAN-001.json");
  const cleanL = path.join(outDir, "lead-BB-CLEAN-001.json");
  copyFileSync(cleanT, path.join(outDir, "sample-transcript.json"));
  copyFileSync(cleanL, path.join(outDir, "lead-sample.json"));
  copyFileSync(cleanT, path.join(publicDir, "sample-transcript.json"));

  writeFileSync(
    path.join(outDir, "scenarios.json"),
    JSON.stringify({ scenarios: manifest }, null, 2),
  );
  copyFileSync(
    path.join(outDir, "scenarios.json"),
    path.join(publicDir, "scenarios.json"),
  );

  console.log(`Wrote ${SCENARIOS.length} scenario fixtures → fixtures/ + public/fixtures/`);
}

build();
