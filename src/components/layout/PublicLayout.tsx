import { useEffect } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/auth-context";
import { GOOGLE_LOGIN_URL } from "../../api/config";
import { openOAuthPopup } from "../../utils/openOAuthPopup";
import driveIcon from "../../assets/icon/joindrive-logo.png";

export default function PublicLayout() {
  const { user } = useAuth();
  const { pathname, hash } = useLocation();

  useEffect(() => {
    document.title = pathname === "/privacy-policy"
      ? "Privacy Policy | JoinDrive"
      : pathname === "/terms-of-service"
        ? "Terms of Service | JoinDrive"
        : "JoinDrive | All your Google Drives, in one place";

    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }

    return () => { document.title = "JoinDrive"; };
  }, [pathname, hash]);

  return (
    <div className="public-page flex min-h-dvh flex-col bg-[#191919] text-[#f5f5f5]">
      <a href="#main-content" className="sr-only z-50 rounded bg-white p-3 text-black focus:not-sr-only focus:absolute focus:left-4 focus:top-4">
        Skip to content
      </a>
      <header className="border-b border-white/[0.08]">
        <div className="mx-auto flex min-h-20 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/" aria-label="JoinDrive home" className="flex shrink-0 items-center gap-2.5 text-xl font-semibold tracking-tight">
            <img src={driveIcon} alt="" className="h-8 w-8 object-contain" />
            JoinDrive
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-6 text-sm sm:gap-8">
            <a href="/#how-it-works" className="hidden text-[#aaa] transition hover:text-white sm:block">How it works</a>
            <Link to="/privacy-policy" className="hidden text-[#aaa] transition hover:text-white md:block">Your privacy</Link>
            {user ? (
              <Link to="/explorer" className="flex min-h-10 items-center gap-2 rounded-lg border border-white/15 px-4 transition hover:bg-white/5">
                Open explorer <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            ) : (
              <button onClick={() => openOAuthPopup(GOOGLE_LOGIN_URL)} className="flex min-h-10 items-center gap-2 rounded-lg border border-white/15 px-4 transition hover:bg-white/5">
                Sign in <ArrowRight size={15} aria-hidden="true" />
              </button>
            )}
          </nav>
        </div>
      </header>
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="border-t border-white/[0.08]">
        <div className="mx-auto max-w-6xl px-5 py-9 sm:px-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <Link to="/" className="text-base font-semibold tracking-tight">JoinDrive</Link>
              <p className="mt-1.5 text-sm text-[#999]">More accounts. One place for your files.</p>
            </div>
            <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#bbb]">
              <Link to="/" className="transition hover:text-white">Home</Link>
              <Link to="/privacy-policy" className="transition hover:text-white">Privacy Policy</Link>
              <Link to="/terms-of-service" className="transition hover:text-white">Terms of Service</Link>
              <a href="mailto:shifatsrm09@gmail.com" className="transition hover:text-white">Contact</a>
            </nav>
          </div>
          <div className="mt-8 flex flex-col justify-between gap-2 border-t border-white/[0.06] pt-5 text-xs leading-relaxed text-[#888] sm:flex-row">
            <p>© {new Date().getFullYear()} JoinDrive</p>
            <p>An independent app. Not affiliated with or endorsed by Google.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
