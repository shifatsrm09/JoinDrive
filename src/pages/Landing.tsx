import { ArrowRight, Check, ChevronRight, Clock3, FileText, Folder, FolderUp, HardDrive, Image, LayoutGrid, Plus, Search, ShieldCheck, Star } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import { GOOGLE_LOGIN_URL } from "../api/config";
import { openOAuthPopup } from "../utils/openOAuthPopup";

const ERROR_MESSAGES: Record<string, string> = {
  secondary_account: "This Google account is connected as an extra Drive. Please sign in with the account you originally used for JoinDrive.",
  session_expired: "Your session expired. Please sign in again.",
  login_failed: "Sign in failed. Please try again.",
  missing_code: "Sign in was cancelled.",
  invalid_state: "The sign in request expired or was invalid. Please try again.",
};

const previewDrives = [
  { label: "Personal", color: "bg-[#639fe5]", width: "w-[38%]", size: "5.7 GB" },
  { label: "Work", color: "bg-[#b5a0df]", width: "w-[62%]", size: "9.3 GB" },
  { label: "Projects", color: "bg-[#89b6a1]", width: "w-[24%]", size: "3.6 GB" },
];

const previewFiles = [
  { name: "Brand assets", account: "Work", icon: Folder, color: "text-[#b5a0df]" },
  { name: "Project brief.docx", account: "Projects", icon: FileText, color: "text-[#7aabe5]" },
  { name: "Summer photos", account: "Personal", icon: Image, color: "text-[#89b6a1]" },
];

