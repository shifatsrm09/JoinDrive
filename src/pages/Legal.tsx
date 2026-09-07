import type { ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, Mail } from "lucide-react";
import { Link } from "react-router-dom";

type Section = { id: string; title: string; content: ReactNode };

const contact = <a href="mailto:shifatsrm09@gmail.com">shifatsrm09@gmail.com</a>;

const privacySections: Section[] = [
  {
    id: "overview",
    title: "1. About this policy",
    content: <p>JoinDrive is an independent application that brings multiple Google Drive accounts into one file explorer. This policy explains how JoinDrive accesses, uses, stores, and shares information when you visit the website or connect an account. For privacy questions or requests, contact the operator of JoinDrive at {contact}.</p>,
  },
  {
    id: "information",
    title: "2. Information we access and collect",
    content: <>
      <p>When you sign in or connect another account, Google provides your name, email address, profile picture, Google account identifier, and the access and refresh tokens that let JoinDrive perform authorized actions. We also store which account is primary, connection dates, and token-expiry and account-update information. JoinDrive does not receive your Google password.</p>
      <p>To display and manage your Drives, JoinDrive accesses file and folder names, identifiers, types, sizes, modification dates, thumbnails, ownership and sharing information, favourites, trash status, and storage usage. We process your search requests, selected upload files, and the actions you request, including sharing recipients you enter.</p>
      <p>Website hosting and application logs may contain technical information such as IP addresses, request details, browser information, timestamps, and errors. These are used to operate the service and investigate failures or abuse.</p>
    </>,
  },
  {
    id: "permissions",
    title: "3. Why we request Google Drive access",
    content: <>
      <p>JoinDrive requests permission to view and manage files across the Google Drive accounts you connect. This broad permission is needed for the current explorer to browse and search existing files, upload and download content, create folders, rename, copy, move, share, mark favourites, and manage trash. Some actions, including permanently deleting files, cannot be undone.</p>
      <p>Google shows the requested permissions before you authorize access. We use those permissions to provide the features you choose to use. Connecting accounts does not merge their storage or make their files public. Sharing a file through JoinDrive changes its Google Drive sharing permissions according to your selection.</p>
    </>,
  },
  {
    id: "use",
    title: "4. How we use your information",
    content: <>
      <p>We use account information to sign you in, identify your connected Drives, maintain your session, and refresh authorized access. File information is used to show your explorer and carry out your file-management requests. Temporary caches help avoid repeated requests and make browsing faster.</p>
      <p>We do not sell Google user data, use it for advertising, or use it to train general-purpose artificial intelligence or machine-learning models. Human access to Google user data is limited to cases permitted by Google's policy, such as your explicit consent for specific support, necessary security investigations, or legal obligations.</p>
      <p>Our handling of Google user data follows the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including its Limited Use requirements.</p>
    </>,
  },
  {
    id: "storage",
    title: "5. Where data is stored and processed",
    content: <>
      <p>Your files remain in Google Drive. Upload contents are sent directly from your browser to Google. Download contents and Google document exports pass through JoinDrive's server to your browser; JoinDrive does not maintain a separate file-content archive.</p>
      <p>Account profiles, connection information, and OAuth tokens are stored in MongoDB Atlas. Vercel hosts the website and processes backend requests. Google, Vercel, and MongoDB process the information needed to deliver their respective services, which may involve systems outside your country. Their own policies also apply to their services.</p>
      <p>The production website uses HTTPS, and session cookies are protected from access by page scripts. No internet service can guarantee absolute security. Do not send passwords, access tokens, or confidential file contents when contacting support.</p>
    </>,
  },
  {
    id: "sharing",
    title: "6. When information is shared",
    content: <p>Information is sent to Google to perform the actions you request, and processed by our hosting and database providers as described above. If you share a file, the recipients or link audience you choose may gain access through Google Drive. We may disclose information when legally required or when necessary to address fraud, abuse, or security incidents, subject to Google's data-use requirements. We do not share Google user data with advertising networks or data brokers.</p>,
  },
  {
    id: "cookies",
    title: "7. Cookies and browser storage",
    content: <p>JoinDrive uses essential cookies to keep you signed in and validate Google sign-in requests. Your grid or list preference is saved in your browser's local storage, and file listings may be cached temporarily in memory. The application does not include advertising cookies or third-party marketing analytics. Blocking essential cookies may prevent sign-in from working.</p>,
  },
  {
    id: "control",
    title: "8. Retention, deletion, and your choices",
    content: <>
      <p>We retain your account profile and connection credentials while your JoinDrive account remains active. Disconnecting an additional Drive removes that connection's stored account record and tokens. To remove your primary account and all connected records, open the account menu in the explorer and choose Delete account. Deleting your JoinDrive account does not delete the files in your Google Drives.</p>
      <p>You can independently revoke Google's authorization at any time in your <a href="https://myaccount.google.com/connections" target="_blank" rel="noopener noreferrer">Google Account connections</a>. Revoking access stops future authorized API use but does not itself delete your JoinDrive database records. Use account deletion or contact us to request their removal.</p>
      <p>Account deletion removes your records from the active application database. Temporary caches, infrastructure logs, and any provider backups may persist under their normal retention processes; we do not promise immediate deletion of every historical copy. Where applicable, records may be retained to meet a legal obligation or address security incidents.</p>
      <p>Depending on where you live, you may have rights to access, correct, receive a copy of, or delete personal information, or object to certain processing. Send requests to {contact}. We may need to verify that the request concerns your account.</p>
    </>,
  },
  {
    id: "updates",
    title: "9. Policy updates and contact",
    content: <p>Updates to this policy will appear on this page with a revised date. Material changes to the use of Google data will require any additional notice or consent required by applicable rules before that new use begins. Contact {contact} with questions, privacy requests, or concerns about this policy.</p>,
  },
];

