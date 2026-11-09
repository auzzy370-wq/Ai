import { redirect } from "next/navigation";

/** Legacy Clerk path — keep link compatibility. */
export default function LegacySignUp() {
  redirect("/register");
}