export default function Landing() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const errorKey = searchParams.get("error");
  const email = searchParams.get("email");

  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-16 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12 lg:pb-24 lg:pt-28">
        <div>
          <p className="mb-6 flex items-center gap-2.5 text-xs font-medium uppercase tracking-[0.18em] text-[#aebbc9]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#72a9d7]" />
            A simpler space for your files
          </p>
          <h1 className="max-w-xl text-[clamp(2.7rem,5.3vw,4.1rem)] font-semibold leading-[1.08] tracking-[-0.055em]">
            All your Google Drives.<br />
            <span className="text-[#929292]">One clear view.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-[#aaa] sm:text-lg sm:leading-8">
            Bring your personal, work, and project accounts together. Find the file you need and get on with your day.
          </p>
          {errorKey && (
            <div role="alert" className="mt-6 max-w-md break-words rounded-lg border border-red-400/25 bg-red-400/5 p-4 text-sm leading-6 text-red-200">
              {ERROR_MESSAGES[errorKey] || "Something went wrong. Please try signing in again."}
              {email && <span className="mt-1 block text-xs">{email}</span>}
            </div>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            {user && !errorKey ? (
              <Link to="/explorer" className="flex min-h-12 items-center justify-center gap-4 rounded-lg bg-[#0e639c] px-6 text-sm font-semibold transition hover:bg-[#1177bb]">
                Open your explorer <ArrowRight size={17} aria-hidden="true" />
              </Link>
            ) : (
              <button onClick={() => openOAuthPopup(GOOGLE_LOGIN_URL)} className="flex min-h-12 items-center justify-center gap-4 rounded-lg bg-[#0e639c] px-6 text-sm font-semibold transition hover:bg-[#1177bb]">
                Continue with Google <ArrowRight size={17} aria-hidden="true" />
              </button>
            )}
            <a href="#how-it-works" className="flex min-h-12 items-center gap-2 px-1 text-sm text-[#bbb] transition hover:text-white">
              Take a look around <ChevronRight size={15} aria-hidden="true" />
            </a>
          </div>
          <p className="mt-4 max-w-md text-xs leading-5 text-[#888]">
            By using JoinDrive, you agree to our <Link to="/terms-of-service" className="underline underline-offset-4 hover:text-white">Terms of Service</Link>. See how we handle your data in our <Link to="/privacy-policy" className="underline underline-offset-4 hover:text-white">Privacy Policy</Link>.
          </p>
        </div>
        <figure className="min-w-0">
          <div className="overflow-hidden rounded-xl border border-[#3b3b3b] bg-[#202020] shadow-[0_20px_70px_-30px_rgba(0,0,0,0.7)]">
            <div className="flex h-11 items-center justify-between border-b border-white/[0.07] bg-[#242424] px-4">
              <div className="flex gap-1.5" aria-hidden="true"><span className="h-2 w-2 rounded-full bg-[#535353]" /><span className="h-2 w-2 rounded-full bg-[#535353]" /><span className="h-2 w-2 rounded-full bg-[#535353]" /></div>
              <span className="text-[11px] text-[#999]">Your workspace, together</span>
              <LayoutGrid size={12} className="text-[#777]" aria-hidden="true" />
            </div>
            <div className="flex">
              <div aria-hidden="true" className="hidden w-12 shrink-0 flex-col items-center gap-6 border-r border-white/[0.06] pt-6 text-[#777] sm:flex">
                <HardDrive size={16} className="text-[#93b8d6]" /><Clock3 size={16} /><Star size={16} />
              </div>
              <div className="min-w-0 flex-1 px-4 pb-4 pt-5 sm:px-5 sm:pb-5">
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-sm font-medium">My Drives <span className="ml-1 text-xs text-[#888]">/ 03</span></span>
                  <span aria-hidden="true" className="flex items-center gap-1.5 rounded border border-white/15 px-2 py-1 text-[10px] text-[#bbb]"><Plus size={11} /> New</span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {previewDrives.map(drive => (
                    <div key={drive.label} className="min-w-0 rounded-lg border border-white/[0.08] bg-[#272727] px-2.5 py-3 sm:px-3">
                      <span className={`mb-3 flex h-6 w-6 items-center justify-center rounded-full ${drive.color} text-[#202020]`}><HardDrive size={12} aria-hidden="true" /></span>
                      <p className="truncate text-xs font-medium">{drive.label}</p>
                      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${drive.color} ${drive.width}`} /></div>
                      <p className="mt-2 text-[9px] text-[#999]">{drive.size} of 15 GB</p>
                    </div>
                  ))}
                </div>
                <div className="mb-1 mt-7 flex items-center justify-between text-[11px] text-[#999]"><span>Recent files</span><Search size={12} aria-hidden="true" /></div>
                {previewFiles.map(file => (
                  <div key={file.name} className="flex items-center gap-2.5 border-b border-white/[0.05] py-3.5 last:border-0">
                    <file.icon size={17} className={`shrink-0 ${file.color}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-[11px] sm:text-xs">{file.name}</span>
                    <span className="text-[10px] text-[#999]">{file.account}</span>
                  </div>
                ))}
                <div className="mt-3 flex items-center gap-2 rounded-md border border-[#89b6a1]/15 bg-[#89b6a1]/[0.04] px-3 py-2 text-[10px] text-[#afc7ba]">
                  <Check size={12} aria-hidden="true" /> Three accounts. No switching tabs.
                </div>
              </div>
            </div>
          </div>
          <figcaption className="mt-3 text-right text-[10px] tracking-wide text-[#888]">An illustrative preview of your connected workspace</figcaption>
        </figure>
      </section>
      <section id="features" aria-labelledby="features-title" className="border-y border-white/[0.07] bg-[#1d1d1d]">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
          <h2 id="features-title" className="mb-9 text-2xl font-medium tracking-tight sm:text-3xl">Everything you need. Right where you expect it.</h2>
          <div className="grid gap-9 sm:grid-cols-3 sm:gap-8">
            {[
              { icon: Search, title: "Find it across accounts", text: "Search connected Drives from one place. Keep recent files and favourites close at hand." },
              { icon: FolderUp, title: "Make room for your work", text: "Upload files or whole folders, download what you need, and organize without leaving the explorer." },
              { icon: HardDrive, title: "See the bigger picture", text: "View storage across your accounts and choose the right Drive for your next upload." },
            ].map(feature => (
              <div key={feature.title}>
                <feature.icon size={21} strokeWidth={1.5} className="mb-4 text-[#9db6cb]" aria-hidden="true" />
                <h3 className="text-base font-medium">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#aaa]">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section id="how-it-works" aria-labelledby="how-title" className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <p className="mb-4 text-xs uppercase tracking-[0.18em] text-[#8d9aaa]">A few steps. A clearer workspace.</p>
          <h2 id="how-title" className="text-3xl font-medium leading-tight tracking-tight sm:text-4xl">Less switching.<br /><span className="text-[#929292]">More getting things done.</span></h2>
          <Link to="/privacy-policy" className="mt-7 inline-flex items-center gap-2 text-sm text-[#a9c3d8] hover:text-white"><ShieldCheck size={17} aria-hidden="true" /> Read about your data and control <ArrowRight size={14} aria-hidden="true" /></Link>
        </div>
        <ol className="space-y-7">
          {[
            ["Sign in with Google", "Choose the Google account you want to use as your primary JoinDrive account."],
            ["Bring your other Drives", "Connect additional Google accounts and grant the permissions needed to manage their files."],
            ["Settle into one explorer", "Browse, search, share, and organize. Your files stay in their original Google Drive accounts."],
          ].map(([title, text], index) => (
            <li key={title} className="flex gap-5">
              <span className="pt-0.5 font-mono text-xs text-[#777]">0{index + 1}</span>
              <div><h3 className="text-base font-medium">{title}</h3><p className="mt-1.5 text-sm leading-6 text-[#aaa]">{text}</p></div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
