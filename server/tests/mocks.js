import { vi } from 'vitest';
export const rz = (() => {
  let seq = 0;
  const state = { refunds: [], orders: [], fail: false, payments: {} };
  const api = {
    orders: {
      create: vi.fn(async (o) => { const id = `order_T${++seq}`; state.orders.push({ id, ...o }); return { id, currency: o.currency, amount: o.amount }; }),
      fetchPayments: vi.fn(async (id) => ({ items: state.payments[id] || [] })),
    },
    payments: {
      refund: vi.fn(async (pid, body) => { if (state.fail) throw { error: { description: 'gateway down' } }; const r = { id: `rfnd_T${++seq}`, payment_id: pid, status: 'processed', ...body }; state.refunds.push(r); return r; }),
      fetchMultipleRefund: vi.fn(async () => ({ items: state.refunds })),
    },
  };
  return { api, state, reset() { state.refunds = []; state.orders = []; state.fail = false; state.payments = {}; Object.values(api.orders).concat(Object.values(api.payments)).forEach((f) => f.mockClear()); } };
})();
