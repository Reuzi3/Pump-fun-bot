require('dotenv').config();
const WebSocket = require('ws');
const axios = require('axios');
const {
    Keypair,
    Connection,
    clusterApiUrl,
    VersionedTransaction,
    sendAndConfirmRawTransaction,
} = require('@solana/web3.js');
const blessed = require('blessed');
const fs = require('fs');
const bs58 = require('bs58');

// configs
const API_KEY = process.env.API_KEY || 'YOUR_API_KEY_HERE';
const SOLANA_WALLET_PATH = process.env.SOLANA_WALLET_PATH;
const MINIMUM_BUY_AMOUNT = parseFloat(process.env.MINIMUM_BUY_AMOUNT || 0.015);
const PROFIT_TARGET = parseFloat(process.env.PROFIT_TARGET || 1.25);
const PRIORITY_FEE_BASE = parseFloat(process.env.PRIORITY_FEE_BASE || 0.0005);
const SLIPPAGE = parseFloat(process.env.SLIPPAGE || 5);
const POOL = process.env.POOL || 'pump';
const RPC_ENDPOINT = process.env.RPC_ENDPOINT || clusterApiUrl('mainnet-beta');

// Lista para armazenar tokens inválidos
const invalidTokens = new Set();

// Carregar chave privada do arquivo
let payer;
try {
    const keypair = fs.readFileSync(SOLANA_WALLET_PATH, 'utf8');
    const keypairArray = JSON.parse(keypair);
    if (Array.isArray(keypairArray)) {
        payer = Keypair.fromSecretKey(Uint8Array.from(keypairArray));
        console.log('Chave privada carregada do arquivo keypair.');
    } else {
        throw new Error('Formato de keypair inválido');
    }
} catch (error) {
    console.error('Erro ao ler o keypair da carteira Solana:', error.message);
    process.exit(1);
}

// Terminal visual
const screen = blessed.screen();
const logBox = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: '70%',
    label: 'Log',
    content: '',
    tags: true,
    border: { type: 'line' },
    style: { fg: 'green', border: { fg: 'blue' } },
});
screen.append(logBox);
screen.key(['escape', 'q', 'C-c'], () => process.exit(0));
screen.render();

const log = (message) => {
    logBox.setContent(logBox.getContent() + '\n' + message);
    screen.render();
};

// sign transation
const getUnsignedTransaction = async (action, mint, amount) => {
    const url = 'https://pumpportal.fun/api/trade-local';
    const data = {
        publicKey: payer.publicKey.toBase58(),
        action,
        mint,
        amount: amount.toString(),
        denominatedInSol: 'true',
        slippage: SLIPPAGE,
        priorityFee: PRIORITY_FEE_BASE,
        pool: POOL,
    };

    try {
        log(`Solicitando transação não assinada para ${action} do token: ${mint}`);
        const response = await axios.post(url, data, { headers: { 'Content-Type': 'application/json' } });
        log(`Resposta da API: ${JSON.stringify(response.data)}`);
        if (response.data && response.data.transaction) {
            return response.data.transaction;
        } else if (response.data && response.data.base64) {
            return response.data.base64;
        } else {
            throw new Error(`Resposta inesperada da API: ${JSON.stringify(response.data)}`);
        }
    } catch (error) {
        log(`Erro ao obter transação não assinada: ${error.message}`);
        if (error.response) {
            log(`Detalhes da resposta da API: ${JSON.stringify(error.response.data)}`);
        }
        return null;
    }
};

const signAndSendTransaction = async (unsignedTxBase64) => {
    try {
        const transactionBuffer = Buffer.from(unsignedTxBase64, 'base64');
        const transaction = VersionedTransaction.deserialize(transactionBuffer);
        transaction.sign([payer]);

        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        const serializedTransaction = transaction.serialize();
        const txHash = await sendAndConfirmRawTransaction(connection, serializedTransaction);

        log(`Transação enviada com sucesso! Hash: ${txHash}`);
        return txHash;
    } catch (error) {
        log(`Erro ao assinar/enviar a transação: ${error.message}`);
        return null;
    }
};

// Função para executar a negociação
const executeTrade = async (action, mint, amount) => {
    const unsignedTx = await getUnsignedTransaction(action, mint, amount);
    if (unsignedTx) {
        const txHash = await signAndSendTransaction(unsignedTx);
        return txHash;
    }
    return null;
};

// WebSocket monitoring tokens
const connectWebSocket = () => {
    const ws = new WebSocket('wss://pumpportal.fun/api/data');

    ws.on('open', () => {
        log('WebSocket conectado.');
        ws.send(JSON.stringify({ method: 'subscribeNewToken' }));
        log('Assinatura para novos tokens enviada.');
    });

    ws.on('message', async (data) => {
        const message = JSON.parse(data);
        log(`Novo token detectado: ${JSON.stringify(message)}`);

        if (message && message.mint && !invalidTokens.has(message.mint)) {
            log(`Tentando comprar o token: ${message.mint}`);
            const buyResult = await executeTrade('buy', message.mint, MINIMUM_BUY_AMOUNT);

            if (buyResult) {
                log(`Compra concluída para ${message.mint}. Monitorando para venda...`);

                setTimeout(async () => {
                    const sellAmount = MINIMUM_BUY_AMOUNT * PROFIT_TARGET;
                    const sellResult = await executeTrade('sell', message.mint, sellAmount);

                    if (sellResult) {
                        const profit = (sellAmount - MINIMUM_BUY_AMOUNT).toFixed(3);
                        log(`Venda concluída! Lucro: ${profit} SOL`);
                    } else {
                        log(`Falha ao vender o token ${message.mint}.`);
                    }
                }, 5000);
            } else {
                log(`Token inválido detectado: ${message.mint}. Adicionando à lista de exclusão.`);
                invalidTokens.add(message.mint);
            }
        }
    });

    ws.on('error', (err) => log(`Erro no WebSocket: ${err.message}`));

    ws.on('close', () => {
        log('WebSocket desconectado. Tentando reconectar...');
        setTimeout(connectWebSocket, 5000);
    });
};

// start
(async () => {
    log('Bot iniciado. Monitorando novos tokenss...');
    connectWebSocket();
})();