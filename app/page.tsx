import { auth, signIn } from "@/lib/auth";
import SearchInterface from "@/components/SearchInterface";

export default async function Home() {
  const session = await auth();

  if (!session) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">CraftersKit</h1>
          <p className="text-lg text-gray-500 mb-8">
            The craft companion that does your gauge math, reads your patterns,
            tracks your stash, and finds what you need — all in one place.
          </p>
          <form
            action={async () => {
              "use server";
              await signIn("ravelry");
            }}
          >
            <button
              type="submit"
              className="w-full bg-[#9b2335] hover:bg-[#7d1c2a] text-white font-semibold py-3 px-6 rounded-lg transition-colors text-lg"
            >
              Sign in with Ravelry
            </button>
          </form>
          <p className="text-sm text-gray-400 mt-4">
            Free to start. Connects to your existing Ravelry account.
          </p>
        </div>
      </main>
    );
  }

  return <SearchInterface username={session.username as string} />;
}
