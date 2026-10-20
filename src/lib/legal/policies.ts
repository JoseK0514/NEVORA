/* NEVORA public policies: Privacy, Terms, Support and Account deletion.
 * Draft text from docs/compliance/README.md, adapted to what the app does today. Facts that only VELANI LLC can
 * decide stay null until Jose confirms them. While any is null the pages show a visible [CONFIRM_…] marker in
 * development and previews, and production hides the pages and their links (policiesVisible). */

export const SUPPORT_EMAIL = "support@thevelani.com";
export const POLICY_OPERATOR = "VELANI LLC";
/** Bump when the published wording changes; deletion requests record the version they were accepted under. */
export const POLICY_VERSION = "2026-10-20";

/* Confirmed by Jose on October 20, 2026 (Neon and Vercel verified in the connected accounts). Backup expiry uses
 * the interim wording Jose approved. Still open: VELANI LLC's mailing address (BUSINESS_CONTACT_DETAILS). Change the
 * effective date if the policies take effect on a later day. */
export const POLICY_FACTS: Record<string, string | null> = {
  EFFECTIVE_DATE: "October 20, 2026",
  SUPPORT_RESPONSE_TIME: "We aim to respond to support and privacy inquiries within two business days. Business days are Monday through Friday, excluding public holidays observed in Puerto Rico. Requests that need investigation may take longer to resolve.",
  DELETION_COMPLETION_PERIOD: "30 calendar days after we receive the request",
  RETENTION_SCHEDULE: "attendance, approved timecards, payroll calculations, published pay statements and their corrections and approvals for three years from the record’s final entry, and records supporting employment taxes for at least four years after the tax is due or paid, whichever is later; security and access logs for up to 90 days; records of privacy requests for 24 months after the request is closed; and records under a legal hold or unresolved dispute until the hold is released and the applicable period has passed. The longest applicable period applies, and a deletion request doesn’t restart it.",
  BACKUP_EXPIRY: "Our database keeps a restore history of six hours. We are verifying the maximum time any backup or exported copy is kept, and will update this policy once it is confirmed.",
  PROCESSORS_AND_PURPOSES: "Vercel hosts the application and runs its servers; Neon stores the database; a transactional email provider delivers recovery codes and other account email; and your browser’s push service, run by its maker (such as Apple, Google or Mozilla), delivers the notifications you turn on.",
  HOSTING_TRANSFER_DETAILS: "Our database and application servers are in the United States, in Northern Virginia. Email delivery, push notification services and our providers’ logs and support may process information in other locations.",
  SALE_SHARING_AND_TRACKING_STATEMENT: "NEVORA does not display advertisements, sell personal information, or share personal information for cross-context behavioral advertising. We do not track users across other companies’ applications or websites for advertising purposes. We disclose information to your employer and our service providers as necessary to operate NEVORA and for the purposes described in this policy.",
  EMPLOYER_DATA_RESPONSIBILITIES: "Your employer decides how NEVORA is used for workplace activities, including scheduling, attendance, timekeeping, payroll records and employee administration. VELANI LLC operates NEVORA and processes these workplace records on your employer’s documented instructions. Requests about workplace records your employer controls are coordinated with your employer, and VELANI LLC helps locate, correct, export or delete information where appropriate. VELANI LLC handles requests about information it controls for its own business purposes, such as direct support communications and service administration. Your employer remains responsible for employment decisions, payroll accuracy, required workplace notices and its own recordkeeping obligations.",
  REGIONAL_PRIVACY_DETAILS: "NEVORA currently serves the participating employer and its authorized workforce in Puerto Rico. Applicable United States federal and Puerto Rico requirements govern the handling of relevant workplace records.",
  BUSINESS_CONTACT_DETAILS: null,
};

export type PolicyFact = keyof typeof POLICY_FACTS;
/** A run of text: plain words, a fact, a link, or bold words. */
export type Inline = string | { fact: PolicyFact } | { href: string; text: string } | { strong: string };
export type Block = { p: Inline[] } | { list: Inline[][] };
export type PolicySection = { heading: string; blocks: Block[] };
export type PolicyDocument = { slug: "privacy" | "terms" | "support" | "account-deletion"; title: string; summary: string; effective: boolean; sections: PolicySection[] };

const mail = { href: `mailto:${SUPPORT_EMAIL}`, text: SUPPORT_EMAIL };
const f = (fact: PolicyFact) => ({ fact });

