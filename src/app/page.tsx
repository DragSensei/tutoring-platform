import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/card';
import { Button } from '@/shared/components/button';

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Next.js Tutoring Platform
        </h1>
        <p className="text-slate-600">
          Feature-Driven Unidirectional Architecture with strict ESLint boundaries, Neon PostgreSQL,
          Gadwal timetable management, and automated 4-hour check-ins.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow border-slate-200">
          <CardHeader>
            <div className="text-3xl mb-2">⚡</div>
            <CardTitle>Admin Gadwal & Wallets</CardTitle>
            <CardDescription>
              Schedule Private (500 EGP) & Group (375 EGP) sessions, top up student wallets, and review overdraft flags.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/gadwal" className="block">
              <Button variant="primary" className="w-full">
                Open Gadwal Timetable
              </Button>
            </Link>
            <Link href="/admin/wallets" className="block">
              <Button variant="outline" className="w-full">
                Manage Student Wallets
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-slate-200">
          <CardHeader>
            <div className="text-3xl mb-2">👨‍🏫</div>
            <CardTitle>Tutor Abstraction</CardTitle>
            <CardDescription>
              Zero manual roster duties. View your session agenda, copy token check-in links, and inspect monthly/lifetime KPIs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/tutor/agenda" className="block">
              <Button variant="primary" className="w-full">
                View Tutor Agenda & KPIs
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-slate-200">
          <CardHeader>
            <div className="text-3xl mb-2">💳</div>
            <CardTitle>Student Wallet & Check-in</CardTitle>
            <CardDescription>
              Animated live balance counter, credit/post-paid overdraft support, immutable transaction history, and 4-hour check-ins.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/student/wallet" className="block">
              <Button variant="primary" className="w-full">
                Open Student Wallet
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
