import { describe, it, expect } from 'vitest';
import { inr, effectivePrice, discountPct, totalStock, productImage } from './format';

describe('price helpers', () => {
  it('formats INR with Indian grouping', () => { expect(inr(1299)).toBe('Rs 1,299.00'); expect(inr(125000.5)).toBe('Rs 1,25,000.50'); });
  it('uses the sale price only when it is lower than the regular price', () => {
    expect(effectivePrice({ price: 1299, salePrice: 999 })).toBe(999);
    expect(effectivePrice({ price: 1299, salePrice: null })).toBe(1299);
    expect(effectivePrice({ price: 500, salePrice: 700 })).toBe(500);
  });
  it('rounds the discount percentage', () => { expect(discountPct({ price: 1299, salePrice: 999 })).toBe(23); expect(discountPct({ price: 0, salePrice: 0 })).toBe(0); });
  it('sums stock over active variants only', () => { expect(totalStock({ variants: [{ stock: 3 }, { stock: 4, active: false }, { stock: 2, active: true }] })).toBe(5); });
  it('falls back to the logo when a product has no image', () => { expect(productImage({ images: [] })).toBe('/assets/logo.png'); });
});
