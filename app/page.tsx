import { auth } from "@/lib/auth";
import SearchInterface from "@/components/SearchInterface";

export default async function Home() {
  const session = await auth();
  const username = (session?.username as string) ?? null;
  return <SearchInterface username={username} />;
}