export const PRIVACY: PolicyDocument = {
  slug: "privacy", title: "Privacy Policy", effective: true,
  summary: "How NEVORA handles information when you use it on the web or in its apps.",
  sections: [
    { heading: "Who we are", blocks: [{ p: ["NEVORA is a workforce scheduling and operations service provided by VELANI LLC. This policy explains how information is handled when you use NEVORA through its website or mobile applications. Contact us at ", mail, " or ", f("BUSINESS_CONTACT_DETAILS"), "."] }] },
    { heading: "Your workplace", blocks: [{ p: ["Your employer or organization supplies and manages the information used to run its workspace. Authorized people in your workplace can see information according to their roles."] }, { p: [f("EMPLOYER_DATA_RESPONSIBILITIES")] }, { p: ["Contact your workplace administrator about schedules, pay records or corrections. You can also contact us about privacy, or use the account deletion process below."] }] },
    { heading: "Information NEVORA uses", blocks: [
      { p: ["Depending on the features your organization turns on and your role, NEVORA handles:"] },
      { list: [
        ["Account and work profile information, such as your name, sign-in and contact details, employee ID, role, workplace and assigned work locations."],
        ["Scheduling and attendance information, such as shifts, availability, time-off requests, shift exchanges, recorded work and break times, corrections and approval history."],
        ["Payroll-related information and documents where those features are turned on, including the pay records your organization enters."],
        ["Workplace content, such as company updates, shift notes, requests and acknowledgements."],
        ["Service and security information, such as sign-in and session records, access events, support requests and the technical information needed to deliver and protect the service."],
        ["Notification delivery information, such as push subscriptions on devices where you turn notifications on."],
      ] },
      { p: ["Information comes from you, your organization and its authorized users, your use of NEVORA, and the service providers that perform these functions. If a feature needs a device permission, it explains why when it asks."] },
    ] },
    { heading: "Why we use information", blocks: [{ p: ["To give you access to your account, show authorized work information, run scheduling and attendance features, process permitted requests, deliver workplace communications, provide payroll-related features your organization turns on, answer support requests, investigate misuse, protect accounts and meet applicable obligations."] }] },
    { heading: "Who receives information", blocks: [{ p: ["Your organization and its authorized users receive the information their roles need. Service providers process information for us: ", f("PROCESSORS_AND_PURPOSES"), " We may disclose information when the law requires it, or when it’s necessary to address fraud, security incidents or threats to anyone’s rights or safety, as the law allows."] }] },
    { heading: "Advertising and tracking", blocks: [{ p: [f("SALE_SHARING_AND_TRACKING_STATEMENT")] }] },
    { heading: "Where information is processed", blocks: [{ p: [f("HOSTING_TRANSFER_DETAILS")] }] },
    { heading: "How long we keep information", blocks: [
      { p: ["We keep information only as long as we need it. Each period follows the age of the record; a deletion request doesn’t restart it. Where a record fits more than one category, the longest period applies."] },
      { list: [
        [{ strong: "Attendance, approved timecards, payroll calculations, published pay statements" }, " and their corrections and approvals: three years from the record’s final entry, or longer when the employment-tax rule below or another requirement applies. They preserve wage calculations, payment history and evidence for payroll questions or disputes."],
        [{ strong: "Records supporting employment taxes:" }, " at least four years after the tax is due or paid, whichever is later."],
        [{ strong: "Security and access logs NEVORA manages:" }, " up to 90 days from the logged event, to investigate unauthorized access and keep the service secure."],
        [{ strong: "Records of privacy requests:" }, " 24 months after the request is closed, to show what was asked, how it was handled and any record kept."],
        [{ strong: "Optional profile information and account data" }, " with no continuing lawful purpose: removed within the deletion timetable below."],
        [{ strong: "Records under a legal hold or unresolved dispute:" }, " until the hold is released and the period that otherwise applies has passed."],
      ] },
      { p: ["When a record has to be kept, we limit its use and access to that purpose. Backups: ", f("BACKUP_EXPIRY")] },
    ] },
    { heading: "Your choices and requests", blocks: [{ p: ["You can manage notifications in NEVORA and in your device settings. Use your profile, or ask your workplace administrator, to correct workplace information. Email ", mail, " about access, correction, deletion or other privacy requests. We confirm your identity in a way that fits the request. ", f("REGIONAL_PRIVACY_DETAILS")] }] },
    { heading: "Deleting your account", blocks: [{ p: ["Open Profile, choose Delete my account, re-enter your password and confirm. If you no longer have the app, sign in to NEVORA on the web and do the same; see ", { href: "/account-deletion", text: "Account deletion" }, ". Before you confirm, we show what is removed and what may be kept for a specific obligation. We aim to complete eligible deletion requests within ", f("DELETION_COMPLETION_PERIOD"), ". We confirm it’s you before deleting anything; if some information must be kept, or the law allows more time, we explain why and for how long. Deleting your NEVORA account doesn’t change your employment."] }] },
    { heading: "Security", blocks: [{ p: ["We protect information with measures that fit it, including role-based access and encrypted connections. No way of storing or sending information removes every risk. Email ", mail, " if you think someone else has used your account. Never send passwords, verification codes or payroll documents by email."] }] },
    { heading: "Changes", blocks: [{ p: ["NEVORA is meant for authorized workplace use. We post changes to this policy with a new effective date and give additional notice where required. Questions go to ", mail, "."] }] },
  ],
};

