import { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  UserRound,
  LockKeyhole,
  MapPin,
  Package,
  Heart,
  Truck,
  RotateCcw,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

import Seo from "@/components/common/Seo.jsx";
import FormField from "@/components/common/FormField.jsx";
import ConfirmDialog from "@/components/common/ConfirmDialog.jsx";
import { useFetch } from "@/hooks";
import { accountApi, authApi } from "@/services";
import { errorMessage } from "@/services/api";
import { setUser, logout } from "@/store/authSlice";
import {
  profileSchema,
  changePasswordSchema,
  addressSchema,
  zodResolver,
} from "@/utils/schemas";
import { INDIAN_STATES } from "@/constants";

const panel =
  "overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm";

const panelHeader =
  "flex items-center gap-3 border-b border-neutral-100 px-4 py-4 sm:px-6 sm:py-5";

const fieldTitle =
  "font-display text-base font-bold text-neutral-900 sm:text-lg";

function SectionIcon({ children }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/5 text-brand">
      {children}
    </span>
  );
}

function Profile() {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      phone: user.phone,
    },
  });

  const save = async (v) => {
    try {
      const r = await authApi.updateProfile(v);
      dispatch(setUser(r.user));
      toast.success("Profile updated");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <section className={panel}>
      <div className={panelHeader}>
        <SectionIcon>
          <UserRound size={20} />
        </SectionIcon>
        <div>
          <h2 className={fieldTitle}>Personal information</h2>
          <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
            Manage your account details.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(save)}
        noValidate
        className="space-y-4 p-4 sm:space-y-5 sm:p-6"
      >
        <FormField
          label="Full name"
          error={errors.name?.message}
          {...register("name")}
        />

        <FormField
          label="Mobile number"
          error={errors.phone?.message}
          {...register("phone")}
        />

        <FormField
          label="Email address"
          value={user.email}
          readOnly
          disabled
          hint="Email cannot be changed here."
          onChange={() => {}}
        />

        <button
          type="submit"
          className="btn w-full sm:w-auto"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>
      </form>
    </section>
  );
}

function Password() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
  });

  const save = async (v) => {
    try {
      await authApi.changePassword(v);
      toast.success("Password changed");
      reset();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <section className={panel}>
      <div className={panelHeader}>
        <SectionIcon>
          <LockKeyhole size={20} />
        </SectionIcon>
        <div>
          <h2 className={fieldTitle}>Security</h2>
          <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
            Keep your account secure.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(save)}
        noValidate
        className="space-y-4 p-4 sm:space-y-5 sm:p-6"
      >
        <FormField
          label="Current password"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register("currentPassword")}
        />

        <FormField
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />

        <button
          type="submit"
          className="btn w-full sm:w-auto"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Updating..." : "Update password"}
        </button>
      </form>
    </section>
  );
}

