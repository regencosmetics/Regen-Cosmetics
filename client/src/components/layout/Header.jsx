import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Search, Heart, ShoppingBag, User } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { NAV_LINKS } from "@/constants";
import { selectCartCount, openDrawer } from "@/store/cartSlice";
import { openAuth } from "@/store/uiSlice";
import { useAuth } from "@/hooks";
import SearchOverlay from "./SearchOverlay.jsx";

const iconBtn =
  "relative flex h-6 w-6 items-center justify-center text-white transition-transform hover:scale-110 hover:text-sky-400 active:scale-95 md:h-7 md:w-7";
const ico = "h-[15px] w-[15px] md:h-[19px] md:w-[19px]";

export default function Header() {
  const dispatch = useDispatch();
  const nav = useNavigate();
  const reduce = useReducedMotion();
  const count = useSelector(selectCartCount);
  const wish = useSelector((s) => s.wishlist.ids.length);
  const { isAuthed, isAdmin } = useAuth();
  const [search, setSearch] = useState(false);
  const profile = () =>
    isAdmin
      ? nav("/admin")
      : isAuthed
        ? nav("/account")
        : dispatch(openAuth({ mode: "login" }));
  const wishlist = () => (isAuthed ? nav("/wishlist") : nav("/wishlist"));
  return (
    <motion.header
      initial={reduce ? false : { y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="sticky top-0 z-50 bg-navy-header"
    >
      <div className="mx-auto flex h-[52px] max-w-[1214px] items-center justify-between px-5 md:h-[70px] md:px-6 xl:px-0">
        <Link to="/" aria-label="REGEN Cosmetics home" className="shrink-0">
          <img
            src="/assets/logo.png"
            alt="REGEN Cosmetics"
            width="175"
            height="84"
            className="h-[28px] w-auto md:h-[46px]"
          />
        </Link>
        <nav
          aria-label="Main"
          className="hidden items-center gap-[36px] md:flex md:pl-[40px]"
        >
          {NAV_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                `group relative font-sans text-[14px] font-medium text-white transition hover:text-sky-400 ${isActive ? "text-white" : ""}`
              }
            >
              {({ isActive }) => (
                <>
                  {l.label}
                  <span
                    className={`absolute -bottom-1 left-0 h-[2px] bg-sky-400 transition-all duration-300 ${isActive ? "w-full" : "w-0 group-hover:w-full"}`}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-1 md:gap-2">
          <button
            type="button"
            className={iconBtn}
            aria-label="Search"
            onClick={() => setSearch(true)}
          >
            <Search strokeWidth={1.6} className={ico} />
          </button>
          <button
            type="button"
            className={iconBtn}
            aria-label={`Wishlist${wish ? ` (${wish})` : ""}`}
            onClick={wishlist}
          >
            <Heart strokeWidth={1.6} className={ico} />
            {wish > 0 && (
              <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-sky-400" />
            )}
          </button>
          <button
            type="button"
            className={iconBtn}
            aria-label={`Shopping bag, ${count} item${count === 1 ? "" : "s"}`}
            onClick={() => dispatch(openDrawer())}
          >
            <ShoppingBag strokeWidth={1.6} className={ico} />
            {count > 0 && (
              <motion.span
                key={count}
                initial={{ scale: 0.4 }}
                animate={{ scale: 1 }}
                className="absolute -right-0.5 top-0 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-sky-500 px-0.5 text-[9px] font-bold"
              >
                {count}
              </motion.span>
            )}
          </button>
          <button
            type="button"
            className={iconBtn}
            aria-label={
              isAdmin ? "Admin dashboard" : isAuthed ? "My account" : "Log in"
            }
            onClick={profile}
          >
            <User strokeWidth={1.6} className={ico} />
          </button>
        </div>
      </div>
      <SearchOverlay open={search} onClose={() => setSearch(false)} />
    </motion.header>
  );
}
