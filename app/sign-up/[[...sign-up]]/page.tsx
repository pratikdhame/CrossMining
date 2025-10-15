'use client';
import { SignUp } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SignUpPageContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref') || '';

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-4 text-center">Sign Up</h1>
        <SignUp
          path="/sign-up"
          signInUrl="/sign-in"
          afterSignUpUrl="/dashboard"
          unsafeMetadata={ref ? { referrerId: ref } : undefined}
        />
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignUpPageContent />
    </Suspense>
  );
}