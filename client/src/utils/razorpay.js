/** Loads Razorpay's checkout.js on demand. Resolves to window.Razorpay or rejects if the script cannot load. */
let loading;
export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (!loading) loading = new Promise((resolve, reject) => {
    const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.async = true;
    s.onload = () => resolve(window.Razorpay); s.onerror = () => { loading = null; reject(new Error('Could not load the payment window. Check your connection and try again.')); };
    document.body.appendChild(s);
  });
  return loading;
}
