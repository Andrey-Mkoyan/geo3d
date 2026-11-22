import { redirect } from 'next/navigation';
import { getStaffOrNull } from '../../server/auth';
import { AdminClient } from '../../components/AdminClient';
import { logoutAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const staff = await getStaffOrNull();
  if (!staff) redirect('/admin/login');

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 flex items-center justify-end gap-3 text-xs text-neutral-500">
        <span>{staff.name}</span>
        <form action={logoutAction}>
          <button type="submit" className="underline hover:text-amber-600 cursor-pointer">
            Sign out
          </button>
        </form>
      </div>
      <AdminClient />
    </>
  );
}
