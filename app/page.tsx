import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";

export default async function Home() {
  const user = await currentUser();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <h1 className="text-3xl font-bold">Crypto Trading Platform</h1>
      {user ? (
        <>
          <p>Welcome, {user.emailAddresses[0].emailAddress}</p>
          <UserButton afterSignOutUrl="/" />
          <Link href="/dashboard" className="mt-4 text-blue-500">Go to Dashboard</Link>
        </>
      ) : (
        <>
          <Link href="/sign-in" className="mt-4 text-blue-500">Sign In</Link>
          <Link href="/sign-up" className="mt-2 text-blue-500">Sign Up</Link>
        </>
      )}
    </div>
  );
}