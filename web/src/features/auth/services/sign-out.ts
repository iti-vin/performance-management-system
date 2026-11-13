"use server";

import { cookies } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { SESSION_COOKIE } from "./session-cookie";

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login", RedirectType.replace);
}
