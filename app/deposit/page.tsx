import { currentUser } from '@clerk/nextjs/server';
import ClientDepositComponent from './ClientDepositComponent';

export default async function Deposit() {
  const user = await currentUser();
  if (!user) return <div>Please sign in</div>;

  return <ClientDepositComponent />;
}
