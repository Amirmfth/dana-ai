"use server";

import { redirect } from "next/navigation";

import {
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from "@/lib/auth/server";

function readCredentials(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    password.length < 8
  ) {
    throw new Error("A valid email and password of at least 8 characters are required.");
  }

  return {
    email: email.trim().toLowerCase(),
    password,
  };
}

export async function signInAction(formData: FormData) {
  const { email, password } = readCredentials(formData);

  try {
    await signInWithPassword(email, password);
  } catch {
    redirect("/login?error=invalid_credentials");
  }

  redirect("/");
}

export async function signUpAction(formData: FormData) {
  const { email, password } = readCredentials(formData);

  try {
    const result = await signUpWithPassword(email, password);

    if (!result.signedIn) {
      redirect("/login?message=check_email");
    }
  } catch {
    redirect("/signup?error=signup_failed");
  }

  redirect("/");
}

export async function signOutAction() {
  await signOut();
  redirect("/login");
}
