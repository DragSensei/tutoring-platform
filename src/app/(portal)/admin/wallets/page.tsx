import { getAllWalletsWithUsers } from '@/features/wallets/server/wallet-actions';
import { AdminWalletsClient } from './admin-wallets-client';

export const dynamic = 'force-dynamic';

export default async function AdminWalletsPage() {
  const wallets = await getAllWalletsWithUsers();
  return <AdminWalletsClient wallets={wallets} />;
}