function AddressForm({ initial, onSaved, onCancel }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      state: "",
      ...initial,
    },
  });

  const save = async (v) => {
    try {
      const r = initial?._id
        ? await accountApi.updateAddress(initial._id, v)
        : await accountApi.addAddress(v);

      toast.success("Address saved");
      onSaved(r.addresses);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <form
      onSubmit={handleSubmit(save)}
      noValidate
      className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6"
    >
      <FormField
        label="Full name"
        error={errors.fullName?.message}
        {...register("fullName")}
      />

      <FormField
        label="Mobile number"
        error={errors.phone?.message}
        {...register("phone")}
      />

      <FormField
        className="sm:col-span-2"
        label="Address line 1"
        error={errors.line1?.message}
        {...register("line1")}
      />

      <FormField
        className="sm:col-span-2"
        label="Address line 2 (optional)"
        {...register("line2")}
      />

      <FormField
        label="City"
        error={errors.city?.message}
        {...register("city")}
      />

      <FormField
        as="select"
        label="State"
        error={errors.state?.message}
        {...register("state")}
      >
        <option value="">Select state</option>
        {INDIAN_STATES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </FormField>

      <FormField
        label="PIN code"
        maxLength={6}
        error={errors.pincode?.message}
        {...register("pincode")}
      />

      <label className="flex min-h-11 items-center gap-3 text-sm text-neutral-700">
        <input
          type="checkbox"
          className="h-4 w-4 accent-current"
          {...register("isDefault")}
        />
        Set as default address
      </label>

      <div className="flex flex-col gap-3 border-t border-neutral-100 pt-4 sm:col-span-2 sm:flex-row">
        <button
          type="submit"
          className="btn w-full sm:w-auto"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save address"}
        </button>

        <button
          type="button"
          className="btn-outline w-full sm:w-auto"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Addresses() {
  const { data, setData } = useFetch(() => accountApi.addresses(), []);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);

  const list = data?.addresses || [];

  const remove = async () => {
    try {
      const r = await accountApi.deleteAddress(del._id);
      setData(r);
      toast.success("Address removed");
    } catch (e) {
      toast.error(errorMessage(e));
    }

    setDel(null);
  };

  return (
    <section className={panel}>
      <div className={panelHeader}>
        <SectionIcon>
          <MapPin size={20} />
        </SectionIcon>

        <div className="min-w-0 flex-1">
          <h2 className={fieldTitle}>Saved addresses</h2>
          <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
            Manage your delivery addresses.
          </p>
        </div>

        {!edit && (
          <button
            type="button"
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-brand px-3 text-xs font-semibold text-brand transition hover:bg-brand/5 sm:px-4 sm:text-sm"
            onClick={() => setEdit({})}
          >
            <Plus size={16} />
            <span className="hidden xs:inline">Add</span>
            <span className="xs:hidden">Add</span>
          </button>
        )}
      </div>

      {edit ? (
        <div>
          <div className="border-b border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:px-6">
            <h3 className="text-sm font-semibold text-neutral-800">
              {edit._id ? "Edit address" : "Add a new address"}
            </h3>
          </div>

          <AddressForm
            initial={edit._id ? edit : undefined}
            onSaved={(a) => {
              setData({ addresses: a });
              setEdit(null);
            }}
            onCancel={() => setEdit(null)}
          />
        </div>
      ) : (
        <div className="p-4 sm:p-6">
          {list.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {list.map((a) => (
                <li
                  key={a._id}
                  className={`relative flex min-w-0 flex-col rounded-xl border p-4 transition-colors ${
                    a.isDefault
                      ? "border-brand/30 bg-brand/[0.025]"
                      : "border-neutral-200 bg-white"
                  }`}
                >
                  {a.isDefault && (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand">
                      <ShieldCheck size={12} />
                      Default
                    </span>
                  )}

                  <div className="min-w-0 pr-1">
                    <h3 className="break-words pr-16 text-sm font-bold text-neutral-900 sm:text-base">
                      {a.fullName}
                    </h3>

                    <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
                      {a.phone}
                    </p>
                  </div>

                  <address className="mt-4 flex-1 break-words text-sm not-italic leading-6 text-neutral-600">
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ""}
                    <br />
                    {a.city}, {a.state}
                    <br />
                    <span className="font-semibold text-neutral-800">
                      {a.pincode}
                    </span>
                  </address>

                  <div className="mt-5 grid grid-cols-2 gap-2 border-t border-neutral-100 pt-3">
                    <button
                      type="button"
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 px-2 text-xs font-semibold text-neutral-700 transition hover:border-brand hover:text-brand sm:text-sm"
                      onClick={() => setEdit(a)}
                    >
                      <Pencil size={14} />
                      Edit
                    </button>

                    <button
                      type="button"
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-red-100 px-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 sm:text-sm"
                      onClick={() => setDel(a)}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                <MapPin size={24} />
              </span>

              <h3 className="mt-4 text-sm font-bold text-neutral-900">
                No saved addresses
              </h3>

              <p className="mt-2 max-w-xs text-xs leading-5 text-neutral-500 sm:text-sm">
                Add your delivery address to make future checkouts easier.
              </p>

              <button
                type="button"
                className="btn mt-5"
                onClick={() => setEdit({})}
              >
                <Plus size={16} />
                Add your first address
              </button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(del)}
        title="Delete address?"
        message="This address will be removed from your account."
        confirmLabel="Delete"
        danger
        onConfirm={remove}
        onCancel={() => setDel(null)}
      />
    </section>
  );
}

const accountLinks = [
  {
    to: "/account/orders",
    label: "My Orders",
    icon: Package,
  },
  {
    to: "/account/returns",
    label: "My Returns",
    icon: RotateCcw,
  },
  {
    to: "/wishlist",
    label: "Wishlist",
    icon: Heart,
  },
  {
    to: "/track-order",
    label: "Track Order",
    icon: Truck,
  },
];

export default function Account() {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();

  const firstName = user?.name?.split(" ")[0] || "there";

  const handleLogout = () => {
    dispatch(logout()).then(() => toast.success("Logged out"));
  };

  return (
    <main className="min-h-screen bg-neutral-50/70 pb-10 sm:pb-14">
      <Seo title="My Account" noindex />

      <div className="wrap py-5 sm:py-8 md:py-10">
        {/* Welcome header */}
        <section className="overflow-hidden rounded-2xl bg-brand-foot text-white shadow-sm">
          <div className="relative px-5 py-6 sm:px-8 sm:py-8">
            <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full border-[24px] border-white/[0.035] sm:h-56 sm:w-56" />
            <div className="pointer-events-none absolute -bottom-20 right-24 h-36 w-36 rounded-full bg-white/[0.035]" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 sm:text-xs">
                  Your personal space
                </p>

                <h1 className="mt-2 break-words font-display text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">
                  Hello, {firstName}
                </h1>

                <p className="mt-2 break-all text-xs text-white/75 sm:text-sm">
                  {user?.email}
                </p>

                <p className="mt-3 max-w-md text-xs leading-5 text-white/70 sm:text-sm sm:leading-6">
                  Manage your profile, security settings and delivery addresses.
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15 sm:w-auto"
              >
                <LogOut size={17} />
                Log out
              </button>
            </div>
          </div>
        </section>

        {/* Account navigation */}
        <section className="mt-5 sm:mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Quick links
            </h2>
          </div>

          <nav
            aria-label="Account"
            className="-mx-5 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0"
          >
            <ul className="flex min-w-max gap-3 sm:grid sm:min-w-0 sm:grid-cols-2 lg:grid-cols-4">
              {accountLinks.map(({ to, label, icon: Icon }) => (
                <li key={to} className="min-w-0">
                  <Link
                    to={to}
                    className="group flex min-h-[76px] min-w-[150px] items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm transition hover:border-brand/30 hover:shadow-md sm:min-w-0 sm:px-3 lg:px-4"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/5 text-brand transition group-hover:bg-brand group-hover:text-white">
                      <Icon size={19} />
                    </span>

                    <span className="min-w-0 flex-1 text-xs font-semibold text-neutral-800 sm:text-sm">
                      {label}
                    </span>

                    <ChevronRight
                      size={15}
                      className="shrink-0 text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-brand"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </section>

        {/* Account forms */}
        <div className="mt-5 grid items-start gap-5 sm:mt-7 sm:gap-6 lg:grid-cols-2">
          <Profile />
          <Password />

          <div className="min-w-0 lg:col-span-2">
            <Addresses />
          </div>
        </div>

        {/* Mobile logout */}
        <div className="mt-6 sm:hidden">
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            <LogOut size={17} />
            Log out of your account
          </button>
        </div>
      </div>
    </main>
  );
}
