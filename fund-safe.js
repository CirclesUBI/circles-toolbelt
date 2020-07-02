const Web3 = require('web3');

const accounts = require('./accounts.json');

const ETHEREUM_NODE_WS = 'ws://localhost:8545';

const provider = new Web3.providers.WebsocketProvider(
  ETHEREUM_NODE_WS,
);

const web3 = new Web3(provider);

if (process.argv.length === 2) {
  console.error('No receiver given');
  process.exit(1);
  return;
}

const receiver = process.argv[2];

const wallet = web3.eth.accounts.privateKeyToAccount(accounts[0]);

web3.eth.sendTransaction({
  from: wallet.address,
  to: receiver,
  value: web3.utils.toWei('1', 'ether'),
}).then(result => {
  console.log(`Funded Safe ${receiver}!`)
  process.exit(0);
});
