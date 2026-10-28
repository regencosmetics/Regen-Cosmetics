import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema, addressSchema, contactSchema, resetSchema, zodResolver } from './schemas';

const addr = { fullName: 'Asha Rao', phone: '9876543210', line1: '12 MG Road', city: 'Guntur', state: 'Andhra Pradesh', pincode: '522001' };
describe('form validation', () => {
  it('rejects bad email and empty password at login', () => { expect(loginSchema.safeParse({ email: 'nope', password: '' }).success).toBe(false); expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true); });
  it('enforces password strength on register', () => {
    const base = { name: 'Asha Rao', phone: '9876543210', email: 'a@b.co' };
    expect(registerSchema.safeParse({ ...base, password: 'weak' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: 'Str0ngPass!word' }).success).toBe(true);
  });
  it('validates Indian mobile numbers and PIN codes', () => {
    expect(addressSchema.safeParse(addr).success).toBe(true);
    expect(addressSchema.safeParse({ ...addr, phone: '12345' }).success).toBe(false);
    expect(addressSchema.safeParse({ ...addr, pincode: '012345' }).success).toBe(false);
    expect(addressSchema.safeParse({ ...addr, pincode: '5220' }).success).toBe(false);
  });
  it('requires a meaningful contact message', () => { expect(contactSchema.safeParse({ name: 'A B', email: 'a@b.co', message: 'short' }).success).toBe(false); });
  it('requires matching passwords on reset', () => { expect(resetSchema.safeParse({ password: 'Str0ngPass!word', confirm: 'different' }).success).toBe(false); });
  it('zodResolver maps issues to field errors', async () => { const r = await zodResolver(loginSchema)({ email: 'bad', password: '' }); expect(Object.keys(r.errors)).toEqual(expect.arrayContaining(['email', 'password'])); });
});
