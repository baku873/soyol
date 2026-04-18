/**
 * ConnectionOverlay Component
 * Displays connection status overlays for different room states:
 * connecting, reconnecting, error, and permission denied.
 */

'use client';

import { Loader2, WifiOff, AlertTriangle, VideoOff, RefreshCcw } from 'lucide-react';
import type { ConnectionState, PermissionError } from '@/types/video-call';

interface ConnectionOverlayProps {
  connectionState: ConnectionState;
  error: string | null;
  permissionError: PermissionError | null;
  onRetry?: () => void;
  onLeave?: () => void;
}

export default function ConnectionOverlay({
  connectionState,
  error,
  permissionError,
  onRetry,
  onLeave,
}: ConnectionOverlayProps) {
  // Permission denied state
  if (permissionError) {
    return (
      <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-amber-500/20 rounded-3xl flex items-center justify-center mx-auto">
            <VideoOff className="w-10 h-10 text-amber-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Камер / микрофон зөвшөөрөл
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              {permissionError.type === 'camera' &&
                'Камерын зөвшөөрөл шаардлагатай. Браузерийн тохиргооноос камерын зөвшөөрлийг нээнэ үү.'}
              {permissionError.type === 'microphone' &&
                'Микрофоны зөвшөөрөл шаардлагатай. Браузерийн тохиргооноос микрофоны зөвшөөрлийг нээнэ үү.'}
              {permissionError.type === 'both' &&
                'Камер болон микрофоны зөвшөөрөл шаардлагатай. Браузерийн тохиргооноос зөвшөөрөл нээнэ үү.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-6 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Дахин оролдох
              </button>
            )}
            {onLeave && (
              <button
                onClick={onLeave}
                className="px-6 py-3 bg-slate-700 text-white rounded-xl font-semibold hover:bg-slate-600 transition-colors"
              >
                Буцах
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Connecting state
  if (connectionState === 'connecting') {
    return (
      <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto relative">
            <Loader2 className="w-16 h-16 text-orange-500 animate-spin" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Холбогдож байна...</h2>
            <p className="text-slate-400 text-sm mt-1">Өрөөнд нэгдэж байна</p>
          </div>
        </div>
      </div>
    );
  }

  // Reconnecting state
  if (connectionState === 'reconnecting') {
    return (
      <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center">
        <div className="text-center space-y-4 bg-slate-800/80 p-8 rounded-3xl border border-white/10">
          <div className="w-16 h-16 mx-auto">
            <WifiOff className="w-16 h-16 text-amber-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Дахин холбогдож байна...</h2>
            <p className="text-slate-400 text-sm mt-1">
              Интернет холболт тасарсан. Автоматаар дахин холбогдож байна.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error / Failed state
  if (connectionState === 'failed' || error) {
    return (
      <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Холбогдож чадсангүй</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              {error || 'Алдаа гарлаа. Дахин оролдоно уу.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Дахин оролдох
              </button>
            )}
            {onLeave && (
              <button
                onClick={onLeave}
                className="px-6 py-3 bg-slate-700 text-white rounded-xl font-semibold hover:bg-slate-600 transition-colors"
              >
                Буцах
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
