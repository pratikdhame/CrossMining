import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const payload = await req.json();
    console.log('🔔 Tatum Webhook Payload:', JSON.stringify(payload, null, 2));

    const { 
      address,           // Recipient (your user's address)
      counterAddress,    // Sender
      amount, 
      asset,             // Token contract OR "TRON"/"BSC" for native
      txId, 
      chain,
      type,              // "trc20", "trc10", "native", "bep20", etc.
      subscriptionType 
    } = payload;

    // Only process token transfers (TRC20/BEP20), ignore native transfers
    if (type === 'native') {
      console.log('⏭️ Ignored native token transfer (TRX/BNB)');
      return NextResponse.json({ success: true, message: 'Native transfer ignored' });
    }

    const testnet = true;

    // Determine network and USDT contract
    let usdtContract, network;
    if (chain.includes('tron')) {
      usdtContract = testnet 
        ? 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs' 
        : 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
      network = 'TRC20';
    } else if (chain.includes('bsc') || chain.includes('bnb')) {
      usdtContract = testnet 
        ? '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd' 
        : '0x55d398326f99059ff775485246999027b3197955';
      network = 'BEP20';
    } else {
      console.log('❌ Unsupported chain:', chain);
      return NextResponse.json({ success: false, message: 'Unsupported chain' }, { status: 400 });
    }

    // Check if it's USDT (asset field contains the contract address)
    if (asset.toLowerCase() !== usdtContract.toLowerCase()) {
      console.log(`⏭️ Ignored non-USDT token. Expected: ${usdtContract}, Got: ${asset}`);
      return NextResponse.json({ success: true, message: 'Non-USDT token ignored' });
    }

    console.log('✅ USDT transfer detected!');

    // Find user by address
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { bep20Address: address },
          { trc20Address: address },
        ],
      },
    });

    if (!user) {
      console.log('❌ No user found for address:', address);
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    console.log('✅ User found:', user.id);

    const depositAmount = parseFloat(amount);

    if (isNaN(depositAmount) || depositAmount <= 0) {
      console.log('❌ Invalid amount:', amount);
      return NextResponse.json({ success: false, message: 'Invalid amount' }, { status: 400 });
    }

    // Check if transaction already processed (idempotency)
    const existingDeposit = await prisma.deposit.findFirst({
      where: { txHash: txId },
    });

    if (existingDeposit) {
      console.log('⚠️ Transaction already processed:', txId);
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    // Update balance and create deposit record atomically
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { balance: { increment: depositAmount } },
      }),
      prisma.deposit.create({
        data: {
          userId: user.id,
          network,
          address: address,
          amount: depositAmount,
          txHash: txId,
          confirmed: true,
        },
      }),
    ]);

    console.log(`✅ SUCCESS: Updated user ${user.id} balance by ${depositAmount} USDT`);
    console.log(`   Transaction: ${txId}`);
    console.log(`   From: ${counterAddress}`);
    console.log(`   To: ${address}`);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ WEBHOOK ERROR:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 });
  }
}