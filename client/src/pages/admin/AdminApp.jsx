import { lazy, Suspense, useState, useEffect, useCallback } from "react";
import {
  NavLink,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Package,
  Tags,
  Layers,
  Boxes,
  ShoppingBag,
  Undo2,
  Wallet,
  Users,
  Ticket,
  FileText,
  Image,
  Star,
  MessageSquare,
  Send,
  Settings as SettingsIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { logout } from "@/store/authSlice";
import { PageLoader } from "@/components/common/Feedback.jsx";
import Seo from "@/components/common/Seo.jsx";
import { adminApi } from "@/services";

const P = (f) => lazy(f);

const Dashboard = P(() => import("./Dashboard.jsx"));
const Products = P(() => import("./Products.jsx"));
const ProductForm = P(() => import("./ProductForm.jsx"));
const Taxonomy = P(() => import("./Taxonomy.jsx"));
const Orders = P(() => import("./Orders.jsx"));
const OrderDetail = P(() => import("./OrderDetail.jsx"));
const Returns = P(() => import("./Returns.jsx"));
const ReturnDetail = P(() => import("./ReturnDetail.jsx"));
const Refunds = P(() => import("./Refunds.jsx"));
const Inventory = P(() => import("./Inventory.jsx"));
const Customers = P(() => import("./Customers.jsx"));
const Simple = P(() => import("./Simple.jsx"));
const Content = P(() => import("./Content.jsx"));
const Settings = P(() => import("./Settings.jsx"));

const TRACKED_SECTIONS = [
  "orders",
  "returns",
  "refunds",
  "customers",
  "reviews",
  "messages",
  "newsletter",
];

const NAV = [
  ["Overview", [["", "Dashboard", LayoutDashboard]]],
  [
    "Catalogue",
    [
      ["products", "Products", Package],
      ["categories", "Categories", Tags],
      ["collections", "Collections", Layers],
      ["inventory", "Inventory", Boxes],
    ],
  ],
  [
    "Sales",
    [
      ["orders", "Orders", ShoppingBag],
      ["returns", "Returns", Undo2],
      ["refunds", "Refunds", Wallet],
      ["customers", "Customers", Users],
      ["coupons", "Coupons", Ticket],
    ],
  ],
  [
    "Website",
    [
      ["content", "Website Content", FileText],
      ["banners", "Banners", Image],
      ["reviews", "Reviews", Star],
      ["messages", "Messages", MessageSquare],
      ["newsletter", "Newsletter", Send],
    ],
  ],
  ["Configure", [["settings", "Settings", SettingsIcon]]],
];

const EMPTY_COUNTS = {
  orders: 0,
  returns: 0,
  refunds: 0,
  customers: 0,
  reviews: 0,
  messages: 0,
  newsletter: 0,
};

export default function AdminApp() {
  const [open, setOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState(EMPTY_COUNTS);

  const dispatch = useDispatch();
  const loc = useLocation();

  const fetchUnreadCounts = useCallback(async () => {
    try {
      const response = await adminApi.get("unread-counts");

      setUnreadCounts({
        orders: Number(response.orders) || 0,
        returns: Number(response.returns) || 0,
        refunds: Number(response.refunds) || 0,
        customers: Number(response.customers) || 0,
        reviews: Number(response.reviews) || 0,
        messages: Number(response.messages) || 0,
        newsletter: Number(response.newsletter) || 0,
      });
    } catch (error) {
      console.error("Failed to fetch admin unread counts:", error);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCounts();

    const interval = setInterval(fetchUnreadCounts, 15000);

    return () => clearInterval(interval);
  }, [fetchUnreadCounts]);

  useEffect(() => {
    const activeKey = loc.pathname.split("/")[2] || "";

    if (!TRACKED_SECTIONS.includes(activeKey)) {
      return undefined;
    }

    let cancelled = false;

    const markAsRead = async () => {
      try {
        await adminApi.post("read-state/" + activeKey, {});

        if (!cancelled) {
          await fetchUnreadCounts();
        }
      } catch (error) {
        console.error("Failed to mark admin section as read:", error);
      }
    };

    markAsRead();

    return () => {
      cancelled = true;
    };
  }, [loc.pathname, fetchUnreadCounts]);

  const links = (
    <div className="space-y-5">
      {NAV.map(([group, items]) => (
        <div key={group}>
          <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
            {group}
          </p>

          <ul className="space-y-0.5">
            {items.map(([to, label, Icon]) => {
              const count = unreadCounts[to] || 0;

              return (
                <li key={to}>
                  <NavLink
                    to={to ? "/admin/" + to : "/admin"}
                    end={to === ""}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      "group relative flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition-colors " +
                      (isActive
                        ? "bg-brand text-white shadow-sm"
                        : "text-neutral-700 hover:bg-sky-100 hover:text-navy")
                    }
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                      <span className="truncate">{label}</span>
                    </div>

                    {count > 0 && (
                      <span
                        aria-label={count + " unread " + label.toLowerCase()}
                        className="ml-2 flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-sm"
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3f5fa]">
      <Seo title="Admin" noindex />

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between bg-navy-header px-4 text-white shadow">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>

          <Link
            to="/admin"
            className="font-display text-lg font-semibold tracking-wide"
          >
            REGEN{" "}
            <span className="font-sans text-xs font-medium text-sky-200">
              Admin
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <Link to="/" className="rounded px-2 py-1 hover:bg-white/10">
            View store
          </Link>

          <button
            className="flex items-center gap-1 rounded px-2 py-1 hover:bg-white/10"
            onClick={() => {
              dispatch(logout()).then(() => {
                window.location.href = "/";
              });
            }}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[220px_1fr]">
        <nav
          aria-label="Admin"
          className={
            (open ? "block" : "hidden") +
            " max-h-[calc(100vh-3.5rem)] overflow-y-auto border-r bg-white p-3 lg:sticky lg:top-14 lg:block lg:h-[calc(100vh-3.5rem)]"
          }
        >
          {links}
        </nav>

        <main className="min-w-0 p-3 sm:p-6">
          <Suspense fallback={<PageLoader />}>
            <motion.div
              key={loc.pathname.split("/").slice(0, 3).join("/")}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Routes>
                <Route index element={<Dashboard />} />

                <Route path="products" element={<Products />} />
                <Route path="products/new" element={<ProductForm />} />
                <Route path="products/:id" element={<ProductForm />} />

                <Route
                  path="categories"
                  element={<Taxonomy kind="categories" label="Category" />}
                />

                <Route
                  path="collections"
                  element={<Taxonomy kind="collections" label="Collection" />}
                />

                <Route path="inventory" element={<Inventory />} />

                <Route path="orders" element={<Orders />} />
                <Route path="orders/:id" element={<OrderDetail />} />

                <Route path="returns" element={<Returns />} />
                <Route path="returns/:id" element={<ReturnDetail />} />

                <Route path="refunds" element={<Refunds />} />
                <Route path="customers" element={<Customers />} />

                {[
                  "coupons",
                  "banners",
                  "reviews",
                  "messages",
                  "newsletter",
                ].map((kind) => (
                  <Route
                    key={kind}
                    path={kind}
                    element={<Simple kind={kind} />}
                  />
                ))}

                <Route path="content" element={<Content />} />
                <Route path="settings" element={<Settings />} />

                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </motion.div>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
