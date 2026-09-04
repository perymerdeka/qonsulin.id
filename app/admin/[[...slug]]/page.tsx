import AdminApp from "@/components/AdminApp";
import { cookies } from "next/headers";
import { adminCookieName, verifyAdminSessionValue } from "@/lib/server/admin-auth";

type AdminPageProps = { params: Promise<{ slug?: string[] }> };

export default async function AdminPage({ params }: AdminPageProps) {
  const { slug = [] } = await params;
  const cookieStore = await cookies();
  const isAuthenticated = verifyAdminSessionValue(cookieStore.get(adminCookieName)?.value);

  return <AdminApp initialSlug={slug} initialAuthenticated={isAuthenticated} />;
}
