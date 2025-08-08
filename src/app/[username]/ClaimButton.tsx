'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ClaimButtonProps {
  username: string;
  athleteName: string;
}

export default function ClaimButton({ username, athleteName }: ClaimButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isClaimed, setIsClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClaim = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/influencers/${username}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'claim' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim athlete');
      }

      setIsClaimed(true);
      // Optionally refresh the page or update parent component
      // window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  if (isClaimed) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="bg-green-100 border-green-300 text-green-800 cursor-default"
          disabled
        >
          ✓ Claimed
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant="default"
        className="bg-blue-600 hover:bg-blue-700"
        onClick={handleClaim}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Claiming...
          </div>
        ) : (
          'Claim Athlete'
        )}
      </Button>

      {error && (
        <div className="text-red-400 text-sm max-w-xs">
          {error}
        </div>
      )}
    </div>
  );
}
