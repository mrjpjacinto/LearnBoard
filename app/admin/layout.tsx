import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-slate-100">

      <div className="flex min-h-screen">

        <AdminSidebar />

        <div className="min-w-0 flex-1">
          {children}
        </div>

      </div>

    </div>
  );
}