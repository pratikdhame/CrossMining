'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import { UserButton } from '@clerk/nextjs';

export default function ClientDepositComponent() {
  const [network, setNetwork] = useState('BEP20');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const generateAddress = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/generate-address', { network });
      setAddress(response.data.address);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Deposit USDT</h1>

      <select
        value={network}
        onChange={(e) => setNetwork(e.target.value)}
        className="border p-2"
      >
        <option>BEP20</option>
        <option>TRC20</option>
      </select>

      <button
        onClick={generateAddress}
        disabled={loading}
        className="ml-2 bg-blue-500 text-white p-2"
      >
        {loading ? 'Generating...' : 'Get Deposit Address'}
      </button>

      {address && (
        <div className="mt-4">
          <p>Your {network} Address: {address}</p>
          <QRCodeSVG value={address} size={128} />
          <p>Send USDT to this address. It will be added to your balance on confirmation.</p>
        </div>
      )}

      <UserButton afterSignOutUrl="/" />
    </div>
  );
}
