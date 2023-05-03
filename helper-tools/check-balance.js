const fs = require('fs');
const path = require('path');

const Web3 = require('web3');
const TokenContract = require('circles-contracts/build/contracts/Token.json');

const ETHEREUM_NODE_WS = process.env.ETHEREUM_NODE_WS || 'wss://rpc.gnosischain.com/wss';
const BALANCES_FILE = path.join(__dirname, 'balances.json');
const safeAddress = ""

const provider = new Web3.providers.WebsocketProvider(
  ETHEREUM_NODE_WS,
);
const web3 = new Web3(provider);

try {
  fs.statSync(BALANCES_FILE);
} catch {
  console.error(`Please create a ${BALANCES_FILE} with the balances response from subgraph.`);
  process.exit(1);
}

const { data } = require(BALANCES_FILE);

async function checkBalanceToken(tokenAddress, safeAddress, amount) {
    const tokenContract = new web3.eth.Contract(TokenContract.abi, tokenAddress)
    const trueBalance = await tokenContract.methods.balanceOf(safeAddress).call();
    const isValid = Web3.utils.toBN(trueBalance).eq(Web3.utils.toBN(amount));
    return { trueBalance, isValid };
}

async function run() {
    if (!safeAddress || safeAddress=== ""){
        console.log('The safe address is missing');
    }
  const total = data.safe.balances.reduce((acc, curr) => acc.add(Web3.utils.toBN(curr.amount)), Web3.utils.toBN(0))
  console.log(`CHECK BALANCES FOR ${safeAddress}. With a total of ${data.safe.balances.length} tokens, ant total value of ${total}`);
  for (let bal of data.safe.balances) {
    const { trueBalance, isValid } = await checkBalanceToken(web3.utils.toChecksumAddress(bal.token.id), safeAddress, bal.amount);
    console.log(` The token ${bal.token.id} is correct? -> ${isValid ? 'OK' : 'ERROR'}`);
    if (!isValid) {
      console.log(`   Value in blockchain:   ${trueBalance}\n   Value in subgraph: ${bal.amount}`)
    }
  }
  console.log();
}

run();