const JankenTokenContract = artifacts.require("JankenToken");
const GameBankContract = artifacts.require("GameBank");
const GameFactoryContract = artifacts.require("GameFactory");
const { MINT_AMOUNT, BET_AMOUNT, HAND, SALT, getHashedHand } = require("./helper");

contract("GameFactory", accounts => {
  const master = accounts[0];
  const host = accounts[1];
  const hostHand = HAND.Rock;
  const hostHandHashed = getHashedHand(hostHand, SALT);

  let factory;
  let jankenToken;
  let gameBank;

  beforeEach(async () => {
    jankenToken = await JankenTokenContract.new();
    gameBank = await GameBankContract.new(jankenToken.address);
    factory = await GameFactoryContract.new(gameBank.address);
  });

  describe("fail to create game", () => {
    it("throws an error when bet amount does not exceeds minimum", async () => {
      try {
        await factory.createGame(BET_AMOUNT - 1, hostHandHashed, { from: host });
        assert.fail("cannot create game");
      } catch (e) {
        const expected = "requried minimum bet amount";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });

    it("throws an error because of insufficient deposited tokens", async () => {
      try {
        await factory.createGame(BET_AMOUNT, hostHandHashed, { from: host });
        assert.fail("cannot create game");
      } catch (e) {
        const expected = "Insufficient tokens deposited in GameBank";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });
  });

  describe("success to create game", () => {
    beforeEach(async () => {
      await jankenToken.mint(host, MINT_AMOUNT, { from: master });
      await jankenToken.approve(gameBank.address, BET_AMOUNT, { from: host });
      await gameBank.depositToken(BET_AMOUNT, { from: host });
    });

    it("create new game", async () => {
      const tx = await factory.createGame(BET_AMOUNT, hostHandHashed, { from: host });
      const gameId = tx.logs[0].args.gameId.toNumber();
      const game = await factory._games(gameId);
      assert(game, "game should be present");;
    });

    it("emits the GameCreated event", async () => {
      tx = await factory.createGame(BET_AMOUNT, hostHandHashed, { from: host });
      const actual = tx.logs[0].event;
      const expected = "GameCreated";
      assert.equal(actual, expected, "events should match");
    });
  });
});
