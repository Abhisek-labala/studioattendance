'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  LogIn,
  LogOut,
  Lock,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { punchShiftAction } from '@/app/actions/attendance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatMinutes } from '@/lib/attendance/timing';

interface PunchCardProps {
  currentStaffId?: string;
  staffName?: string;
  todayRecord?: any;
  isAdmin: boolean;
  staffOptions?: Array<{ id: string; full_name: string; staff_code: string }>;
}

export function PunchCard({
  staffName,
  todayRecord: initialRecord,
}: PunchCardProps) {
  const [record, setRecord] = useState<any>(initialRecord);
  const [remarks, setRemarks] = useState(initialRecord?.remarks || '');
  const [customLocation, setCustomLocation] = useState<string>('');
  const [showEditLocation, setShowEditLocation] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [punchingType, setPunchingType] = useState<string | null>(null);

  // Live Digital Clock (IST)
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateFormatted, setCurrentDateFormatted] = useState<string>('');

  // Geolocation state
  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    status: 'detecting' | 'ready' | 'denied' | 'error';
    formattedText: string;
    fullAddress?: string;
  }>({
    latitude: null,
    longitude: null,
    accuracy: null,
    status: 'detecting',
    formattedText: 'Detecting location...',
  });

  useEffect(() => {
    if (initialRecord) {
      setRecord(initialRecord);
      if (initialRecord.remarks) setRemarks(initialRecord.remarks);
    }
  }, [initialRecord]);

  // Update real-time clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDateFormatted(
        now.toLocaleDateString('en-US', {
          timeZone: 'Asia/Kolkata',
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Request browser geolocation
  const fetchLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsLocation({
        latitude: null,
        longitude: null,
        accuracy: null,
        status: 'error',
        formattedText: 'Geolocation not supported',
      });
      return;
    }

    setGpsLocation((prev) => ({
      ...prev,
      status: 'detecting',
      formattedText: 'Detecting location...',
    }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy;
        const latFormatted = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
        const lngFormatted = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;

        setGpsLocation({
          latitude: lat,
          longitude: lng,
          accuracy: acc,
          status: 'ready',
          formattedText: `${latFormatted}, ${lngFormatted}`,
        });

        // Reverse geocode
        fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`)
          .then((res) => res.json())
          .then((geo) => {
            const addr = geo?.fullAddress || geo?.shortAddress;
            if (addr) {
              setGpsLocation({
                latitude: lat,
                longitude: lng,
                accuracy: acc,
                status: 'ready',
                formattedText: addr,
                fullAddress: addr,
              });
              setCustomLocation(addr);
            }
          })
          .catch(() => { });
      },
      (err) => {
        setGpsLocation({
          latitude: null,
          longitude: null,
          accuracy: null,
          status: err.code === 1 ? 'denied' : 'error',
          formattedText: err.code === 1 ? 'Location permission denied' : 'Location unavailable',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  // Handle shift punch
  const handlePunch = async (punchType: 'morning_in' | 'morning_out' | 'evening_in' | 'evening_out') => {
    setStatusMessage(null);
    setPunchingType(punchType);

    const locationName = customLocation.trim() || gpsLocation.fullAddress || gpsLocation.formattedText;

    startTransition(async () => {
      try {
        const res = await punchShiftAction(punchType, {
          latitude: gpsLocation.latitude,
          longitude: gpsLocation.longitude,
          accuracy: gpsLocation.accuracy,
          locationName,
          remarks: remarks.trim() || undefined,
        });

        if (res.success && res.record) {
          setRecord(res.record);
          const labels: Record<string, string> = {
            morning_in: 'Morning Login recorded',
            morning_out: 'Morning Logout recorded',
            evening_in: 'Evening Login recorded',
            evening_out: 'Evening Logout recorded',
          };
          setStatusMessage({
            type: 'success',
            text: labels[punchType] || 'Attendance recorded successfully',
          });
        } else {
          setStatusMessage({
            type: 'error',
            text: res.error || 'Failed to record punch.',
          });
        }
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          text: err.message || 'An unexpected error occurred.',
        });
      } finally {
        setPunchingType(null);
      }
    });
  };

  const formatPunchTime = (timeStr?: string | null) => {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const hour = parseInt(parts[0], 10);
    const min = parts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${min} ${ampm}`;
  };

  const mIn = record?.first_half_check_in;
  const mInLoc = record?.first_half_in_location;
  const mOut = record?.first_half_check_out;
  const mOutLoc = record?.first_half_out_location;

  const eIn = record?.second_half_check_in;
  const eInLoc = record?.second_half_in_location;
  const eOut = record?.second_half_check_out;
  const eOutLoc = record?.second_half_out_location;

  const totalWorkingMins = record?.total_working_minutes || 0;
  const computedStatus = record?.status || (mIn || eIn ? 'Present' : 'Not Punched');

  // Evening shift restrictions
  const now = new Date();
  const currentTotalMins =
    parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(now), 10) * 60 +
    parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', minute: 'numeric' }).format(now), 10);
  const isBeforeEveningWindow = currentTotalMins < 810; // Before 1:30 PM (13:30)
  const isMorningLogoutPending = Boolean(mIn && !mOut);
  const canPunchEveningIn = !eIn && !isMorningLogoutPending && !isBeforeEveningWindow;

  return (
    <Card className="border-slate-200 shadow-xs bg-white rounded-xl overflow-hidden">
      {/* 1. Sleek, Clean Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Attendance Punch</h2>
          <p className="text-xs text-slate-500">
            {staffName || 'Staff Member'} &middot; Biometric & GPS Verified
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Locked Date */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200">
            <Lock className="h-3 w-3 text-slate-500" />
            <span>{currentDateFormatted || 'Today'}</span>
          </div>

          {/* Live Digital Clock */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-emerald-400 font-mono font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{currentTime || '--:--'}</span>
          </div>
        </div>
      </div>

      <CardContent className="p-5 space-y-4">
        {/* 2. Compact Location Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="h-4 w-4 shrink-0 text-amber-600" />
            <span className="font-medium text-slate-800 truncate">
              {customLocation || gpsLocation.fullAddress || gpsLocation.formattedText}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-[11px]">
            <button
              type="button"
              onClick={fetchLocation}
              className="font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
        </div>

        {/* Optional Landmark Edit Input */}
        {showEditLocation && (
          <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/70 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
              <span>Specific Landmark / Studio Branch:</span>
              <span className="text-slate-400 font-normal">Optional</span>
            </div>
            <Input
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              placeholder="e.g. WME Church, Indira Nagar, Rayagada"
              className="h-8 text-xs bg-white"
            />
          </div>
        )}

        {/* Status Message Banner */}
        {statusMessage && (
          <div
            className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
              }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
        )}

        {/* 3. The Two Shifts: Clean & Minimal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* --- MORNING SHIFT --- */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Sun className="h-4 w-4 text-amber-500" />
                <span>Morning Shift</span>
                <span className="text-[11px] font-normal text-slate-400">(09:30 AM &ndash; 01:30 PM)</span>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {mIn && mOut ? 'Completed' : mIn ? 'In Progress' : 'Pending'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Morning In */}
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 flex flex-col justify-between h-24">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Login</span>
                  {mIn && <span className="text-emerald-600 font-semibold text-[10px]">Logged</span>}
                </div>

                {mIn ? (
                  <p className="text-lg font-bold font-mono text-slate-900">{formatPunchTime(mIn)}</p>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handlePunch('morning_in')}
                    disabled={isPending}
                    className="w-full h-8 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                  >
                    {punchingType === 'morning_in' ? 'Punching...' : 'Punch In'}
                  </Button>
                )}
              </div>

              {/* Morning Out */}
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 flex flex-col justify-between h-24">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Logout</span>
                  {mOut && <span className="text-blue-600 font-semibold text-[10px]">Logged</span>}
                </div>

                {mOut ? (
                  <p className="text-lg font-bold font-mono text-slate-900">{formatPunchTime(mOut)}</p>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handlePunch('morning_out')}
                    disabled={isPending || !mIn}
                    className="w-full h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium disabled:opacity-40"
                  >
                    {punchingType === 'morning_out' ? 'Punching...' : 'Punch Out'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* --- EVENING SHIFT --- */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Moon className="h-4 w-4 text-indigo-500" />
                <span>Evening Shift</span>
                <span className="text-[11px] font-normal text-slate-400">(02:30 PM &ndash; 06:30 PM)</span>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {eIn && eOut
                  ? 'Completed'
                  : eIn
                    ? 'In Progress'
                    : isMorningLogoutPending
                      ? 'Requires Morning Out'
                      : isBeforeEveningWindow
                        ? 'Opens 01:30 PM'
                        : 'Pending'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Evening In */}
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 flex flex-col justify-between h-24">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Login</span>
                  {eIn && <span className="text-emerald-600 font-semibold text-[10px]">Logged</span>}
                </div>

                {eIn ? (
                  <p className="text-lg font-bold font-mono text-slate-900">{formatPunchTime(eIn)}</p>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handlePunch('evening_in')}
                    disabled={isPending || !canPunchEveningIn}
                    title={
                      isMorningLogoutPending
                        ? 'Punch Morning Logout first'
                        : isBeforeEveningWindow
                          ? 'Opens at 01:30 PM'
                          : ''
                    }
                    className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-40"
                  >
                    {punchingType === 'evening_in' ? 'Punching...' : 'Punch In'}
                  </Button>
                )}
              </div>

              {/* Evening Out */}
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 flex flex-col justify-between h-24">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Logout</span>
                  {eOut && <span className="text-indigo-600 font-semibold text-[10px]">Logged</span>}
                </div>

                {eOut ? (
                  <p className="text-lg font-bold font-mono text-slate-900">{formatPunchTime(eOut)}</p>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handlePunch('evening_out')}
                    disabled={isPending || !eIn}
                    className="w-full h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium disabled:opacity-40"
                  >
                    {punchingType === 'evening_out' ? 'Punching...' : 'Punch Out'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Subtle Remarks Input */}
        <div className="pt-1">
          <Input
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Remarks or shoot notes (optional)"
            className="h-8 text-xs bg-slate-50 border-slate-200"
          />
        </div>

        {/* 5. Minimal Summary Footer */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <div>
              Status: <strong className="text-slate-800">{computedStatus}</strong>
            </div>
            <div>
              Logged Time: <strong className="text-slate-800 font-mono">{formatMinutes(totalWorkingMins)}</strong>
            </div>
          </div>

          <div className="text-[11px] text-slate-400">
            Punches are timestamped & GPS locked
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