export const TERMS: PolicyDocument = {
  slug: "terms", title: "Terms of Use", effective: true,
  summary: "The rules for using NEVORA.",
  sections: [
    { heading: "Using NEVORA", blocks: [{ p: ["NEVORA is provided by VELANI LLC for authorized workforce scheduling and operations. Use it only for a workspace you’re authorized to access, under these terms and applicable law. Your organization may have a separate service agreement with VELANI LLC."] }] },
    { heading: "Your account", blocks: [{ p: ["Keep your sign-in details private, give accurate information when asked, and report suspected unauthorized access to ", mail, ". Use only your own sign-in and permissions. Your organization manages work assignments and access by role. Report incorrect work records through the correction process or to your workplace administrator."] }] },
    { heading: "Work records and employment", blocks: [{ p: ["NEVORA helps record and share workplace information. Your employer remains responsible for its employment decisions, payroll obligations and workplace rules. Follow your workplace’s approval process to change attendance or other work records. These terms don’t waive any employment, wage, privacy or other legal rights."] }] },
    { heading: "Acceptable use", blocks: [{ p: ["Don’t harass, threaten, impersonate, discriminate against or abuse anyone. Don’t share unlawful or sexually exploitative content, expose someone’s private information without authority, send malware, try to get access you aren’t given, or falsify or tamper with work records. Use workplace communications for their intended purpose and respect intellectual property and confidentiality."] }] },
    { heading: "Your content", blocks: [{ p: ["You keep any rights you have in what you submit. You allow VELANI LLC, and the service providers working for it, to process it as needed to run NEVORA, deliver it to its intended audience, protect the service and meet applicable obligations. Only submit content you’re allowed to share."] }] },
    { heading: "Reporting concerns", blocks: [{ p: ["Email ", mail, " to report content or behavior that breaks these rules, including concerns about an administrator. Describe the item and where it appears, without extra personal information. We review concerns and may remove content or restrict accounts. Your workplace’s own reporting channels are also available."] }] },
    { heading: "Privacy and deletion", blocks: [{ p: ["Our ", { href: "/privacy", text: "Privacy Policy" }, " explains how information is handled and your choices. You can request account deletion from Profile; see ", { href: "/account-deletion", text: "Account deletion" }, ". Some workplace records may be kept for the specific purposes and periods explained there."] }] },
    { heading: "Access to the service", blocks: [{ p: ["Features depend on your role and your organization’s settings. We may restrict access to address security incidents, misuse or loss of authorization. Email ", mail, " about a restriction or a service problem. These terms don’t create any charge for you."] }] },
    { heading: "App license", blocks: [{ p: ["For the iOS app, Apple’s standard end-user license agreement applies unless VELANI LLC provides its own through the App Store. These terms apply alongside that license as the law allows."] }] },
    { heading: "Changes and contact", blocks: [{ p: ["We post updated terms with their effective date and give additional notice, or ask you to accept them, where required. Contact VELANI LLC at ", mail, " or ", f("BUSINESS_CONTACT_DETAILS"), "."] }] },
  ],
};