const termsSections: Section[] = [
  {
    id: "agreement",
    title: "1. Using JoinDrive",
    content: <p>These Terms of Service govern your use of JoinDrive at joindrive.vercel.app. By using the service, you agree to these terms. If you do not agree, do not use JoinDrive. You must meet the requirements for your Google account and have the legal capacity, or any legally required parent or guardian permission, to accept these terms.</p>,
  },
  {
    id: "service",
    title: "2. What the service provides",
    content: <>
      <p>JoinDrive is an independent file explorer for multiple Google Drive accounts. It helps you browse, search, upload, download, organize, and share files through Google's APIs. It is not affiliated with or endorsed by Google.</p>
      <p>Your files and storage quotas remain with the respective Google accounts. Connecting multiple accounts does not combine their storage into a new Google Drive or provide additional storage. JoinDrive is currently provided without a subscription fee. Any future paid offering would require separate information and your agreement before charges apply.</p>
    </>,
  },
  {
    id: "accounts",
    title: "3. Your accounts and permissions",
    content: <p>Only connect accounts you own or are authorized to manage. You are responsible for protecting your Google accounts, keeping your devices secure, and reviewing the permissions you grant. Your primary Google account identifies your JoinDrive account; additional accounts can be connected to that account. Google or your organization's administrator may limit or revoke access.</p>,
  },
  {
    id: "files",
    title: "4. Your files and your actions",
    content: <>
      <p>You keep ownership of your files and any rights you already have in them. You authorize JoinDrive to access and process them only as needed to provide the features you request and as described in the <Link to="/privacy-policy">Privacy Policy</Link>.</p>
      <p>Check the selected account, destination, and sharing audience before confirming an action. Renaming, moving, sharing, or deleting through JoinDrive affects the actual Google Drive file. Permanently deleting files or emptying trash may be irreversible. Keep separate backups of important content; JoinDrive is not a backup service.</p>
    </>,
  },
  {
    id: "acceptable-use",
    title: "5. Acceptable use",
    content: <p>Do not use JoinDrive to access someone else's data without authorization, violate privacy or intellectual-property rights, distribute unlawful or malicious content, bypass access controls or service limits, or disrupt the service. Your use must also comply with applicable Google terms and the rules of any organization that manages a connected account.</p>,
  },
  {
    id: "availability",
    title: "6. Availability and third-party services",
    content: <>
      <p>JoinDrive depends on Google, hosting, database services, and your internet connection. API quotas, storage limits, hosting limits, outages, or changes to those services can delay, interrupt, or prevent an operation. Large downloads may be interrupted by server execution limits. We do not guarantee continuous availability, a particular transfer speed, or successful completion of every operation.</p>
      <p>Features may change or be discontinued. Third-party services have their own terms and privacy policies, including <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">Google's Terms of Service</a>. JoinDrive does not control those services.</p>
    </>,
  },
  {
    id: "ending-use",
    title: "7. Ending your use",
    content: <p>You can stop using JoinDrive, disconnect additional accounts, delete your JoinDrive account through the explorer's account menu, and revoke authorization in your <a href="https://myaccount.google.com/connections" target="_blank" rel="noopener noreferrer">Google Account connections</a>. Deleting your JoinDrive account does not delete your Google Drive files. Access may be restricted when necessary to address misuse, security risks, legal requirements, or service shutdown. Data handling after deletion is described in the <Link to="/privacy-policy#control">Privacy Policy</Link>.</p>,
  },
  {
    id: "disclaimer",
    title: "8. Disclaimers and responsibility",
    content: <p>To the extent permitted by applicable law, JoinDrive is provided as available, without guarantees that it will be error-free or suitable for every purpose. To that same extent, the operator is not responsible for indirect or consequential losses arising from service interruptions, third-party failures, or actions you authorize. Nothing in these terms excludes liability or limits consumer rights that cannot legally be excluded or limited.</p>,
  },
  {
    id: "contact",
    title: "9. Changes and contact",
    content: <p>Changes to these terms will be published here with an updated date. Where additional notice or agreement is legally required, it will be obtained before those changes apply. For questions about these terms, support, or concerns about use of the service, contact the operator of JoinDrive at {contact}.</p>,
  },
];

