import type { Metadata } from "next";
import { LoginForm } from "@/components/auth-forms";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Social Cleaner to review and clean up your public digital footprint.",
};

export default function LoginPage() {
  return <LoginForm />;
}
