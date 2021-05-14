const JankenToken = artifacts.require("JankenToken");
const GameBank = artifacts.require("GameBank");

const initialTokenAmount = 100;

module.exports = async (deployer, _network, accounts) => {
  const master = accounts[0];
  const host = accounts[1];
  const guest = accounts[2];

  await deployer.deploy(JankenToken);
  const jkt = await JankenToken.deployed();
  await jkt.mint(host, initialTokenAmount, { from: master });
  await jkt.mint(guest, initialTokenAmount, { from: master });

  await deployer.deploy(GameBank, jkt.address);
};
