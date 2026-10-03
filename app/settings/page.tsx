"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, destination, User } from "@/lib/api";
import { countryOptions } from "@/lib/countries";
import { strongPassword } from "@/lib/auth-validation";
import { useAuth } from "@/components/rivera/auth-provider";
import { OperationalSettings } from "@/components/rivera/operations";
import { ThemePreference } from "@/components/rivera/theme-preference";

const profileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(5).max(30).or(z.literal("")),
  countryCode: z
    .string()
    .refine(
      (value) =>
        !value ||
        countryOptions.some((country) => country.code === value.toUpperCase()),
      "Choose a valid country",
    ),
  city: z.string().max(100),
});
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export default function Settings() {
  const { user, refresh, logout } = useAuth();
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const profile = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      countryCode: "",
      city: "",
    },
  });
  const password = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  useEffect(() => {
    if (user)
      profile.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone ?? "",
        countryCode: user.countryCode ?? "",
        city: user.city ?? "",
      });
  }, [user, profile]);
  if (!user) return null;
  const field = (
    form: typeof profile,
    name: keyof z.infer<typeof profileSchema>,
    label: string,
    type = "text",
    placeholder = "",
  ) => (
    <label className="field">
      <span>{label}</span>
      <input type={type} placeholder={placeholder} {...form.register(name)} />
      <small role="alert">{form.formState.errors[name]?.message}</small>
    </label>
  );
  return (
    <main className="settings-shell">
      <div className="settings-card">
        <Link href={destination(user)}>← Dashboard</Link>
        <p className="eyebrow">ACCOUNT</p>
        <h1>Settings</h1>
        <p className="settings-email">
          {user.email} <span>Verified</span>
        </p>
        <ThemePreference />
        <section>
          <h2>Profile details</h2>
          <p>
            Keep the essentials current. Your email and roles cannot be changed
            here.
          </p>
          <form
            onSubmit={profile.handleSubmit(async (data) => {
              setProfileMessage("");
              try {
                await api<User>(
                  "/auth/profile",
                  {
                    method: "PATCH",
                    body: JSON.stringify({
                      ...data,
                      countryCode: data.countryCode.toUpperCase() || undefined,
                      phone: data.phone || undefined,
                      city: data.city || undefined,
                    }),
                  },
                  false,
                );
                await refresh();
                setProfileMessage("Profile updated.");
              } catch (error) {
                setProfileMessage(
                  error instanceof Error ? error.message : "Try again.",
                );
              }
            })}
          >
            <div className="settings-grid">
              {field(profile, "firstName", "First name", "text", "e.g. Amina")}
              {field(profile, "lastName", "Last name", "text", "e.g. Rivera")}
              {field(profile, "phone", "Phone (optional)", "tel", "+254 700 000 000")}
              <label className="field">
                <span>Country (optional)</span>
                <input
                  list="settings-countries"
                  placeholder="Search by ISO country code"
                  {...profile.register("countryCode")}
                />
                <datalist id="settings-countries">
                  {countryOptions.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </datalist>
                <small role="alert">
                  {profile.formState.errors.countryCode?.message}
                </small>
              </label>
              {field(profile, "city", "City (optional)", "text", "e.g. Nairobi")}
            </div>
            <button
              className="button primary"
              disabled={profile.formState.isSubmitting}
            >
              {profile.formState.isSubmitting ? "Saving…" : "Save profile"}
            </button>
            {profileMessage && <p role="status">{profileMessage}</p>}
          </form>
        </section>
        <section>
          <h2>Change password</h2>
          <form
            onSubmit={password.handleSubmit(async (data) => {
              setPasswordMessage("");
              try {
                await api(
                  "/auth/change-password",
                  { method: "POST", body: JSON.stringify(data) },
                  false,
                );
                setPasswordMessage("Password changed. Please log in again.");
                setTimeout(() => void logout(), 1200);
              } catch (error) {
                setPasswordMessage(
                  error instanceof Error ? error.message : "Try again.",
                );
              }
            })}
          >
            {(
              ["currentPassword", "newPassword", "confirmPassword"] as const
            ).map((name) => (
              <label className="field" key={name}>
                <span>
                  {name === "currentPassword"
                    ? "Current password"
                    : name === "newPassword"
                      ? "New password"
                      : "Confirm new password"}
                </span>
                <input
                  type="password"
                  autoComplete={
                    name === "currentPassword"
                      ? "current-password"
                      : "new-password"
                  }
                  {...password.register(name)}
                />
                <small role="alert">
                  {password.formState.errors[name]?.message}
                </small>
              </label>
            ))}
            <button
              className="button primary"
              disabled={password.formState.isSubmitting}
            >
              {password.formState.isSubmitting
                ? "Changing…"
                : "Change password"}
            </button>
            {passwordMessage && <p role="status">{passwordMessage}</p>}
          </form>
        </section>
        <OperationalSettings />
        <section className="danger-zone">
          <h2>Deactivate account</h2>
          <p>This signs you out everywhere and prevents future login.</p>
          <button
            className="deactivate"
            onClick={async () => {
              if (
                !window.confirm(
                  "Deactivate your Rivera account? This will sign you out on every device.",
                )
              )
                return;
              await api("/auth/deactivate", { method: "POST" }, false);
              await logout();
            }}
          >
            Deactivate account
          </button>
        </section>
      </div>
    </main>
  );
}
