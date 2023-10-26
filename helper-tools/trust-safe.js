// WARNING: This script is meant to be executed only for LOCAL!!!
require('dotenv').config();

const CirclesCore = require('@circles/core');
const { randomUUID } = require('crypto');
const { ethers } = require('ethers');

const REQUIRED_TRUSTS_NUMBER = 3;
const ethProvider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const accounts = (require('./accounts.json').slice(0, 3)).map((key) => new ethers.Wallet(key, ethProvider));
const {
  contracts: { safeMaster, proxyFactory },
  options: { fallbackHandlerAddress, proxyFactoryAddress, safeMasterAddress },
  safe,
  token,
  trust,
  utils,
} = new CirclesCore.default(ethProvider, {
  apiServiceEndpoint: process.env.API_SERVICE_ENDPOINT,
  fallbackHandlerAddress: process.env.SAFE_DEFAULT_CALLBACK_HANDLER,
  graphNodeEndpoint: process.env.GRAPH_NODE_ENDPOINT,
  hubAddress: process.env.HUB_ADDRESS,
  pathfinderServiceEndpoint: process.env.PATHFINDER_SERVICE_ENDPOINT,
  pathfinderType: process.env.PATHFINDER_TYPE,
  proxyFactoryAddress: process.env.PROXY_FACTORY_ADDRESS,
  relayServiceEndpoint: process.env.RELAY_SERVICE_ENDPOINT,
  safeMasterAddress: process.env.SAFE_ADDRESS,
  subgraphName: process.env.SUBGRAPH_NAME,
  multiSendAddress: process.env.MULTI_SEND_ADDRESS,
  multiSendCallOnlyAddress: process.env.MULTI_SEND_CALL_ONLY_ADDRESS,
});

async function onboardAccountManually({ account, nonce }) {
  const safeAddress = await safe.predictAddress(account, { nonce });
  const { data: initializer } = await safeMaster.populateTransaction
    .setup(
      [account.address],
      1,
      ethers.constants.AddressZero,
      '0x',
      fallbackHandlerAddress,
      ethers.constants.AddressZero,
      0,
      ethers.constants.AddressZero,
    );
  const { data } = await proxyFactory.populateTransaction
    .createProxyWithNonce(
      safeMasterAddress,
      initializer,
      nonce,
    );

  return utils
    .sendTransaction({ target: proxyFactoryAddress, data })
    .then(() => token.deploy(account, { safeAddress }))
    .then(() => safeAddress);
}

(async () => {
  Promise.all(
    Array.from(Array(REQUIRED_TRUSTS_NUMBER).keys()).map((index) =>
      onboardAccountManually({ account: accounts[index], nonce: Buffer.from(randomUUID()).readUInt32BE(0) }),
    ),
  ).then(predeployedSafes => Promise.all(
    predeployedSafes.map((predeployedAddress, index) =>
      trust.addConnection(accounts[index], {
        canSendTo: predeployedAddress,
        user: process.argv[3],
      }),
    ),
  )).then(() => console.log('Safe address trusted succesfully!'));
})();
