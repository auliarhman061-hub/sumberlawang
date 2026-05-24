import { redirect } from "next/navigation";
import OnboardingClient from "./OnboardingClient";

// This is a server component that forces dynamic rendering
export const dynamic = "force-dynamic";

export default async function Page() {
  return <OnboardingClient />;
}
