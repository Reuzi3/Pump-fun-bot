require('dotenv').config();
const axios = require('axios');
const { Keypair, Connection, clusterApiUrl } = require('@solana/web3.js');
const fs = require('fs');

const SOLANA_WALLET_PATH = process.env.SOLANA_WALLET_PATH;
const API_KEY = "8gupax3j9napcd2m6dr4gwtn8trk6kbae5qp6xtrcrw3ccbr9dap6dtbcn73jhuma14neuuga58p8ka7d1kkjn3u9nakey299xgjpxthe9hngnv8ed7mgh2dc9nqakahan0myyaca4ykua1p5axkachu5enjef58pwy229c6wwk2utn69654p23exhq6kk971w4yxbjctvkuf8";

let privateKey;
try {
    const keypair = fs.readFileSync(SOLANA_WALLET_PATH, 'utf8');
    const keypairArray = JSON.parse(keypair);
    if (Array.isArray(keypairArray)) {
        privateKey = Uint8Array.from(keypairArray);
        console.log('Chave privada carregada do arquivo keypair.');
    } else {
        throw new Error('Formato de keypair inválido');
    }
} catch (error) {
    console.error('Erro ao ler o keypair da carteira Solana:', error);
    process.exit(1);
}

const payer = Keypair.fromSecretKey(privateKey);
const connection = new Connection(clusterApiUrl('mainnet-beta'));

// Variáveis ajustáveis
const MINIMUM_BUY_AMOUNT = 0.015; // Quantidade mínima para comprar (em SOL)
const PRIORITY_FEE_BASE = 0.0003; // Taxa de prioridade
const SLIPPAGE = 5; // Slippage permitido (em %)

// Função para comprar tokens usando a API do PumpPortal
const pumpPortalBuy = async (mint, amount) => {
    const url = `https://pumpportal.fun/api/trade?api-key=${API_KEY}`;
    const data = {
        action: 'buy',
        mint,
        amount,
        denominatedInSol: true,
        slippage: SLIPPAGE,
        priorityFee: PRIORITY_FEE_BASE,
        pool: 'auto'
    };

    try {
        const response = await axios.post(url, data);
        console.log(`Compra realizada com sucesso! Detalhes:`, response.data);
        return response.data.tx_hash;
    } catch (error) {
        console.error('Erro ao executar compra:', error.message);
        if (error.response) {
            console.error('Status Code:', error.response.status);
            console.error('Detalhes:', error.response.data);
        }
        return null;
    }
};

// Função para vender tokens usando a API do PumpPortal
const pumpPortalSell = async (mint, amount) => {
    const url = `https://pumpportal.fun/api/trade?api-key=${API_KEY}`;
    const data = {
        action: 'sell',
        mint,
        amount,
        denominatedInSol: false,
        slippage: SLIPPAGE,
        priorityFee: PRIORITY_FEE_BASE,
        pool: 'auto'
    };

    try {
        const response = await axios.post(url, data);
        console.log(`Venda realizada com sucesso! Detalhes:`, response.data);
        return response.data.tx_hash;
    } catch (error) {
        console.error('Erro ao executar venda:', error.message);
        if (error.response) {
            console.error('Status Code:', error.response.status);
            console.error('Detalhes:', error.response.data);
        }
        return null;
    }
};

// Teste simples da API
(async () => {
    console.log('Iniciando teste da API...');
    const testMint = "7bXjBZM69fG9ez2YGHc5d7hdgUhJv8BEVZ6nSxTusjnG?handle=701326908d2c65ca1ea91"; // Substitua por um endereço válido de token
    const txHash = await pumpPortalBuy(testMint, MINIMUM_BUY_AMOUNT);
    if (txHash) {
        console.log(`Transação de compra realizada com sucesso: ${txHash}`);
    } else {
        console.log('Falha ao executar transação de compra.');
    }
})();
