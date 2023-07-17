const fetch = require('node-fetch');
const Web3 = require('web3');
const TokenContract = require('circles-contracts/build/contracts/Token.json');
const HubContract = require('circles-contracts/build/contracts/Hub.json');

const ETHEREUM_NODE_WS = process.env.ETHEREUM_NODE_WS || 'wss://rpc.gnosischain.com/wss';
HUB_ADDRESS = '0x29b9a7fBb8995b2423a71cC17cf9810798F6C543';
ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const safeAddress = "0x9BA1Bcd88E99d6E1E03252A70A63FEa83Bf1208c";

const provider = new Web3.providers.WebsocketProvider(
  ETHEREUM_NODE_WS,
);
const web3 = new Web3(provider);

async function checkBalanceToken(tokenAddress, safeAddress, amount) {
    const tokenContract = new web3.eth.Contract(TokenContract.abi, tokenAddress)
    const trueBalance = await tokenContract.methods.balanceOf(safeAddress).call();
    const isValid = Web3.utils.toBN(trueBalance).eq(Web3.utils.toBN(amount));
    return { trueBalance, isValid };
}

async function processSubGraphData(data) {
  return Promise.all(
    data.map(async (curr) => {
      let amount = curr.amount
      const tokenAddress = web3.utils.toChecksumAddress(curr.token.id)
      // check the balance is correct
      const { trueBalance, isValid } = await checkBalanceToken(tokenAddress, safeAddress, amount);
      if (!isValid) {
        console.log(` The token ${tokenAddress} is correct? -> 'ERROR'`);
        console.log(`   Value in blockchain:   ${trueBalance}\n   Value in subgraph: ${amount}`)
      }
      // Check if it's a circles token
      const hubContract = new web3.eth.Contract(HubContract.abi, HUB_ADDRESS)
      const tokenOwner = await hubContract.methods.tokenToUser(tokenAddress).call();
      if (tokenOwner === ZERO_ADDRESS) {
        amount = '0'
      }
      return {tokenAddress, amount};
    })
  );
}

async function getSubgraphData() {
  console.log("\n ---------------\nGet the Subgraph data");

  let balances = []
  const endpoint = 'https://api.thegraph.com/subgraphs/name/circlesubi/circles-ubi';
  const query = `{ safe(id: "${safeAddress.toLocaleLowerCase()}") { balances(first: 1000) { token { id } amount } } }`;

  async function fetchData(url) {
    return new Promise(async (resolve, reject) => {
      fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          query: query.replace(/(\r\n|\n|\r)/gm, ' '),
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then(res => res.json())
        .then(async (body) => {
          const { data } = body
          const allData = await processSubGraphData(data.safe.balances);
          const total = data.safe.balances.reduce((acc, curr) => acc.add(Web3.utils.toBN(curr.amount)), Web3.utils.toBN(0))
          console.log(`With a total value of ${total} CRC`);
          resolve(allData)
        })
    })
  }

  return await fetchData(endpoint)
}

async function processBlockscoutData(data) {
  return Promise.all(
    data.map(async (curr) => {
      let amount = curr.value
      const tokenAddress = curr.token.address
      // check the balance is correct
      const { trueBalance, isValid } = await checkBalanceToken(tokenAddress, safeAddress, amount);
      if (!isValid) {
        console.log(` The token ${tokenAddress} is correct? -> 'ERROR'`);
        console.log(`   Value in blockchain:   ${trueBalance}\n   Value in blockscout: ${amount}`)
      }
      // Check if it's a circles token
      const hubContract = new web3.eth.Contract(HubContract.abi, HUB_ADDRESS)
      const tokenOwner = await hubContract.methods.tokenToUser(tokenAddress).call();
      if (tokenOwner === ZERO_ADDRESS) {
        amount = '0'
      }
      return {tokenAddress, amount};
    })
  );
}

async function getBlockscoutData() {
  let data = []
  const endpoint = 'https://gnosis.blockscout.com/api/v2/addresses/0x9BA1Bcd88E99d6E1E03252A70A63FEa83Bf1208c/tokens?type=ERC-20';
  const startPath = '';
  console.log("\n --------------- \nGet the Blockscout data");

  async function fetchData(apiUrl) {
    return new Promise(async (resolve, reject) => {
      fetch(apiUrl)
        .then(res => res.json())
        .then(async (body) => {
          const { items, next_page_params } = body
          data = data.concat(items);
          // Check next API url is empty or not, if not empty call the above function 
          if(next_page_params != null) {
            resolve(await fetchData(`${endpoint}&items_count=${next_page_params.items_count}&id=${next_page_params.id}&value=${next_page_params.value}&fiat_value=${next_page_params.fiat_value}`))
          }
          else {
            const allData = await processBlockscoutData(data);
            const total = allData.reduce((acc, curr) => acc.add(Web3.utils.toBN(curr.amount)), Web3.utils.toBN(0))
            console.log(`With a total value of ${total} CRC`);
            resolve(allData)
          }
        })
    })
  }
  return await fetchData(`${endpoint}${startPath}`)
}

async function run(){
  console.log(`CHECK BALANCES OF CRC TOKENS FOR SAFE: ${safeAddress}.`);

  // Remove entries with 0 balance
  const dataBlockscout = (await getBlockscoutData()).filter(item => item.amount != 0)
  const dataBlockscoutTokens = dataBlockscout.map(x => x.tokenAddress)
  const dataSubgraph = (await getSubgraphData()).filter(item => item.amount != 0)
  const dataSubgraphTokens = dataSubgraph.map(x => x.tokenAddress)

  console.log(`\n --------------- \nLength of the subgraph data: ${dataSubgraph.length}`);
  console.log(`Length of the blockscout data: ${dataBlockscout.length}`);

  // Intersection
  console.log("\n --------------- \nIntersection of the datasets:");
  let intersection = dataSubgraphTokens.filter(x => dataBlockscoutTokens.includes(x));
  console.log(`Number of tokens from the subgraph dataset that are also in the blockscout dataset: ${intersection.length}`);
  let intersection2 = dataBlockscoutTokens.filter(x => dataSubgraphTokens.includes(x));
  console.log(`Number of tokens from the blockscout dataset that are also in the subgraph dataset: ${intersection2.length}`);

  // Difference
  console.log("\n --------------- \nDifference of the datasets::");
  let difference = dataSubgraphTokens.filter(x => !dataBlockscoutTokens.includes(x));
  console.log(`Number of tokens from the subgraph dataset that are NOT in the blockscout dataset: ${difference.length}`);
  let difference2 = dataBlockscoutTokens.filter(x => !dataSubgraphTokens.includes(x));
  console.log(`Number of tokens from the blockscout dataset that are NOT in the subgraph dataset: ${difference2.length}`);

  console.log(`\n --------------- \nToken that is not in the Blockscout dataset: ${difference}`); // 0x07ebeea7f9cb7c4f0e6dfc8c719ca9e43196b6f1
  // Token owner: 0xf2C84590E1771890004D2d6947aA8F85CFaA6b87

  const tokenContract = new web3.eth.Contract(TokenContract.abi, difference[0])
  const trueBalance = await tokenContract.methods.balanceOf('0x9BA1Bcd88E99d6E1E03252A70A63FEa83Bf1208c').call();
  console.log(`The balance of that token: ${trueBalance}`);

  process.exit(0)
}

run();
