import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth-forms";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your private Social Cleaner profile and inventory your public digital footprint.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
