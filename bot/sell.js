require('dotenv').config();
const axios = require('axios');
const { Keypair, Connection, clusterApiUrl, PublicKey } = require('@solana/web3.js');
const { AccountLayout } = require('@solana/spl-token');
const fs = require('fs');

const API_KEY = process.env.API_KEY;
const SOLANA_WALLET_PATH = process.env.SOLANA_WALLET_PATH;

let privateKey;
try {
    const keypair = fs.readFileSync(SOLANA_WALLET_PATH, 'utf8');
    const keypairArray = JSON.parse(keypair);
    if (Array.isArray(keypairArray)) {
        privateKey = Uint8Array.from(keypairArray);
    } else {
        throw new Error('Invalid keypair format');
    }
} catch (error) {
    console.error('Error reading wallet file:', error);
    process.exit(1);
}

const payer = Keypair.fromSecretKey(privateKey);
const connection = new Connection(clusterApiUrl('mainnet-beta'));

// Função para buscar tokens na carteira
const fetchTokens = async () => {
    const tokenAccounts = await connection.getTokenAccountsByOwner(payer.publicKey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    });

    return tokenAccounts.value.map((account) => {
        const accountData = AccountLayout.decode(account.account.data);
        return {
            mint: new PublicKey(accountData.mint).toString(),
            amount: Number(accountData.amount) / 10 ** 6,
        };
    });
};

// Função para vender tokens
const sellAllTokens = async () => {
    const tokens = await fetchTokens();

    for (const token of tokens) {
        if (token.amount > 1) {
            const url = `https://pumpportal.fun/api/trade?api-key=${API_KEY}`;
            const data = {
                action: 'sell',
                mint: token.mint,
                amount: token.amount,
                denominatedInSol: false,
                slippage: 5,
            };

            try {
                const response = await axios.post(url, data);
                console.log(`Sold ${token.amount} of ${token.mint}. TX: ${response.data.tx_hash}`);
            } catch (error) {
                console.error(`Error selling ${token.mint}: ${error.message}`);
            }
        }
    }
};

sellAllTokens();
