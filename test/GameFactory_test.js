const JankenTokenContract = artifacts.require("JankenToken");
const GameBankContract = artifacts.require("GameBank");
const GameFactoryContract = artifacts.require("GameFactory");
const GameContract = artifacts.require("Game");

const Hand = {
  Rock: 0,
  Paper: 1,
  Scissors: 2,
};

contract("GameFactory", accounts => {
  const master = accounts[0];
  const host = accounts[1];
  const hostHand = Hand.Rock;
  const salt = web3.utils.toHex('Thank you.');
  const hostHandHashed = web3.utils.soliditySha3(
    {
      type: 'uint8',
      value: hostHand,
    },
    {
      type: 'bytes32',
      value: salt,
    }
  );

  let factory;
  let jankenToken;
  let gameBank;
  const mintAmount = 100;
  const betAmount = 5;

  beforeEach(async ()=>{
    jankenToken = await JankenTokenContract.new();
    gameBank = await GameBankContract.new(jankenToken.address);
    factory = await GameFactoryContract.new();
  });

  describe("insufficient deposit funds", () => {
    it("throws an error by insufficient deposit funds", async () => {
      try {
        await factory.createGame(gameBank.address, betAmount, hostHandHashed, { from: host });
      } catch (e) {
        const expected = "Insufficient token deposited in GameBank";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });
  });

  describe("sufficient deposit funds", () => {
    beforeEach(async () => {
      await jankenToken.mint(host, mintAmount,{ from: master });
      await jankenToken.approve(gameBank.address, betAmount, { from: host });
      await gameBank.depositToken(betAmount, { from: host });
    });

    it("create new game", async () => {
      await factory.createGame(gameBank.address, betAmount, hostHandHashed, { from: host });
      const games = await factory.games();
      game = await GameContract.at(games[0]);
      assert(game, "instance of Game should be present");;
    });

    it("emits the GameCreated event", async () => {
      tx = await factory.createGame(gameBank.address, betAmount, hostHandHashed, { from: host });
      const actual = tx.logs[0].event;
      const expected = "GameCreated";
      assert.equal(actual, expected, "events should match");
    });
  });
});
