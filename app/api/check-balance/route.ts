import axios from 'axios';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const { address, network } = await req.json();
  const apiKey = process.env.TATUM_API_KEY;

  try {
    let nativeBalance = '0';
    let tokenBalance = '0';

    if (network === 'BEP20') {
      // Get BNB balance
      const bnbRes = await axios.get(
        `https://api.tatum.io/v3/bsc/account/balance/${address}`,
        { headers: { 'x-api-key': apiKey } }
      );
      nativeBalance = (parseFloat(bnbRes.data.balance) / 1e18).toFixed(6);

      // Get USDT balance (testnet)
      const usdtRes = await axios.post(
        `https://api.tatum.io/v3/blockchain/token/balance`,
        {
          chain: 'BSC',
          address: address,
          contractAddress: '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd',
          testnetType: 'testnet'
        },
        { headers: { 'x-api-key': apiKey } }
      );
      tokenBalance = (parseFloat(usdtRes.data.balance) / 1e18).toFixed(6);
      
    } else if (network === 'TRC20') {
      // Get account data from Shasta testnet
      const accountRes = await axios.get(
        `https://api.shasta.trongrid.io/v1/accounts/${address}`
      );
      
      const account = accountRes.data.data[0];
      
      // Get TRX balance
      nativeBalance = account.balance 
        ? (account.balance / 1e6).toFixed(6) 
        : '0';
      
      // Get USDT balance
      if (account.trc20 && Array.isArray(account.trc20)) {
        for (const tokenObj of account.trc20) {
          const usdtBalance = tokenObj['TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs'];
          if (usdtBalance) {
            tokenBalance = (parseFloat(usdtBalance) / 1e6).toFixed(6);
            break;
          }
        }
      }
      
    } else {
      return NextResponse.json({ error: 'Invalid network' }, { status: 400 });
    }

    return NextResponse.json({ 
      nativeBalance, 
      tokenBalance,
      address,
      network
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}