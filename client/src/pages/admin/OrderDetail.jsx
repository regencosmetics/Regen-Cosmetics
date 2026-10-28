import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { PageHead, Card, Async, Badge, DataTable } from "./ui.jsx";
import ConfirmDialog from "@/components/common/ConfirmDialog.jsx";
import { Timeline } from "@/components/common/Primitives.jsx";
import { useFetch } from "@/hooks";
import { adminApi } from "@/services";
import { errorMessage } from "@/services/api";
import { ORDER_STEPS } from "@/constants";
import { inr, dateTime, downloadBlob } from "@/utils/format";

export default function OrderDetail() {
  const { id } = useParams();
  const st = useFetch(() => adminApi.get(`orders/${id}`), [id]);

  const [pending, setPending] = useState(null);
  const [note, setNote] = useState("");
  const [trk, setTrk] = useState({
    carrier: "",
    trackingNumber: "",
    url: "",
  });

  const change = async () => {
    try {
      const body = {
        status: pending,
        note: note || undefined,
        ...(pending === "Shipped" && (trk.carrier || trk.trackingNumber)
          ? {
              tracking: Object.fromEntries(
                Object.entries(trk).filter(([, v]) => v),
              ),
            }
          : {}),
      };

      await adminApi.patch(`orders/${id}/status`, body);
      toast.success(`Order marked ${pending}`);
    } catch (e) {
      toast.error(errorMessage(e));
    }

    setPending(null);
    setNote("");
    st.reload();
  };

  const saveTracking = async () => {
    try {
      await adminApi.patch(
        `orders/${id}/tracking`,
        Object.fromEntries(Object.entries(trk).filter(([, v]) => v)),
      );

      toast.success("Tracking saved");
      st.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const file = async (kind) => {
    try {
      const r = await adminApi.blob(`orders/${id}/${kind}`);
      downloadBlob(r.data, `${kind}-${id}.pdf`);
    } catch {
      toast.error("Could not generate the PDF");
    }
  };

  const panelClass =
    "overflow-hidden rounded-xl border border-neutral-200/80 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md";

  const panelTitleClass =
    "border-b border-neutral-100 px-5 py-4 text-sm font-bold tracking-tight text-neutral-900 sm:px-6";

  const mutedText = "text-xs leading-5 text-neutral-500";

  return (
    <Async state={st}>
      {({ order: o, payments, refunds, returns, allowedTransitions }) => (
        <div className="mx-auto w-full max-w-[1600px] space-y-5 pb-8">
          {/* Header */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
            <PageHead title={`Order ${o.orderNumber}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge status={o.status} />

                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => file("invoice")}
                >
                  Invoice PDF
                </button>

                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => file("label")}
                >
                  Shipping label
                </button>
              </div>
            </PageHead>

            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-neutral-100 pt-4 sm:grid-cols-3">
              <div className="rounded-lg bg-neutral-50 p-3.5">
                <p className={mutedText}>Order number</p>
                <p className="mt-1 break-words text-sm font-semibold text-neutral-900">
                  {o.orderNumber}
                </p>
              </div>

              <div className="rounded-lg bg-neutral-50 p-3.5">
                <p className={mutedText}>Order placed</p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">
                  {dateTime(o.createdAt)}
                </p>
              </div>

              <div className="rounded-lg bg-neutral-50 p-3.5">
                <p className={mutedText}>Payment method</p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">
                  {o.paymentMethod === "cod" ? "Cash on Delivery" : "Razorpay"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
            {/* Main content */}
            <div className="min-w-0 space-y-5">
              {/* Items */}
              <section className={panelClass}>
                <div className={panelTitleClass}>
                  <div className="flex items-center justify-between gap-3">
                    <span>Order items</span>
                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
                      {o.items.length} {o.items.length === 1 ? "item" : "items"}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <DataTable
                    rows={o.items}
                    columns={[
                      {
                        key: "name",
                        label: "Product",
                        render: (i) => (
                          <div className="min-w-[140px] py-1">
                            <p className="text-sm font-semibold text-neutral-900">
                              {i.name}
                            </p>
                            <p className="mt-1 text-xs text-neutral-500">
                              {i.sku || "No SKU"}
                              {i.variantLabel ? ` · ${i.variantLabel}` : ""}
                            </p>
                          </div>
                        ),
                      },
                      {
                        key: "quantity",
                        label: "Qty",
                        render: (i) => (
                          <span className="inline-flex min-w-8 items-center justify-center rounded-md bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">
                            {i.quantity}
                          </span>
                        ),
                      },
                      {
                        key: "unitPrice",
                        label: "Unit price",
                        render: (i) => (
                          <span className="whitespace-nowrap text-sm text-neutral-600">
                            {inr(i.unitPrice)}
                          </span>
                        ),
                      },
                      {
                        key: "netTotal",
                        label: "Net total",
                        render: (i) => (
                          <span className="whitespace-nowrap text-sm font-semibold text-neutral-900">
                            {inr(i.netTotal)}
                          </span>
                        ),
                      },
                    ]}
                  />
                </div>
              </section>

              {/* Order progress */}
              <section className={panelClass}>
                <div className={panelTitleClass}>Order progress</div>
                <div className="p-5 sm:p-6">
                  <Timeline
                    steps={ORDER_STEPS}
                    current={o.status}
                    history={o.statusHistory}
                    cancelled={o.status === "Cancelled"}
                  />
                </div>
              </section>

              {/* Payments, refunds and returns */}
              <section className={panelClass}>
                <div className={panelTitleClass}>
                  Payments, refunds & returns
                </div>

                <div className="space-y-5 p-5 sm:p-6">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-neutral-200 p-3.5">
                      <p className={mutedText}>Payment method</p>
                      <p className="mt-1 text-sm font-semibold text-neutral-900">
                        {o.paymentMethod === "cod"
                          ? "Cash on Delivery"
                          : "Razorpay"}
                      </p>
                    </div>

                    <div className="rounded-lg border border-neutral-200 p-3.5">
                      <p className={mutedText}>Payment status</p>
                      <div className="mt-2">
                        <Badge status={o.paymentStatus} />
                      </div>
                    </div>

                    <div className="rounded-lg border border-neutral-200 p-3.5">
                      <p className={mutedText}>Amount refunded</p>
                      <p className="mt-1 text-sm font-semibold text-neutral-900">
                        {inr(o.refundedAmount)}
                      </p>
                    </div>
                  </div>

                  {payments.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-500">
                        Payment transactions
                      </h4>

                      <div className="space-y-2">
                        {payments.map((p) => (
                          <div
                            key={p._id}
                            className="rounded-lg border border-neutral-100 bg-neutral-50 p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-neutral-800">
                                {p.providerOrderId || "Payment transaction"}
                              </span>
                              <Badge status={p.status} />
                            </div>

                            <p className="mt-2 break-all text-xs text-neutral-500">
                              Payment ID:{" "}
                              {p.providerPaymentId || "Not available"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {refunds.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-500">
                        Refund transactions
                      </h4>

                      <div className="space-y-2">
                        {refunds.map((r) => (
                          <div
                            key={r._id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-100 p-3"
                          >
                            <div>
                              <p className="text-sm font-semibold text-neutral-900">
                                {inr(r.amount)}
                              </p>
                              <p className="mt-1 text-xs text-neutral-500">
                                {r.method}
                              </p>
                            </div>
                            <Badge status={r.status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {returns.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-500">
                        Return requests
                      </h4>

                      <div className="flex flex-wrap gap-2">
                        {returns.map((r) => (
                          <Link
                            key={r._id}
                            to={`/admin/returns/${r._id}`}
                            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-brand transition hover:border-brand hover:bg-brand-50"
                          >
                            {r.returnNumber}
                            <span aria-hidden="true">↗</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {payments.length === 0 &&
                    refunds.length === 0 &&
                    returns.length === 0 && (
                      <p className="rounded-lg bg-neutral-50 px-4 py-5 text-center text-sm text-neutral-500">
                        No payment transactions, refunds, or returns recorded.
                      </p>
                    )}
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <aside className="min-w-0 space-y-5 xl:sticky xl:top-5">
              {/* Status actions */}
              <section className={panelClass}>
                <div className={panelTitleClass}>Update order status</div>

                <div className="p-5">
                  {allowedTransitions.length ? (
                    <>
                      <p className="mb-4 text-xs leading-5 text-neutral-500">
                        Select an action to update this order's status.
                      </p>

                      <div className="flex flex-col gap-2.5">
                        {allowedTransitions.map((s) => (
                          <button
                            type="button"
                            key={s}
                            className={`w-full ${
                              s === "Cancelled" ? "btn-danger" : "btn"
                            }`}
                            onClick={() => setPending(s)}
                          >
                            {s === "Cancelled" ? "Cancel order" : `Mark ${s}`}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg bg-neutral-50 p-4 text-center">
                      <p className="text-sm font-medium text-neutral-700">
                        Order completed
                      </p>
                      <p className="mt-1 text-xs leading-5 text-neutral-500">
                        No further status changes are possible.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* Shipping tracking */}
              <section className={panelClass}>
                <div className={panelTitleClass}>Shipping & tracking</div>

                <div className="space-y-4 p-5">
                  {[
                    ["carrier", "Carrier", "e.g. Delhivery"],
                    [
                      "trackingNumber",
                      "Tracking number",
                      "Enter tracking number",
                    ],
                    ["url", "Tracking URL", "https://..."],
                  ].map(([k, label, placeholder]) => (
                    <div key={k}>
                      <label className="label" htmlFor={`t-${k}`}>
                        {label}
                      </label>

                      <input
                        id={`t-${k}`}
                        type={k === "url" ? "url" : "text"}
                        className="input"
                        placeholder={o.tracking?.[k] || placeholder}
                        value={trk[k]}
                        onChange={(e) =>
                          setTrk({ ...trk, [k]: e.target.value })
                        }
                      />
                    </div>
                  ))}

                  <button
                    type="button"
                    className="btn-outline w-full"
                    onClick={saveTracking}
                  >
                    Save tracking details
                  </button>

                  {o.tracking?.trackingNumber && (
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                      <p className="text-xs font-semibold text-neutral-700">
                        Current tracking
                      </p>
                      <p className="mt-1 text-xs text-neutral-600">
                        {o.tracking.carrier || "Carrier not specified"}
                      </p>
                      <p className="mt-1 break-all text-xs font-medium text-neutral-900">
                        {o.tracking.trackingNumber}
                      </p>

                      {o.tracking.url && (
                        <a
                          href={o.tracking.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs font-semibold text-brand underline"
                        >
                          Open tracking page
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Customer details */}
              <section className={panelClass}>
                <div className={panelTitleClass}>Customer information</div>

                <div className="space-y-4 p-5">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      {o.customer?.name || "Customer"}
                    </p>

                    {o.customer?.email && (
                      <a
                        href={`mailto:${o.customer.email}`}
                        className="mt-1 block break-all text-xs text-brand hover:underline"
                      >
                        {o.customer.email}
                      </a>
                    )}

                    {o.customer?.phone && (
                      <p className="mt-1 text-xs text-neutral-600">
                        {o.customer.phone}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-neutral-100 pt-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Shipping address
                    </p>

                    <address className="not-italic text-sm leading-6 text-neutral-700">
                      {o.shippingAddress.line1}
                      {o.shippingAddress.line2
                        ? `, ${o.shippingAddress.line2}`
                        : ""}
                      <br />
                      {o.shippingAddress.city}, {o.shippingAddress.state}
                      <br />
                      {o.shippingAddress.pincode}
                    </address>
                  </div>

                  <div className="border-t border-neutral-100 pt-3">
                    <p className={mutedText}>Order placed</p>
                    <p className="mt-1 text-xs font-medium text-neutral-700">
                      {dateTime(o.createdAt)}
                    </p>
                  </div>
                </div>
              </section>

              {/* Order totals */}
              <section className={panelClass}>
                <div className={panelTitleClass}>Order summary</div>

                <div className="space-y-3 p-5">
                  <dl className="space-y-3 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-neutral-500">Subtotal</dt>
                      <dd className="text-right font-medium text-neutral-800">
                        {inr(o.pricing.subtotal)}
                      </dd>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-neutral-500">Discount</dt>
                      <dd className="text-right font-medium text-emerald-700">
                        - {inr(o.pricing.discount)}
                      </dd>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-neutral-500">Shipping</dt>
                      <dd className="text-right font-medium text-neutral-800">
                        {inr(o.pricing.shipping)}
                      </dd>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-neutral-500">COD fee</dt>
                      <dd className="text-right font-medium text-neutral-800">
                        {inr(o.pricing.codFee)}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex items-center justify-between gap-3 border-t border-neutral-200 pt-4">
                    <span className="text-sm font-bold text-neutral-900">
                      Total
                    </span>
                    <span className="text-xl font-bold tracking-tight text-neutral-900">
                      {inr(o.pricing.total)}
                    </span>
                  </div>

                  <p className="text-right text-xs text-neutral-500">
                    {o.paymentMethod === "cod"
                      ? "Payable on delivery"
                      : "Online payment"}
                  </p>
                </div>
              </section>
            </aside>
          </div>

          {/* Confirmation dialog */}
          <ConfirmDialog
            open={Boolean(pending)}
            title={
              pending === "Cancelled"
                ? "Cancel this order?"
                : `Mark order as ${pending}?`
            }
            message={
              <div className="space-y-3">
                <p className="text-sm leading-6 text-neutral-600">
                  {pending === "Cancelled"
                    ? "Stock is released and any online payment is refunded."
                    : "The customer will be notified by email."}
                </p>

                <div>
                  <label htmlFor="order-status-note" className="label">
                    Internal note (optional)
                  </label>
                  <input
                    id="order-status-note"
                    aria-label="Note (optional)"
                    className="input"
                    placeholder="Add a note about this status change"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>
            }
            confirmLabel="Confirm"
            danger={pending === "Cancelled"}
            onConfirm={change}
            onCancel={() => setPending(null)}
          />
        </div>
      )}
    </Async>
  );
}
