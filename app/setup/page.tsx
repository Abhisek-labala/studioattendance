'use client';

import React, { useActionState } from 'react';
import Link from 'next/link';
import { Camera, ShieldAlert, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';
import { initialSetupAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SetupPage() {
  const [state, formAction, isPending] = useActionState(initialSetupAction, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl overflow-hidden bg-slate-900 shadow-xl shadow-slate-900/20 border border-amber-500/30">
            <img src="/logo.svg" alt="Studio GFX Logo" className="h-full w-full object-contain p-1" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Studio GFX Photography
          </h1>
          <p className="text-xs uppercase tracking-widest text-amber-700 font-semibold">
            One-Time Administrator Bootstrap
          </p>
        </div>

        <Card className="border-slate-200 shadow-xl bg-white">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800">
              Create Studio Owner / Admin Account
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Welcome to your newly deployed Studio GFX management platform. Create your secure master administrator account to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {state?.error && (
              <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <div>
                  <p className="font-semibold">{state.error}</p>
                </div>
              </div>
            )}

            <form action={formAction} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Full Name</label>
                <Input
                  type="text"
                  name="fullName"
                  placeholder="e.g. Master Administrator"
                  required
                />
                {state?.fieldErrors?.fullName && (
                  <p className="text-xs text-red-600">{state.fieldErrors.fullName[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Administrator Email</label>
                <Input
                  type="email"
                  name="email"
                  placeholder="admin@studiogfx.com"
                  required
                />
                {state?.fieldErrors?.email && (
                  <p className="text-xs text-red-600">{state.fieldErrors.email[0]}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Password</label>
                  <Input
                    type="password"
                    name="password"
                    placeholder="Min 8 characters"
                    required
                  />
                  {state?.fieldErrors?.password && (
                    <p className="text-xs text-red-600">{state.fieldErrors.password[0]}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Confirm Password</label>
                  <Input
                    type="password"
                    name="confirmPassword"
                    placeholder="Re-enter password"
                    required
                  />
                  {state?.fieldErrors?.confirmPassword && (
                    <p className="text-xs text-red-600">{state.fieldErrors.confirmPassword[0]}</p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 transition-all shadow-md mt-4"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Initializing System...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Complete Setup & Launch Dashboard
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link href="/login" className="text-xs text-slate-500 hover:text-slate-800 hover:underline">
            Already have an account? Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

