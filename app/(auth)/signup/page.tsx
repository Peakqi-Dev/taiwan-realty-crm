import { redirect } from "next/navigation";

// /signup is now an alias for /beta — the LINE-first onboarding makes the
// standalone email signup form unnecessary.
export default function SignupRedirect() {
  redirect("/beta");
}