export default function Legal({ kind }: { kind: "privacy" | "terms" }) {
  const isPrivacy = kind === "privacy";
  const sections = isPrivacy ? privacySections : termsSections;

  return (
    <div className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:px-8 sm:pb-24 sm:pt-14">
      <Link to="/" className="inline-flex min-h-10 items-center gap-2 text-sm text-[#aaa] hover:text-white"><ArrowLeft size={15} aria-hidden="true" /> Back to home</Link>
      <div className="mb-12 mt-8 border-b border-white/10 pb-10 sm:mt-12">
        <p className="mb-4 text-xs uppercase tracking-[0.18em] text-[#95aac0]">{isPrivacy ? "Your data, explained" : "The terms of using JoinDrive"}</p>
        <h1 className="text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">{isPrivacy ? "Privacy Policy" : "Terms of Service"}</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[#aaa]">{isPrivacy ? "What we access, why we need it, and the choices you have when you connect your Google Drives." : "A clear understanding of what JoinDrive provides and your responsibilities when managing files."}</p>
        <p className="mt-5 text-xs text-[#888]">Last updated: September 8, 2026</p>
      </div>
      <div className="grid gap-12 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-16">
        <aside>
          <nav aria-label="On this page" className="lg:sticky lg:top-8">
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-[#888]">On this page</p>
            <ol className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
              {sections.map(section => <li key={section.id}><a href={`#${section.id}`} className="leading-6 text-[#aaa] transition hover:text-white">{section.title.replace(/^\d+\. /, "")}</a></li>)}
            </ol>
            <a href="mailto:shifatsrm09@gmail.com" className="mt-7 inline-flex min-h-10 items-center gap-2 border-t border-white/10 pt-4 text-sm text-[#b8cddd]"><Mail size={15} aria-hidden="true" /> Contact us <ArrowUpRight size={13} aria-hidden="true" /></a>
          </nav>
        </aside>
        <article className="min-w-0 max-w-3xl space-y-10">
          {sections.map(section => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
              <h2 id={`${section.id}-title`} className="mb-4 text-xl font-medium tracking-tight">{section.title}</h2>
              <div className="space-y-4 text-[15px] leading-7 text-[#aaa] [&_a]:break-words [&_a]:text-[#b9d4e9] [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-white">{section.content}</div>
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