export const SUPPORT: PolicyDocument = {
  slug: "support", title: "Support", effective: false,
  summary: "Get help with NEVORA, a workforce scheduling and operations product of VELANI LLC.",
  sections: [
    { heading: "Contact support", blocks: [
      { p: ["Email ", mail, " about sign-in problems, technical issues, feedback, privacy questions or content concerns. ", f("SUPPORT_RESPONSE_TIME"), " Other business contact details: ", f("BUSINESS_CONTACT_DETAILS")] },
      { p: ["Include the app version, your device and its operating system version, and what happened. Add your workspace name if we need it to find the problem. Remove personal information from screenshots. ", { strong: "Never email your password, a verification code, bank details or payroll documents." }] },
    ] },
    { heading: "Questions about your work", blocks: [{ p: ["Ask your manager or workplace administrator about shifts, time-off decisions, pay or corrections to your work records. Contact NEVORA support if a problem in the app stops you from reaching them."] }] },
    { heading: "Signing in", blocks: [{ p: ["Use ", { href: "/forgot-access", text: "Forgot access" }, " on the sign-in page. If you no longer have the email address on your account, ask your manager or Owner: they can verify you and give you a recovery code. We will never ask for your password or a verification code by email."] }] },
    { heading: "Privacy and account deletion", blocks: [{ p: ["Read our ", { href: "/privacy", text: "Privacy Policy" }, ", or see ", { href: "/account-deletion", text: "Account deletion" }, " to start a request. You can do it on the web without the app."] }] },
    { heading: "Reporting content", blocks: [{ p: ["Email ", mail, " with a short description of the item and where it appears, without unnecessary personal information."] }] },
  ],
};

export const ACCOUNT_DELETION: PolicyDocument = {
  slug: "account-deletion", title: "Delete your NEVORA account", effective: false,
  summary: "You can ask us to delete your NEVORA account and the information linked to it, in the app or on the web.",
  sections: [
    { heading: "In the app or on the web", blocks: [
      { p: ["Open Profile, choose ", { strong: "Delete my account" }, ", read what happens, re-enter your password and confirm. If you’ve uninstalled the app, ", { href: "/login", text: "sign in to NEVORA on the web" }, " and do the same; the page opens after you sign in."] },
      { p: ["If you can’t sign in, use ", { href: "/forgot-access", text: "Forgot access" }, " first, or email ", mail, " and we’ll help you confirm it’s you."] },
    ] },
    { heading: "What happens next", blocks: [{ p: ["When you confirm, we save your request and show you a reference such as DEL-7KQ2M9XA. You’re signed out on every device and can’t sign in again. We aim to delete your account within ", f("DELETION_COMPLETION_PERIOD"), ", and we email you when it’s done if we have your email address. Quote your reference to ", mail, " to ask about it."] }] },
    { heading: "What is removed", blocks: [{ p: ["Your account and the information linked to it that can be deleted: your profile, sign-in details, sessions, notification subscriptions, calendar feed links and the content you contributed, including copies held by our service providers."] }] },
    { heading: "What may be kept", blocks: [{ p: ["Some attendance, payroll, security or dispute records may have to be kept for a recorded obligation. We keep ", f("RETENTION_SCHEDULE"), " Backups: ", f("BACKUP_EXPIRY"), " Kept records are restricted and never used to restore your account."] }] },
    { heading: "Your job and your workplace", blocks: [{ p: ["Deleting your NEVORA account doesn’t end your employment or remove records your employer has to keep. If you’re the Owner, your company’s workspace stays open for the rest of your team; closing a workspace is separate, so email ", mail, " to arrange it."] }] },
  ],
};

export const POLICY_DOCUMENTS = [PRIVACY, TERMS, SUPPORT, ACCOUNT_DELETION] as const;

const factsIn = (blocks: Block[]) => blocks.flatMap(block => ("p" in block ? [block.p] : block.list)).flat()
  .flatMap(run => (typeof run === "object" && "fact" in run ? [run.fact] : []));

/** Facts used by the documents that still have no value. */
export function unresolvedFacts(facts: Record<string, string | null> = POLICY_FACTS): PolicyFact[] {
  const used = new Set<PolicyFact>(["EFFECTIVE_DATE"]);
  for (const doc of POLICY_DOCUMENTS) for (const section of doc.sections) factsIn(section.blocks).forEach(fact => used.add(fact));
  return [...used].filter(fact => !facts[fact]?.trim());
}

/** Production shows the policies only when every fact is filled. Development and previews show the draft with
 * visible markers so it can be reviewed; NEVORA_SHOW_DRAFT_POLICIES=1 forces that elsewhere (never production). */
export function policiesVisible(env: Record<string, string | undefined> = process.env, facts: Record<string, string | null> = POLICY_FACTS): boolean {
  if (unresolvedFacts(facts).length === 0) return true;
  const production = env.VERCEL_ENV ? env.VERCEL_ENV === "production" : env.NODE_ENV === "production";
  return !production || (env.NEVORA_SHOW_DRAFT_POLICIES === "1" && env.VERCEL_ENV !== "production");
}
