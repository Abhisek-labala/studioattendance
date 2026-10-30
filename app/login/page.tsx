'use client';

import React, { useState, useActionState, useEffect } from 'react';
import Link from 'next/link';
import { Camera, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Eye, EyeOff, X, CheckCircle2, KeyRound, HelpCircle } from 'lucide-react';
import { loginAction, resetPasswordAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetState, resetFormAction, isResetPending] = useActionState(resetPasswordAction, null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  // If password reset succeeded, auto-close after brief delay or let user click
  useEffect(() => {
    if (resetState?.success) {
      // Keep the success banner visible until user clicks back or dismisses
    }
  }, [resetState]);

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
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
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
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors hover:underline focus:outline-none"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="bg-slate-50/50 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
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

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <KeyRound className="h-5 w-5 text-amber-400" />
                <div>
                  <h3 className="font-semibold text-sm text-white">Reset Password</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">

              {resetState?.success ? (
                <div className="space-y-4 py-2">
                  <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">Password Reset Successful!</p>
                      <p className="text-xs text-emerald-700 mt-1">
                        Your password has been updated. You can now log in with your new credentials.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium"
                  >
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <form action={resetFormAction} className="space-y-3.5">
                  {resetState?.error && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                      <p className="font-medium">{resetState.error}</p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Account Email Address *</label>
                    <Input
                      type="email"
                      name="email"
                      defaultValue={emailInput}
                      placeholder="e.g. admin@studiogfx.com"
                      required
                      className="text-xs bg-slate-50/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">New Password (min 8 characters) *</label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? 'text' : 'password'}
                        name="newPassword"
                        placeholder="Enter new password"
                        minLength={8}
                        required
                        className="text-xs bg-slate-50/50 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 focus:outline-none"
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Confirm New Password *</label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        placeholder="Re-enter new password"
                        minLength={8}
                        required
                        className="text-xs bg-slate-50/50 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 focus:outline-none"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowForgotModal(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isResetPending}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs"
                    >
                      {isResetPending ? 'Resetting...' : 'Set New Password'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
