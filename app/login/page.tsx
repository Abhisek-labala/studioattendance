'use client';

import React, { useActionState } from 'react';
import Link from 'next/link';
import { Camera, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { loginAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl overflow-hidden bg-slate-900 shadow-xl shadow-slate-900/20 border border-amber-500/30">
            <img src="/logo.svg" alt="Studio GFX Logo" className="h-full w-full object-contain p-1" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Studio GFX Photography
          </h1>
          <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
            Team Management System
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-200 shadow-xl bg-white/95 backdrop-blur">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Sign in to your account</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Enter your Studio GFX credentials to access your attendance and work register.
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
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  Email Address
                </label>
                <Input
                  type="email"
                  name="email"
                  placeholder="name@studiogfx.com"
                  autoComplete="email"
                  required
                  className="bg-slate-50/50"
                />
                {state?.fieldErrors?.email && (
                  <p className="text-xs text-red-600">{state.fieldErrors.email[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                    Password
                  </label>
                </div>
                <Input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="bg-slate-50/50"
                />
                {state?.fieldErrors?.password && (
                  <p className="text-xs text-red-600">{state.fieldErrors.password[0]}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 transition-all shadow-md mt-2"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Verifying...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Footer Notice */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 text-center">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Protected by Studio GFX Session Security & Rate Limiting</span>
        </div>
      </div>
    </div>
  );
}

