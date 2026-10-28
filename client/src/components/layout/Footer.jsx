import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import NewsletterForm from "@/components/forms/NewsletterForm.jsx";
import { useCms } from "@/hooks";

const Facebook = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M12 2a10 10 0 0 0-1.6 19.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 12 2z" />
  </svg>
);

const Instagram = (p) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
    {...p}
  >
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
  </svg>
);

const Col = ({ title, links }) => (
  <nav aria-label={title} className="min-w-0">
    <h2 className="font-ps text-[12px] font-bold uppercase tracking-[0.12em] text-white sm:text-[13px] md:text-[16px]">
      {title}
    </h2>

    <ul className="mt-3 space-y-2 sm:mt-4 sm:space-y-2.5 md:mt-5">
      {links.map((l) => (
        <li key={l.label}>
          <Link
            to={l.to}
            className="inline-block break-words font-ps text-[11px] leading-relaxed text-white/80 transition-colors duration-200 hover:text-white hover:underline sm:text-xs md:text-sm"
          >
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
);

export default function Footer() {
  const { data: f } = useCms("footer");
  const { data: social } = useCms("social");
  const { data: contact } = useCms("contact");

  const mail = social?.email || contact?.email;

  const icon =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-white transition-all duration-200 hover:border-white hover:bg-white/10 hover:text-sky-300 active:scale-95 sm:h-11 sm:w-11 md:h-10 md:w-10";

  return (
    <footer
      className="overflow-hidden bg-brand-foot text-white"
      aria-label="Site footer"
    >
      <div className="mx-auto max-w-[1214px] px-5 py-8 sm:px-6 sm:py-10 md:py-12 xl:px-0">
        {/* Main footer content */}
        <div className="grid grid-cols-1 gap-8 sm:gap-10 md:grid-cols-[0.85fr_1.4fr] md:gap-x-10 lg:grid-cols-[0.9fr_1.4fr_1.1fr] lg:gap-x-12">
          {/* Brand and social links */}
          <div className="flex flex-col items-start">
            <Link
              to="/"
              aria-label="REGEN Cosmetics home"
              className="inline-flex rounded-sm"
            >
              <img
                src="/assets/logo.png"
                alt="REGEN Cosmetics"
                width="175"
                height="84"
                className="h-12 w-auto object-contain sm:h-14 md:h-16 lg:h-[76px]"
              />
            </Link>

            <p className="mt-4 max-w-[300px] font-ps text-xs leading-6 text-white/70 sm:text-sm">
              {f?.newsletterText ||
                "Discover skincare essentials and simple routines for healthier-looking skin."}
            </p>

            <div className="mt-6">
              <FollowUs mail={mail} social={social} icon={icon} />
            </div>
          </div>

          {/* Navigation links */}
          <div className="grid grid-cols-3 gap-x-4 gap-y-6 border-t border-white/15 pt-6 sm:gap-x-6 md:border-t-0 md:pt-1">
            <Col title="SHOP" links={f?.shopLinks || []} />
            <Col title="ABOUT" links={f?.aboutLinks || []} />
            <Col title="LEGAL" links={f?.legalLinks || []} />
          </div>

          {/* Newsletter */}
          <div className="border-t border-white/15 pt-6 md:col-span-2 lg:col-span-1 lg:border-t-0 lg:pt-1">
            <h2 className="font-ps text-base font-bold leading-snug sm:text-lg">
              Stay in the loop
            </h2>

            <p className="mt-2 max-w-sm font-ps text-xs leading-6 text-white/70 sm:text-sm">
              {f?.newsletterText ||
                "Get the latest skincare tips and product updates."}
            </p>

            <div className="mt-5 w-full max-w-md lg:mt-6">
              <NewsletterForm />
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t border-white/15 pt-5 sm:mt-10 sm:pt-6">
          <p className="text-center font-ps text-[10px] leading-5 text-white/65 sm:text-xs md:text-left">
            {f?.copyright ||
              `© ${new Date().getFullYear()} REGEN COSMETICS. All Rights Reserved.`}
          </p>
        </div>
      </div>
    </footer>
  );
}

function FollowUs({ mail, social, icon }) {
  return (
    <div>
      <h2 className="font-ps text-xs font-bold uppercase tracking-[0.12em] text-white sm:text-sm">
        Follow us
      </h2>

      <div className="mt-3 flex items-center gap-3">
        <a
          href={social?.facebook || "#"}
          target={social?.facebook ? "_blank" : undefined}
          rel="noopener noreferrer"
          aria-label="Facebook"
          className={icon}
        >
          <Facebook className="h-[18px] w-[18px]" />
        </a>

        <a
          href={social?.instagram || "#"}
          target={social?.instagram ? "_blank" : undefined}
          rel="noopener noreferrer"
          aria-label="Instagram"
          className={icon}
        >
          <Instagram className="h-[18px] w-[18px]" />
        </a>

        <a
          href={mail ? `mailto:${mail}` : "/contact"}
          aria-label="Email us"
          className={icon}
        >
          <Mail size={18} strokeWidth={1.8} />
        </a>
      </div>
    </div>
  );
}
