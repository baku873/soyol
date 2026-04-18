'use client';

import { Suspense } from 'react';
import VideoCall from '@/components/VideoCall';
import { Loader2 } from 'lucide-react';

function VideoCallLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto" />
        <p className="text-slate-600 font-medium">Уншиж байна...</p>
      </div>
    </div>
  );
}

export default function VideoCallPage() {
  return (
    <Suspense fallback={<VideoCallLoading />}>
      <VideoCall />
    </Suspense>
  );
}
