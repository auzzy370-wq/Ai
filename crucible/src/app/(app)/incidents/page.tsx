import { redirect } from "next/navigation";

/** Removed from product nav — keep URL from 404ing old bookmarks. */
export default function IncidentsRemoved() {
  redirect("/dashboard");
}
