const fs = require('fs');
const bs58 = require('bs58').default || require('bs58'); // Suporte a diferentes versões do bs58

// Substitua pela sua chave privada em Base58
const base58Key = '27QAGjbtUG1VXGdarZ7rUGWMfnr33G4VRA2WgH1hJmCZpr3npHQinbGmhEmS5vovxc7PW5NKsDDRZpPZ7dSGxkaD'; // Exemplo: '27QAGjbtUG1VXGdarZ7rUGWMfnr33G4VRZpr3npHQinbGmhEmS5vovxc7PW5NKsDDRZpPZ7dSGxkaD'

try {
    // Decodifique a chave privada do formato Base58 para um Uint8Array
    const decodedKey = bs58.decode(base58Key);

    // Converta o Uint8Array para um array de números inteiros e formate para JSON
    const jsonContent = JSON.stringify([...decodedKey], null, 4);

    // Salve o arquivo wallet.json no mesmo diretório
    fs.writeFileSync('wallet.json', jsonContent);

    console.log('✅ Arquivo wallet.json gerado com sucesso!');
    console.log('Conteúdo do arquivo wallet.json:');
    console.log(jsonContent);
} catch (error) {
    console.error('❌ Erro ao converter a chave privada:', error.message);
}
