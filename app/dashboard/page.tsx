import { auth } from "@clerk/nextjs/server";

export default async function Dashboard() {
  const { userId } = await auth();

  if (!userId) {
    return <div>Please sign in</div>;
  }

  return <div className="p-4">Welcome to your dashboard!</div>;
}
