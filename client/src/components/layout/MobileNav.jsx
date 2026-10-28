import { NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setMobileNav } from "@/store/uiSlice";
import { NAV_LINKS } from "@/constants";
import { useAuth } from "@/hooks";

export default function MobileNav() {
  const open = useSelector((s) => s.ui.mobileNav);
  const dispatch = useDispatch();
  const { isAuthed, isAdmin } = useAuth();

  if (!open) return null;

  const close = () => dispatch(setMobileNav(false));

  const links = [
    ...NAV_LINKS,
    ...(isAuthed
      ? [
          { label: "My Orders", to: "/account/orders" },
          { label: "Wishlist", to: "/wishlist" },
        ]
      : []),
    ...(isAdmin ? [{ label: "Admin Dashboard", to: "/admin" }] : []),
  ];

  return (
    <nav
      aria-label="Mobile"
      className="border-t border-white/10 bg-navy md:hidden"
    >
      <ul className="container space-y-1 py-3">
        {links.map((l) => (
          <li key={l.to}>
            <NavLink
              to={l.to}
              end={l.to === "/"}
              onClick={close}
              className={({ isActive }) =>
                `flex min-h-[82px] items-center rounded-lg px-4 py-3 text-base font-semibold transition-colors duration-200 ${
                  isActive
                    ? "bg-white/10 text-sky-400"
                    : "text-white hover:bg-white/5"
                }`
              }
            >
              {l.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
