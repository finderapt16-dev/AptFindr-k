/**
 * AptFindr legal documents.
 *
 * This module is deliberately isolated so it can be code-split: the text below
 * is only downloaded the first time somebody opens a policy dialog (see
 * policyLoader.js). It imports nothing but ids, so the chunk stays small and
 * fast to parse.
 *
 * Four documents are published:
 *   tenant-terms     - Terms of Service for tenant accounts
 *   tenant-privacy   - Privacy Policy for tenant accounts
 *   landlord-terms   - Terms of Service for landlord accounts
 *   landlord-privacy - Privacy Policy for landlord accounts
 */

import { policyIdFor } from "./policyIds.js";

export { policyIdFor };

export const POLICY_UPDATED = "September 29, 2026";

export const SUPPORT_EMAIL = "rentiloilo@example.com";

const SUPPORT = {
  email: SUPPORT_EMAIL,
  address: "La Paz, Iloilo City, Philippines",
};

const tenantTerms = {
  id: "tenant-terms",
  audience: "tenant",
  audienceLabel: "Tenant",
  kind: "terms",
  kindLabel: "Terms of Service",
  title: "Tenant Terms of Service",
  summary: "The rules for searching, saving, and inquiring about apartments on AptFindr.",
  updated: POLICY_UPDATED,
  highlights: [
    "AptFindr is a listing platform. Rent, deposits, and advance payments are always settled directly with the landlord.",
    "Keep your account details accurate, and never pay before you have viewed a unit and verified the owner.",
    "Reports and appeals are reviewed by the platform administrator before any listing or account is removed.",
  ],
  sections: [
    {
      heading: "1. Accepting These Terms",
      paragraphs: [
        "These Terms of Service govern your use of AptFindr as a tenant. By creating an account, signing in, or browsing listings, you confirm that you have read, understood, and agreed to these terms together with our Privacy Policy.",
        "If you do not agree with any part of these terms, please stop using the platform. If you are using AptFindr on behalf of another person, you confirm that you are authorised to accept these terms for them.",
      ],
    },
    {
      heading: "2. Who May Use AptFindr",
      bullets: [
        "You must be at least 18 years old, or of legal age in the Philippines, to create an account.",
        "You must provide a valid email address that you control, because verification and password recovery messages are sent there.",
        "One account per person. Accounts may not be sold, shared, or transferred.",
      ],
    },
    {
      heading: "3. Your Account and Security",
      paragraphs: [
        "Keep your username, email address, and password up to date and private. You are responsible for activity that happens through your account.",
      ],
      bullets: [
        "Choose a strong password and do not reuse a password from another service.",
        "Do not share account access, verification links, or reset links with anyone.",
        "Tell us immediately through Help & Support if you believe your account has been accessed without your permission.",
      ],
    },
    {
      heading: "4. Searching, Listing Details, and Availability",
      paragraphs: [
        "AptFindr displays apartment, room, rent, amenity, and location information supplied by landlords. Verification badges and review statuses show that a landlord or listing passed our review process, but they are not a guarantee of quality, safety, or availability.",
        "Details such as rent, room capacity, included utilities, and move-in dates may change without notice. Always confirm the current terms with the landlord before committing to a rental.",
      ],
    },
    {
      heading: "5. Inquiries, Viewings, and Communication",
      bullets: [
        "Use the platform's inquiry and contact features only for genuine rental purposes.",
        "Be respectful and truthful in your messages, reports, and profile information.",
        "Landlords are responsible for their own response times. AptFindr does not guarantee that an inquiry will be answered or that a viewing will be granted.",
      ],
    },
    {
      heading: "6. Payments Are Made Outside AptFindr",
      paragraphs: [
        "AptFindr does not process rent, deposits, reservation fees, or advance payments, and we never ask for payment inside the application. All payments are arranged directly between you and the landlord.",
      ],
      bullets: [
        "Never send money, e-wallet transfers, or bank deposits before viewing the unit and confirming the identity of the person you are dealing with.",
        "Ask for a written lease, an official receipt, and proof of ownership or authority to rent before paying.",
        "Treat requests for advance payment through unofficial channels as suspicious and report them to us.",
      ],
    },
    {
      heading: "7. Your Content",
      paragraphs: [
        "You keep ownership of the content you submit, such as reports, messages, and profile details. You give AptFindr permission to store and display that content only as needed to operate, secure, and improve the platform.",
      ],
      bullets: [
        "Do not post false, defamatory, discriminatory, or unlawful content.",
        "Do not upload other people's personal information, identification documents, or photos without permission.",
        "Content that violates these terms may be removed, and repeat violations may lead to account suspension.",
      ],
    },
    {
      heading: "8. Prohibited Activities",
      bullets: [
        "Impersonating a landlord, tenant, or AptFindr administrator.",
        "Scraping, mass-downloading, or republishing listings, photos, or other users' data.",
        "Attempting to bypass authentication, verification, or access controls.",
        "Using the platform to advertise unrelated services, run scams, or harass other users.",
        "Uploading malware or any code intended to disrupt the platform.",
      ],
    },
    {
      heading: "9. Reports, Reviews, and Appeals",
      paragraphs: [
        "You can report a suspicious listing, an inaccurate detail, or a user through Report a Problem in the application. Reports are reviewed by the platform administrator, who may request additional information, correct the listing, unpublish it, or restrict the account involved.",
        "Because reviews and appeals affect other people, keep reports factual and based on your own experience. Deliberately false reports may result in the loss of your reporting privileges or your account.",
      ],
    },
    {
      heading: "10. Suspension and Termination",
      paragraphs: [
        "We may suspend or close an account that violates these terms, harms other users, or puts the platform at risk. Where it is reasonable to do so, we will notify you and give you the opportunity to explain your side.",
        "You may stop using AptFindr at any time and may request account deletion from Settings. Deleting your account removes your profile, saved apartments, and reports, but some records may be retained as required by law or for security and audit purposes.",
      ],
    },
    {
      heading: "11. Disclaimers and Limits on Our Responsibility",
      paragraphs: [
        "AptFindr is a listing and discovery service. We are not a broker, leasing agent, or party to any rental agreement, and we do not own, manage, or inspect the properties listed on the platform.",
        "To the extent permitted by Philippine law, AptFindr is not liable for losses arising from dealings between tenants and landlords, from inaccurate listing information, or from interruptions to the service. Nothing in these terms removes rights that cannot be waived by law.",
      ],
    },
    {
      heading: "12. Changes to These Terms",
      paragraphs: [
        "We may update these terms to reflect new features, security requirements, or legal obligations. The revised version takes effect when it is published in the application, and the date at the end of this document is updated at the same time.",
        "If a change significantly affects your rights, we will provide a notice in the application or by email before it takes effect.",
      ],
    },
    {
      heading: "13. Contact Us",
      paragraphs: [
        `Questions about these tenant terms may be sent through Help & Support in the application, by email at ${SUPPORT.email}, or by writing to AptFindr, ${SUPPORT.address}.`,
      ],
    },
  ],
};

