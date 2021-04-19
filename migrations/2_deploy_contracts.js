const JankenToken = artifacts.require("JankenToken");

module.exports = (deployer, _network, accounts) => {
  const master = accounts[0];
  const host = accounts[1];
  const guest = accounts[2];

  deployer.deploy(JankenToken);
};
