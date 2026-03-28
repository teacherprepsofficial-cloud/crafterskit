import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import GaugeCalculator from "@/components/GaugeCalculator";

export const metadata = {
  title: "Gauge Calculator — CraftersKit",
  description: "Convert any knitting or crochet pattern to your gauge. Get new stitch counts, row counts, and yardage instantly.",
};

export default async function GaugeCalculatorPage() {
  const session = await auth();
  if (!session) redirect("/api/auth/signin");
  const username = ((session as any).username as string) ?? "";
  return <GaugeCalculator username={username} />;
}