const tenantPrivacy = {
  id: "tenant-privacy",
  audience: "tenant",
  audienceLabel: "Tenant",
  kind: "privacy",
  kindLabel: "Privacy Policy",
  title: "Tenant Privacy Policy",
  summary: "What tenant information AptFindr collects, how it is used, and the choices you have.",
  updated: POLICY_UPDATED,
  highlights: [
    "We collect only what is needed to create, secure, and support your tenant account.",
    "Your email, reports, and favorites are never sold, and they are not shown publicly.",
    "You may access, correct, or request deletion of your personal information at any time.",
  ],
  sections: [
    {
      heading: "1. Information We Collect",
      paragraphs: ["We collect information you give us directly, information created while you use the platform, and limited technical information from your device."],
      bullets: [
        "Account details: username, email address, and an encrypted password.",
        "Profile details: first name, last name, optional middle initial, and optional mobile number.",
        "Activity data: saved apartments, inquiries, reports you submit, and notification preferences.",
        "Technical data: session tokens, approximate device and browser information, and error logs.",
        "Search data: the filters, price range, and areas you search, used to rank relevant listings.",
      ],
    },
    {
      heading: "2. Information We Do Not Ask For",
      bullets: [
        "AptFindr never asks for your password by email or chat, and we never ask for your bank or e-wallet credentials.",
        "Do not send us government identification numbers, payment screenshots, or lease documents for tenant accounts - they are not required.",
        "Keep sensitive personal information out of reports and messages that are not needed to resolve your concern.",
      ],
    },
    {
      heading: "3. How We Use Your Information",
      bullets: [
        "Create your account, verify your email address, and sign you in.",
        "Show apartment and room listings that match your saved preferences and searches.",
        "Deliver notifications, password recovery messages, and important account notices.",
        "Investigate reports, prevent fraud and abuse, and keep the platform secure.",
        "Understand which features are used so we can improve performance and usability.",
      ],
    },
    {
      heading: "4. Legal Basis and Consent",
      paragraphs: [
        "We process your personal information to perform our agreement with you (creating and managing your account), to comply with legal obligations, and based on your consent for optional features such as saved searches and notifications.",
        "You may withdraw consent for optional processing at any time in Settings without affecting the lawfulness of processing done before the withdrawal.",
      ],
    },
    {
      heading: "5. When Information Is Shared",
      paragraphs: ["We do not sell your personal information. We share it only in the limited situations below."],
      bullets: [
        "With Supabase, our authentication and database provider, which stores account data on our behalf under a data processing agreement.",
        "With Google, when you choose Sign Up with Google, so that your Google account can be used to authenticate.",
        "With a landlord, when you send an inquiry or a viewing request, so they can reply using the contact details you provide.",
        "With our administrator, who reviews reports, verifies accounts, and handles appeals.",
        "With authorities, when a valid legal request requires it, or to protect the rights and safety of users.",
      ],
    },
    {
      heading: "6. Cookies, Local Storage, and Offline Data",
      bullets: [
        "We use your browser's local storage to keep you signed in, remember favorites, and store interface preferences.",
        "The progressive web app caches interface files and the last loaded pages so the site can open offline; cached pages are refreshed when you go online.",
        "We do not use advertising cookies or third-party tracking pixels. Clearing your browser storage signs you out and removes cached data.",
      ],
    },
    {
      heading: "7. Data Retention",
      paragraphs: [
        "Account and profile information is kept while your account is active. When you delete your account, we remove your profile, favorites, and reports within a reasonable period.",
        "We may keep a limited record of deleted accounts for security, fraud prevention, dispute resolution, and legal compliance, for as long as it is needed for those purposes.",
      ],
    },
    {
      heading: "8. How We Protect Your Information",
      bullets: [
        "Passwords are stored as cryptographic hashes and are never visible to us.",
        "Sessions use revocable tokens issued by Supabase, and access to data is restricted by row-level security policies.",
        "Administrative functions for reviewing reports and verification are limited to authorised platform administrators.",
      ],
    },
    {
      heading: "9. Your Rights",
      paragraphs: ["Under the Data Privacy Act of 2012 (Republic Act No. 10173), you have the following rights over your personal information."],
      bullets: [
        "Be informed about how your data is collected and processed.",
        "Access the personal information we hold about you.",
        "Correct inaccurate or incomplete information from Settings.",
        "Object to or withdraw consent from optional processing.",
        "Request erasure or blocking of your data when it is no longer needed for the purpose it was collected.",
        "Data portability, and the right to file a complaint with the National Privacy Commission.",
      ],
    },
    {
      heading: "10. Children's Privacy",
      paragraphs: [
        "AptFindr is intended for users who are at least 18 years old. We do not knowingly collect personal information from minors. If we learn that a minor has created an account, we will deactivate it and delete the related information.",
      ],
    },
    {
      heading: "11. Changes to This Policy",
      paragraphs: [
        "We may update this policy as the platform evolves. The current version is always available from the Terms of Service and Privacy Policy links in the application, and the date at the end of this document shows when it last changed.",
      ],
    },
    {
      heading: "12. Contact Us",
      paragraphs: [
        `For privacy questions or requests, contact us through Help & Support in the application, by email at ${SUPPORT.email}, or in writing at AptFindr, ${SUPPORT.address}. Please include the email address registered to your account so we can verify your request.`,
      ],
    },
  ],
};

