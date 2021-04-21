const fs = require('fs');
const path = require('path');

const Web3 = require('web3');
const HubContract = require('circles-contracts/build/contracts/Hub.json');

const ETHEREUM_NODE_WS = process.env.ETHEREUM_NODE_WS || 'wss://dark-frosty-field.xdai.quiknode.pro';
const HUB_ADDRESS = process.env.HUB_ADDRESS || '0x29b9a7fBb8995b2423a71cC17cf9810798F6C543';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const TRANSFER_FILE = path.join(__dirname, 'transfer.json');

const provider = new Web3.providers.WebsocketProvider(
  ETHEREUM_NODE_WS,
);
const web3 = new Web3(provider);

try {
  fs.statSync(TRANSFER_FILE);
} catch {
  console.error(`Please create a ${TRANSFER_FILE} with the transfer steps.`);
  process.exit(1);
}

const transferSteps = require(TRANSFER_FILE);
const hubContract = new web3.eth.Contract(HubContract.abi, HUB_ADDRESS);

async function checkSendLimit(tokenOwner, sender, receiver, plannedLimit) {
  const limit = await hubContract.methods.checkSendLimit(tokenOwner, sender, receiver).call();
  const isValid = Web3.utils.toBN(plannedLimit).lte(Web3.utils.toBN(limit));
  return { limit, isValid };
}

async function run() {
  console.log(`CHECK TRANSFER WITH ${transfer.transferSteps.length} STEPS`);
  for (let step of transferSteps) {
    const { limit, isValid } = await checkSendLimit(step.tokenOwnerAddress, step.from, step.to, step.value);
    console.log(`${step.from} -> ${step.to} ${isValid ? 'OK' : 'ERROR'}`);
    if (!isValid) {
      console.log(`   Attempted amount:   ${step.value}\n   Actual max. amount: ${limit}`)
    }
  }
}

run();
