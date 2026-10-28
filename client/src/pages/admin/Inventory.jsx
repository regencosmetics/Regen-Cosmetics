import { useState } from "react";
import toast from "react-hot-toast";
import { PageHead, Card, DataTable, Async, Pager } from "./ui.jsx";
import { useFetch } from "@/hooks";
import { adminApi } from "@/services";
import { errorMessage } from "@/services/api";
import { dateTime, newIdempotencyKey } from "@/utils/format";

export default function Inventory() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [adj, setAdj] = useState(null);
  const [busy, setBusy] = useState(false);

  const inventory = useFetch(
    () => adminApi.get("inventory", { page, limit: 20, search }),
    [page, search],
  );

  const tx = useFetch(
    () => adminApi.get("inventory/transactions", { page: 1, limit: 15 }),
    [],
  );

  const low = useFetch(() => adminApi.get("inventory/low-stock"), []);

  const openAdjust = (item) => {
    setAdj(item);
    setDelta("");
    setReason("");
  };

  const closeAdjust = () => {
    if (busy) return;
    setAdj(null);
    setDelta("");
    setReason("");
  };

  const submit = async (e) => {
    e.preventDefault();

    const quantity = Number(delta);

    if (!Number.isInteger(quantity) || quantity === 0) {
      toast.error(
        "Enter a non-zero whole number. Use a negative number to remove stock.",
      );
      return;
    }

    if (reason.trim().length < 3) {
      toast.error("Please enter a reason with at least 3 characters.");
      return;
    }

    setBusy(true);

    try {
      await adminApi.post(
        "inventory/adjust",
        {
          productId: adj.productId,
          sku: adj.sku,
          delta: quantity,
          reason: reason.trim(),
        },
        {
          headers: {
            "Idempotency-Key": newIdempotencyKey(),
          },
        },
      );

      toast.success("Stock updated successfully in inventory.");

      setAdj(null);
      setDelta("");
      setReason("");

      inventory.reload();
      low.reload();
      tx.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <div className="space-y-6">
      <PageHead title="Inventory" />

      {/* All inventory */}
      <Card title="All Inventory">
        <form
          onSubmit={handleSearch}
          className="mb-5 flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="search"
            className="input min-w-0 flex-1"
            placeholder="Search product name or SKU..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />

          <button type="submit" className="btn">
            Search
          </button>

          {search && (
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(1);
              }}
            >
              Clear
            </button>
          )}
        </form>

        <Async state={inventory}>
          {(data) => (
            <>
              <DataTable
                empty="No inventory items found."
                rows={data.items}
                columns={[
                  {
                    key: "name",
                    label: "Product",
                    render: (item) => (
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.label && (
                          <p className="text-xs text-gray-500">{item.label}</p>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: "sku",
                    label: "SKU",
                  },
                  {
                    key: "stock",
                    label: "Available stock",
                    render: (item) => (
                      <span
                        className={
                          item.stock <= item.lowStockThreshold
                            ? "font-semibold text-red-600"
                            : "font-medium text-green-700"
                        }
                      >
                        {item.stock}
                      </span>
                    ),
                  },
                  {
                    key: "status",
                    label: "Status",
                    render: (item) => (
                      <span
                        className={
                          item.stock <= item.lowStockThreshold
                            ? "rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
                            : "rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700"
                        }
                      >
                        {item.stock === 0
                          ? "Out of stock"
                          : item.stock <= item.lowStockThreshold
                            ? "Low stock"
                            : "In stock"}
                      </span>
                    ),
                  },
                  {
                    key: "action",
                    label: "Action",
                    render: (item) => (
                      <button
                        type="button"
                        className="text-brand underline"
                        onClick={() => openAdjust(item)}
                      >
                        Adjust stock
                      </button>
                    ),
                  },
                ]}
              />

              <Pager d={data} setPage={setPage} />
            </>
          )}
        </Async>
      </Card>

      {/* Stock adjustment form */}
      {adj && (
        <Card title={`Adjust Stock — ${adj.name}`}>
          <div className="mb-4 rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-600">Selected variant</p>
            <p className="font-semibold">{adj.label || adj.sku}</p>
            <p className="text-sm text-gray-600">SKU: {adj.sku}</p>
            <p className="mt-2">
              Current stock: <strong>{adj.stock} units</strong>
            </p>
          </div>

          <form onSubmit={submit} className="grid gap-4">
            <div>
              <label className="label" htmlFor="stock-delta">
                Quantity change
              </label>
              <input
                id="stock-delta"
                type="number"
                step="1"
                className="input"
                placeholder="Example: 10 to add, -2 to remove"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                disabled={busy}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Use a positive number to add stock or a negative number to
                remove stock.
              </p>
            </div>

            <div>
              <label className="label" htmlFor="stock-reason">
                Reason for adjustment
              </label>
              <input
                id="stock-reason"
                className="input"
                placeholder="Example: New supplier shipment"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={busy}
                minLength={3}
                maxLength={200}
                required
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="btn" type="submit" disabled={busy}>
                {busy ? "Updating stock..." : "Save adjustment"}
              </button>

              <button
                className="btn-outline"
                type="button"
                onClick={closeAdjust}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Low-stock overview */}
      <Card title="Low Stock & Out of Stock">
        <Async state={low}>
          {(data) => (
            <DataTable
              empty="No low-stock items."
              rows={data.items}
              columns={[
                { key: "name", label: "Product" },
                { key: "sku", label: "SKU" },
                { key: "stock", label: "Stock" },
                {
                  key: "action",
                  label: "Action",
                  render: (item) => (
                    <button
                      type="button"
                      className="text-brand underline"
                      onClick={() => openAdjust(item)}
                    >
                      Adjust
                    </button>
                  ),
                },
              ]}
            />
          )}
        </Async>
      </Card>

      {/* Recent stock movements */}
      <Card title="Recent Stock Movements">
        <Async state={tx}>
          {(data) => (
            <DataTable
              empty="No stock movements recorded yet."
              rows={data.items}
              columns={[
                {
                  key: "createdAt",
                  label: "When",
                  render: (item) => dateTime(item.createdAt),
                },
                {
                  key: "product",
                  label: "Product",
                  render: (item) => item.product?.name || "—",
                },
                { key: "sku", label: "SKU" },
                { key: "type", label: "Type" },
                { key: "delta", label: "Change" },
                { key: "stockAfter", label: "Stock after" },
                { key: "reason", label: "Reason" },
              ]}
            />
          )}
        </Async>
      </Card>
    </div>
  );
}