const landlordTerms = {
  id: "landlord-terms",
  audience: "landlord",
  audienceLabel: "Landlord",
  kind: "terms",
  kindLabel: "Terms of Service",
  title: "Landlord Terms of Service",
  summary: "The rules for publishing, managing, and maintaining property listings on AptFindr.",
  updated: POLICY_UPDATED,
  highlights: [
    "Landlord accounts and new listings are reviewed by the platform administrator before tenants can see them.",
    "Listings must reflect the real property: accurate rent, room availability, amenities, photos, and house rules.",
    "Reports, violations, and appeals are handled through in-app notifications, and repeated violations can unpublish a listing.",
  ],
  sections: [
    {
      heading: "1. Accepting These Terms",
      paragraphs: [
        "These Terms of Service govern the use of AptFindr by landlords, property owners, and authorised property managers. By registering a landlord account or publishing a listing, you confirm that you have read, understood, and agreed to these terms together with our Privacy Policy.",
        "These terms are in addition to the general rules that apply to all AptFindr users. If you are not authorised to offer the property for rent, do not publish it.",
      ],
    },
    {
      heading: "2. Eligibility, Verification, and Account Responsibility",
      bullets: [
        "You must be at least 18 years old and legally able to offer the property for rent in the Philippines.",
        "Register with your real name, a working email address, and a mobile number where you can be reached.",
        "Submit truthful business information, permit details, and supporting documents when they are requested during verification.",
        "Creating an account does not automatically publish a listing. A property becomes visible to tenants only after it is complete and approved.",
        "Keep your password private. You are responsible for every listing and message sent from your account, including actions by staff you allow to use it.",
      ],
    },
    {
      heading: "3. Listing Accuracy",
      paragraphs: ["Tenants rely on your listing to decide where to live. Every listing must describe the property as it exists today."],
      bullets: [
        "State the true monthly rent, inclusions, and any recurring charges such as water, electricity, or association dues.",
        "Mark rooms accurately as available, occupied, or under maintenance, and update the status as soon as it changes.",
        "List only amenities, appliances, furniture, and utilities that are actually provided.",
        "Use photos of the real unit. Do not use stock photos, photos of other properties, or heavily edited images that misrepresent the space.",
        "Describe the location honestly and keep the address precise enough for a tenant to find the building.",
      ],
    },
    {
      heading: "4. Rooms, Capacity, and Availability",
      bullets: [
        "Room capacity must match how many tenants may actually occupy the space under your own house rules and applicable regulations.",
        "Do not advertise a room that is already reserved or no longer offered for rent.",
        "Keep the number of published rooms consistent with the property so tenants do not see duplicate or ghost listings.",
      ],
    },
    {
      heading: "5. Communicating With Tenants",
      bullets: [
        "Reply to inquiries and viewing requests within a reasonable time, and keep the schedule you confirm.",
        "Be clear about move-in requirements, advance payments, deposit terms, and house rules before a tenant commits.",
        "Use tenant contact details only for legitimate rental-related communication.",
        "Never ask a tenant for their AptFindr password or any account verification link.",
      ],
    },
    {
      heading: "6. Prohibited Listings and Conduct",
      bullets: [
        "Listing a property you do not own or have authority to rent out.",
        "Discriminating against tenants on the basis of religion, ethnicity, disability, gender, or family status.",
        "Posting false, misleading, or bait listings to collect inquiries.",
        "Requesting payment for a reservation that does not exist, or collecting fees through AptFindr.",
        "Advertising unrelated services, spam, or content that is unlawful, harassing, or obscene.",
        "Automated scraping, bulk copying of tenant data, or attempts to bypass platform security.",
      ],
    },
    {
      heading: "7. Reports, Violations, and Appeals",
      paragraphs: [
        "Tenants can report a listing or an account through Report a Problem. Our administrator reviews each report, may ask you for clarification, and may request that a listing be corrected, temporarily unpublished, or permanently removed.",
        "You will receive an in-app notification when a report or violation involves your listing. If you disagree with a decision, use the appeal option in the notification to submit an explanation and supporting evidence. Appeals are reviewed before any permanent action is taken, and repeated or serious violations may lead to account suspension.",
      ],
    },
    {
      heading: "8. Fees, Taxes, and Legal Compliance",
      bullets: [
        "AptFindr does not collect rent, deposits, or commissions from tenants on your behalf.",
        "You are solely responsible for the taxes, permits, licences, and registrations required for your rental business, including BIR registration and receipts where applicable.",
        "You are responsible for complying with local ordinances, building and safety rules, occupancy limits, and Philippine rental and tenancy laws.",
        "Issue official receipts and a written lease agreement for the amounts you collect.",
      ],
    },
    {
      heading: "9. Suspension and Termination",
      paragraphs: [
        "We may hide a listing, revoke verification, or suspend an account that violates these terms, endangers tenants, or damages the trustworthiness of the platform. Where possible, we will notify you first and allow you to respond.",
        "You may remove a listing or close your account at any time. Closing your account does not cancel obligations you already have with your tenants, and does not remove records we must keep for legal or security reasons.",
      ],
    },
    {
      heading: "10. Disclaimers and Limits on Our Responsibility",
      paragraphs: [
        "AptFindr publishes your listing and connects you with tenants; we are not a party to your lease, and we do not guarantee inquiries, viewings, or rentals.",
        "To the extent permitted by Philippine law, AptFindr is not liable for losses caused by tenant conduct, by your reliance on platform statistics, or by service interruptions. Nothing in these terms removes rights that cannot be waived by law.",
      ],
    },
    {
      heading: "11. Changes to These Terms",
      paragraphs: ["We may update these terms to reflect new features, verification requirements, or legal obligations. Revised terms take effect when published in the application, and the date at the end of this document is refreshed at the same time. Significant changes are announced in the application or by email."],
    },
    {
      heading: "12. Contact Us",
      paragraphs: [`For questions about these landlord terms, contact us through Help & Support in the application, by email at ${SUPPORT.email}, or in writing at AptFindr, ${SUPPORT.address}.`],
    },
  ],
};

