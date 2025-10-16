import axios from 'axios';
import { NextResponse } from 'next/server';

export async function POST() {
  const apiKey = process.env.TATUM_API_KEY;
  const testnet = true; // Change to false for mainnet

  try {
    // For BEP20 (BSC)
    const bscResponse = await axios.get(`https://api.tatum.io/v3/bsc/wallet?testnet=${testnet}`, {
      headers: { 'x-api-key': apiKey },
    });
    const bscWallet = bscResponse.data;

    // For TRC20 (TRON)
    const tronResponse = await axios.get(`https://api.tatum.io/v3/tron/wallet?testnet=${testnet}`, {
      headers: { 'x-api-key': apiKey },
    });
    const tronWallet = tronResponse.data;

    // Log or add to .env manually: BEP20_MNEMONIC=bscWallet.mnemonic, BEP20_XPUB=bscWallet.xpub, etc.
    console.log('BEP20 Wallet:', bscWallet);
    console.log('TRC20 Wallet:', tronWallet);

    return NextResponse.json({ success: true, bscWallet, tronWallet });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}