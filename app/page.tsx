import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function RootPage(): Promise<never> {
  const session = await auth();
  if (session?.user) {
    redirect("/events");
  }
  redirect("/sign-in");
}