const landlordPrivacy = {
  id: "landlord-privacy",
  audience: "landlord",
  audienceLabel: "Landlord",
  kind: "privacy",
  kindLabel: "Privacy Policy",
  title: "Landlord Privacy Policy",
  summary: "What landlord information AptFindr collects, who can see it, and how verification documents are protected.",
  updated: POLICY_UPDATED,
  highlights: [
    "Listing details you publish are visible to tenants. Your verification documents are not.",
    "Permit numbers, owner identification, and evidence files are restricted to the platform administrator.",
    "You may access, correct, or request deletion of your personal information at any time.",
  ],
  sections: [
    {
      heading: "1. Information We Collect",
      bullets: [
        "Account details: username, email address, and an encrypted password.",
        "Profile details: first name, last name, optional middle initial, mobile number, and optional business name.",
        "Property data: addresses, coordinates, room details, rent, amenities, house rules, and uploaded photos.",
        "Verification data: owner identification, business permits, and other documents you choose to upload.",
        "Activity data: listing views, inquiries, reports, appeal history, and your notification and alert preferences.",
        "Technical data: session tokens, device and browser information, and error logs.",
      ],
    },
    {
      heading: "2. Verification Documents",
      paragraphs: [
        "Verification documents are handled separately from public listing content. They are stored in a restricted location and can only be opened by the platform administrator who reviews your application, using a dedicated evidence viewer.",
      ],
      bullets: [
        "Uploaded permits, identification, and evidence are never displayed to tenants and are not included in public listings.",
        "Upload only the documents requested for verification. Do not send documents that belong to another person unless you are authorised to submit them.",
        "You may request replacement or removal of a verification document once your account has been reviewed.",
      ],
    },
    {
      heading: "3. How We Use Your Information",
      bullets: [
        "Create and manage your landlord account and publish your listings.",
        "Review and verify your identity, business details, and authority to rent out the property.",
        "Connect you with tenants who inquire about or save your listings.",
        "Detect duplicate, fraudulent, or misleading listings and enforce platform policies.",
        "Send you notifications about inquiries, reports, violations, appeals, and account activity.",
        "Measure listing performance, such as views and favorites, and improve the platform.",
      ],
    },
    {
      heading: "4. What Tenants Can See",
      paragraphs: ["Information you publish is visible to signed-in tenants and, for some fields, on the public landing page."],
      bullets: [
        "Property name, address or general area, photos, rent, room availability, amenities, and house rules.",
        "Your display name, business name, verification badge, and the contact details you choose to share with an inquiring tenant.",
        "Your email address and mobile number are shared with a tenant only when needed to respond to a request you received.",
        "Verification documents, internal notes, and administrator review history are never shown to tenants.",
      ],
    },
    {
      heading: "5. When Information Is Shared",
      paragraphs: ["We do not sell your personal information."],
      bullets: [
        "With Supabase, our authentication and database provider, which stores account and listing data on our behalf.",
        "With the platform administrator, who reviews listings, verification documents, reports, and appeals.",
        "With a tenant, when you respond to an inquiry or share contact details yourself.",
        "With authorities, when a valid legal request requires it or when disclosure is needed to protect users.",
      ],
    },
    {
      heading: "6. Data Retention",
      paragraphs: [
        "Account, profile, verification, and listing data are kept while your account is active. Listings that are removed remain in the platform's audit history so that reports and appeals can still be reviewed.",
        "When you delete your account, your profile and listings are removed from the active application. A limited record may be retained for security, fraud prevention, dispute resolution, and legal compliance.",
      ],
    },
    {
      heading: "7. How We Protect Your Information",
      bullets: [
        "Passwords are stored as cryptographic hashes and are never visible to us.",
        "Photo and document uploads use dedicated storage services with access rules instead of plain public links.",
        "Administrative access to verification evidence is limited to authorised administrators and is logged.",
        "Access to listing and account data is restricted by row-level security policies.",
      ],
    },
    {
      heading: "8. Cookies, Local Storage, and Offline Data",
      bullets: [
        "Local storage keeps you signed in, remembers your dashboard preferences, and stores draft listings while you work offline.",
        "The progressive web app caches interface files so the dashboard can open with a weak connection; cached files are refreshed when you go online.",
        "We do not use advertising cookies or third-party tracking pixels.",
      ],
    },
    {
      heading: "9. Your Rights",
      paragraphs: ["Under the Data Privacy Act of 2012 (Republic Act No. 10173), you have the following rights over your personal information."],
      bullets: [
        "Be informed about how your data is collected and processed.",
        "Access the personal information and verification records we hold about you.",
        "Correct inaccurate or incomplete information in Settings.",
        "Object to or withdraw consent from optional processing, such as optional notification and alert preferences.",
        "Request erasure or blocking of data that is no longer needed for the purpose it was collected for.",
        "Data portability, and the right to file a complaint with the National Privacy Commission.",
      ],
    },
    {
      heading: "10. Changes to This Policy",
      paragraphs: ["We may update this policy as the platform evolves. The current version is always available from the Terms of Service and Privacy Policy links in the application, and the date at the end of this document shows when it last changed."],
    },
    {
      heading: "11. Contact Us",
      paragraphs: [`For privacy questions, verification document concerns, or data requests, contact us through Help & Support in the application, by email at ${SUPPORT.email}, or in writing at AptFindr, ${SUPPORT.address}. Please include the email address registered to your account so we can verify your request.`],
    },
  ],
};

export const POLICIES = {
  "tenant-terms": tenantTerms,
  "tenant-privacy": tenantPrivacy,
  "landlord-terms": landlordTerms,
  "landlord-privacy": landlordPrivacy,
};

/** Flat list of document ids, useful for tests and prefetching. */
export const POLICY_IDS = Object.keys(POLICIES);

/** Returns a policy object, or null when the id is unknown. */
export function getPolicy(id) {
  return POLICIES[id] ?? null;
}

