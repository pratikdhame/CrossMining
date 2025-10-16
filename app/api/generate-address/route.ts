import { auth } from '@clerk/nextjs/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { network } = await req.json();
  const apiKey = process.env.TATUM_API_KEY;
  const testnet = true;

  try {
    // Determine chain configuration
    let chain, xpub, addressField, indexField;
    if (network === 'BEP20') {
      chain = 'bsc';
      xpub = process.env.BEP20_XPUB;
      addressField = 'bep20Address';
      indexField = 'bep20Index';
    } else if (network === 'TRC20') {
      chain = 'tron';
      xpub = process.env.TRC20_XPUB;
      addressField = 'trc20Address';
      indexField = 'trc20Index';
    } else {
      return NextResponse.json({ error: 'Invalid network' }, { status: 400 });
    }

    // Check for existing address
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user[addressField]) {
      return NextResponse.json({ address: user[addressField] });
    }

    // Use transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      const maxIndex = await tx.user.aggregate({
        _max: { [indexField]: true },
      });
      const nextIndex = (maxIndex._max[indexField] || 0) + 1;

      // Generate address from Tatum
      const response = await axios.get(
        `https://api.tatum.io/v3/${chain}/address/${xpub}/${nextIndex}?testnet=${testnet}`,
        { headers: { 'x-api-key': apiKey } }
      );
      const { address } = response.data;

      // Update user atomically
      await tx.user.update({
        where: { id: userId },
        data: { [addressField]: address, [indexField]: nextIndex },
      });

      return { address, nextIndex };
    });

    // Subscribe to webhook using Tatum REST API directly
    try {
      const webhookUrl = process.env.TATUM_WEBHOOK_URL;
      
      if (!webhookUrl) {
        throw new Error('TATUM_WEBHOOK_URL not set in environment variables');
      }

      const subscriptionResponse = await axios.post(
        `https://api.tatum.io/v3/subscription`,
        {
          type: 'ADDRESS_TRANSACTION',
          attr: {
            address: result.address,
            chain: chain.toUpperCase(),
            url: webhookUrl,
          },
        },
        {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ Webhook registered:', {
        subscriptionId: subscriptionResponse.data.id,
        address: result.address,
        webhookUrl,
      });
    } catch (webhookError) {
      console.error('❌ Webhook subscription failed:', webhookError.response?.data || webhookError.message);
      // Address is still valid, continue
    }

    return NextResponse.json({ address: result.address });
  } catch (error) {
    console.error('❌ Address generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}