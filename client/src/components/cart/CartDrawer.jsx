import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  X,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Gift,
  Plus,
  Minus,
  Receipt,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import toast from "react-hot-toast";
import Modal from "@/components/common/Modal.jsx";
import OffersList, { useOffers } from "./OffersList.jsx";
import {
  closeDrawer,
  setQuantity,
  removeLine,
  applyCoupon,
  removeCoupon,
} from "@/store/cartSlice";
import { openAuth } from "@/store/uiSlice";
import { useFetch } from "@/hooks";
import { catalogApi } from "@/services";
import { useCartActions, defaultVariant } from "@/hooks/useCartActions";
import { inr, effectivePrice, productImage } from "@/utils/format";

const TIMER_KEY = "regen_cart_timer_v1";
const WINDOW = 10 * 60 * 1000;

function useCountdown(active) {
  const [left, setLeft] = useState(WINDOW);

  useEffect(() => {
    if (!active) return undefined;

    const read = () => {
      try {
        const saved = Number(sessionStorage.getItem(TIMER_KEY));
        if (saved > Date.now()) return saved;
      } catch {
        /* Storage may be unavailable */
      }

      const end = Date.now() + WINDOW;
      try {
        sessionStorage.setItem(TIMER_KEY, String(end));
      } catch {
        /* Storage may be unavailable */
      }
      return end;
    };

    let end = read();

    const tick = () => {
      if (end <= Date.now()) {
        try {
          sessionStorage.removeItem(TIMER_KEY);
        } catch {
          /* Ignore storage errors */
        }
        end = read();
      }

      setLeft(Math.max(0, end - Date.now()));
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [active]);

  return {
    m: Math.floor(left / 60000),
    s: Math.floor((left % 60000) / 1000),
  };
}

function Recommended({ inCart, reduceMotion }) {
  const { data } = useFetch(
    () => catalogApi.products({ limit: 8, sort: "rating" }),
    [],
  );
  const { add } = useCartActions();

  const products = (data?.items || [])
    .filter((product) => !inCart.has(String(product._id)))
    .slice(0, 6);

  if (!products.length) return null;

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden rounded-lg border border-neutral-200 bg-white"
      aria-label="Recommended products"
    >
      <h3 className="border-b border-neutral-200 px-3 py-2.5 text-sm font-semibold">
        You may also like
      </h3>

      <ul className="no-scrollbar flex gap-2.5 overflow-x-auto p-2.5">
        {products.map((product) => {
          const variant = defaultVariant(product);
          const price = variant ? effectivePrice(variant) : 0;
          const discount =
            variant?.price > 0
              ? Math.round(((variant.price - price) / variant.price) * 100)
              : 0;

          return (
            <motion.li
              key={product._id}
              whileHover={reduceMotion ? undefined : { y: -2 }}
              className="flex w-[185px] shrink-0 gap-2 rounded-md border border-neutral-200 p-2"
            >
              <div className="relative w-[60px] shrink-0">
                <img
                  src={productImage(product)}
                  alt={product.name}
                  loading="lazy"
                  className="h-[72px] w-full rounded object-cover"
                />
                {discount > 0 && (
                  <span className="absolute inset-x-0 bottom-0 bg-brand px-1 py-0.5 text-center text-[9px] font-semibold text-white">
                    {discount}% off
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col items-start">
                <p className="line-clamp-2 text-[11px] text-neutral-600">
                  {product.name}
                </p>
                <p className="mt-1 text-xs font-semibold">{inr(price)}</p>
                <button
                  type="button"
                  onClick={() => add(product, variant)}
                  className="mt-auto rounded border border-neutral-300 px-2.5 py-1 text-[10px] font-medium transition-colors hover:border-brand hover:bg-brand hover:text-white"
                >
                  Add +
                </button>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </motion.section>
  );
}

export default function CartDrawer() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const { drawerOpen, lines, pricing, coupon, couponError, issues } =
    useSelector((state) => state.cart);

  const user = useSelector((state) => state.auth.user);

  const [couponOpen, setCouponOpen] = useState(true);
  const [code, setCode] = useState("");
  const [panel, setPanel] = useState(false);
  const [terms, setTerms] = useState(true);

  const { data: offers } = useOffers();
  const { m, s } = useCountdown(drawerOpen && lines.length > 0);

  const close = () => {
    dispatch(closeDrawer());
    setPanel(false);
  };

  const changeQuantity = async (line, quantity) => {
    const result = await dispatch(
      setQuantity({
        productId: String(line.product),
        sku: line.sku,
        quantity,
      }),
    );

    if (setQuantity.rejected.match(result)) {
      toast.error(result.payload);
    }
  };

  const apply = async (event) => {
    event.preventDefault();
    if (!code.trim()) return;

    const result = await dispatch(applyCoupon(code.trim()));

    if (applyCoupon.rejected.match(result)) {
      toast.error(result.payload);
    } else {
      toast.success("Coupon applied");
      setCode("");
    }
  };

  const blocked = lines.some(
    (line) => !line.inStock || line.requestedQuantity > line.quantity,
  );

  const checkout = () => {
    close();

    if (user) {
      navigate("/checkout");
    } else {
      dispatch(openAuth({ mode: "login", redirectTo: "/checkout" }));
    }
  };

  const payable = pricing
    ? Math.max(0, pricing.subtotal - (pricing.discount || 0))
    : 0;

  const discountPercent =
    pricing?.mrpTotal > 0
      ? Math.round(((pricing.mrpTotal - payable) / pricing.mrpTotal) * 100)
      : 0;

  const itemCount = lines.reduce((total, line) => total + line.quantity, 0);
  const pad = (number) => String(number).padStart(2, "0");

  const fadeUp = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -5 },
      };

  return (
    <Modal
      open={drawerOpen}
      onClose={close}
      variant="drawer"
      title="Shopping cart"
      hideClose
      className="!max-w-[540px]"
    >
      <div className="relative flex h-full flex-col overflow-hidden bg-neutral-50 text-neutral-900">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Your cart</h2>
            <p className="mt-0.5 text-[11px] text-neutral-500">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="Close cart"
            className="rounded-full p-2 transition-colors hover:bg-neutral-100"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Compact countdown and promotional banner */}
        {lines.length > 0 && (
          <div className="border-b border-neutral-200 bg-white px-4 pb-3">
            <div className="flex items-center justify-center gap-2 py-2 text-[11px] text-neutral-600">
              <span>Shopping session</span>
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-semibold tabular-nums text-neutral-900">
                {m}:{pad(s)}
              </span>
            </div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-md bg-brand px-3 py-2 text-center text-xs font-medium text-white"
            >
              90% of people saw noticeable results.
            </motion.div>
          </div>
        )}

        {lines.length === 0 ? (
          <motion.div
            {...fadeUp}
            className="flex flex-1 flex-col items-center justify-center px-5 py-12"
          >
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
              <Receipt className="h-6 w-6 text-neutral-400" />
            </div>

            <p className="text-base font-semibold">Your cart is empty</p>
            <p className="mt-1 text-xs text-neutral-500">
              Discover something you'll love.
            </p>

            <Link
              to="/shop"
              onClick={close}
              className="mt-4 inline-flex items-center rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Explore products
            </Link>
          </motion.div>
        ) : (
          <>
            {/* Scrollable content */}
            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              <AnimatePresence initial={false}>
                {issues.length > 0 && (
                  <motion.ul
                    {...fadeUp}
                    role="alert"
                    className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900"
                  >
                    {issues.map((issue) => (
                      <li key={`${issue.sku}-${issue.code}`}>
                        {issue.message}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>

              {/* Cart items */}
              <section aria-label="Cart items" className="space-y-2.5">
                <AnimatePresence initial={false}>
                  {lines.map((line) => (
                    <motion.article
                      key={line.sku}
                      layout={!reduceMotion}
                      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, x: 25 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="flex gap-3 rounded-lg border border-neutral-200 bg-white p-2.5 shadow-sm"
                    >
                      <Link
                        to={`/products/${line.slug}`}
                        onClick={close}
                        className="h-[82px] w-[70px] shrink-0 overflow-hidden rounded-md bg-neutral-100"
                      >
                        <motion.img
                          whileHover={
                            reduceMotion ? undefined : { scale: 1.04 }
                          }
                          transition={{ duration: 0.2 }}
                          src={line.image || "/assets/logo.png"}
                          alt={line.name}
                          className="h-full w-full object-cover"
                        />
                      </Link>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            to={`/products/${line.slug}`}
                            onClick={close}
                            className="line-clamp-2 text-xs font-medium leading-5 text-neutral-800 hover:text-brand"
                          >
                            {line.name}
                          </Link>

                          <button
                            type="button"
                            aria-label={`Remove ${line.name}`}
                            onClick={() =>
                              dispatch(
                                removeLine({
                                  productId: String(line.product),
                                  sku: line.sku,
                                }),
                              )
                            }
                            className="shrink-0 rounded p-1 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <span className="mt-1 max-w-full self-start truncate rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] text-neutral-600">
                          {line.variantLabel}
                        </span>

                        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">
                              {inr(line.unitPrice)}
                            </p>

                            {line.mrp > line.unitPrice && (
                              <p className="text-[10px] text-neutral-500">
                                <s>{inr(line.mrp)}</s>
                                <span className="ml-1 font-medium text-deal">
                                  {Math.round(
                                    ((line.mrp - line.unitPrice) / line.mrp) *
                                      100,
                                  )}
                                  % off
                                </span>
                              </p>
                            )}
                          </div>

                          <div
                            className="inline-flex h-7 shrink-0 items-center rounded-md border border-neutral-200 bg-white"
                            role="group"
                            aria-label={`Quantity for ${line.name}`}
                          >
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              disabled={line.quantity <= 1}
                              onClick={() =>
                                changeQuantity(line, line.quantity - 1)
                              }
                              className="flex h-full w-7 items-center justify-center transition-colors hover:bg-neutral-100 disabled:opacity-40"
                            >
                              <Minus className="h-3 w-3" />
                            </button>

                            <span
                              className="min-w-6 text-center text-xs tabular-nums"
                              aria-live="polite"
                            >
                              {line.quantity}
                            </span>

                            <button
                              type="button"
                              aria-label="Increase quantity"
                              disabled={
                                !line.inStock ||
                                line.quantity >= Math.min(20, line.stock || 20)
                              }
                              onClick={() =>
                                changeQuantity(line, line.quantity + 1)
                              }
                              className="flex h-full w-7 items-center justify-center transition-colors hover:bg-neutral-100 disabled:opacity-40"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {!line.inStock && (
                          <p className="mt-1 text-[10px] font-medium text-red-600">
                            Out of stock — remove to continue.
                          </p>
                        )}
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </section>

              {/* Coupons and offers */}
              <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                <button
                  type="button"
                  onClick={() => setCouponOpen((open) => !open)}
                  aria-expanded={couponOpen}
                  className="flex w-full items-center justify-between px-3 py-3 text-left text-xs font-semibold"
                >
                  <span>Coupons & discounts</span>
                  {couponOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                <AnimatePresence initial={false}>
                  {couponOpen && (
                    <motion.div
                      initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {coupon ? (
                        <div className="mx-3 mb-3 flex items-center justify-between gap-2 rounded-md border border-green-200 bg-green-50 px-2.5 py-2">
                          <div className="min-w-0 text-xs">
                            <span className="font-semibold">{coupon.code}</span>
                            <span className="ml-1 text-green-700">applied</span>
                            {pricing?.discount > 0 && (
                              <p className="mt-0.5 font-semibold text-green-700">
                                You saved {inr(pricing.discount)}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            className="shrink-0 text-xs font-semibold text-red-600 hover:underline"
                            onClick={() => dispatch(removeCoupon())}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={apply} className="flex gap-2 px-3 pb-3">
                          <label htmlFor="drawer-coupon" className="sr-only">
                            Coupon code
                          </label>

                          <input
                            id="drawer-coupon"
                            value={code}
                            onChange={(event) =>
                              setCode(event.target.value.toUpperCase())
                            }
                            placeholder="Enter coupon code"
                            autoComplete="off"
                            className="h-9 min-w-0 flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 text-xs uppercase outline-none transition focus:border-brand"
                          />

                          <motion.button
                            whileTap={
                              reduceMotion ? undefined : { scale: 0.97 }
                            }
                            type="submit"
                            className="h-9 rounded-md bg-brand px-4 text-xs font-semibold text-white transition hover:opacity-90"
                          >
                            Apply
                          </motion.button>
                        </form>
                      )}

                      {couponError && !coupon && (
                        <p
                          role="alert"
                          className="px-3 pb-3 text-xs text-red-600"
                        >
                          {couponError.message}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={() => setPanel(true)}
                  className="flex w-full items-center gap-2.5 border-t border-neutral-200 px-3 py-2.5 text-left transition-colors hover:bg-neutral-50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-100">
                    <Gift className="h-4 w-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold">
                      View all offers
                    </span>
                    <span className="mt-0.5 block text-[10px] text-neutral-500">
                      Available payment offers
                    </span>
                  </span>

                  {offers?.length > 0 && (
                    <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">
                      {offers.length}
                    </span>
                  )}

                  <ChevronRight className="h-4 w-4 text-neutral-400" />
                </button>
              </section>

              <Recommended
                inCart={new Set(lines.map((line) => String(line.product)))}
                reduceMotion={reduceMotion}
              />
            </div>

            {/* Compact checkout footer */}
            <footer className="relative z-10 shrink-0 border-t border-neutral-200 bg-white px-4 pb-3 pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.05)]">
              <AnimatePresence>
                {pricing?.savings > 0 && (
                  <motion.div
                    key={pricing.savings}
                    initial={reduceMotion ? false : { opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="mb-2 rounded-md bg-emerald-50 px-2.5 py-1.5 text-center text-[11px] font-semibold text-emerald-700"
                  >
                    You're saving {inr(pricing.savings)} on this order!
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] text-neutral-500">
                    Estimated total
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-lg font-bold leading-tight">
                      {inr(payable)}
                    </span>

                    {pricing?.mrpTotal > payable && (
                      <s className="text-[11px] text-neutral-400">
                        {inr(pricing.mrpTotal)}
                      </s>
                    )}
                  </div>
                </div>

                {discountPercent > 0 && (
                  <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                    {discountPercent}% savings
                  </span>
                )}
              </div>

              <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-[11px] text-neutral-600">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(event) => setTerms(event.target.checked)}
                  className="h-3.5 w-3.5 accent-brand"
                />

                <span>
                  I agree to the{" "}
                  <Link
                    to="/terms"
                    onClick={close}
                    className="font-medium text-blue-600 underline"
                  >
                    Terms & Conditions
                  </Link>
                </span>
              </label>

              <motion.button
                whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                type="button"
                onClick={checkout}
                disabled={blocked || !terms}
                className="mt-2.5 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue to checkout
                <ChevronRight className="h-4 w-4" />
              </motion.button>

              <p className="mt-1.5 text-center text-[10px] text-neutral-500">
                Secure checkout · Payment protection
              </p>
            </footer>
          </>
        )}

        {/* Animated offers panel */}
        <AnimatePresence>
          {panel && (
            <motion.div
              key="offers-panel"
              initial={reduceMotion ? false : { x: "100%" }}
              animate={{ x: 0 }}
              exit={reduceMotion ? undefined : { x: "100%" }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: "tween", duration: 0.22 }
              }
              className="absolute inset-0 z-20 flex flex-col bg-neutral-50"
            >
              <header className="flex items-center gap-2 border-b border-neutral-200 bg-white px-3 py-3">
                <button
                  type="button"
                  aria-label="Back to cart"
                  onClick={() => setPanel(false)}
                  className="rounded-full p-2 transition-colors hover:bg-neutral-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <h3 className="text-sm font-semibold">Offers & coupons</h3>
              </header>

              <div className="flex-1 overflow-y-auto p-3">
                <OffersList offers={offers} onApplied={() => setPanel(false)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}
