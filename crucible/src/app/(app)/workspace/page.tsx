import { redirect } from "next/navigation";

/** Workspace list removed from nav — start problems from the bank instead. */
export default function WorkspaceIndexRemoved() {
  redirect("/challenges");
}
