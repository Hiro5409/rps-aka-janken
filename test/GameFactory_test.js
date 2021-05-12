const JankenTokenContract = artifacts.require("JankenToken");
const GameBankContract = artifacts.require("GameBank");
const GameFactoryContract = artifacts.require("GameFactory");
const { MINT_AMOUNT, BET_AMOUNT, HAND, SALT, getHashedHand, STATUS } = require("./helper");

contract("GameFactory", accounts => {
  const master = accounts[0];
  const host = accounts[1];
  const guest = accounts[2];
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

  describe("fail to join game", () => {
    let gameId;

    beforeEach(async () => {
      await jankenToken.mint(host, MINT_AMOUNT, { from: master });
      await jankenToken.approve(gameBank.address, BET_AMOUNT, { from: host });
      await gameBank.depositToken(BET_AMOUNT, { from: host });

      const tx = await factory.createGame(BET_AMOUNT, hostHandHashed, { from: host });
      gameId = tx.logs[0].args.gameId.toNumber();
    });

    it("throws an error when called by host", async () => {
      try {
        await factory.joinGame(gameId, HAND.Paper, { from: host });
        assert.fail("host cannot join");
      } catch (e) {
        const expected = "host of this game is not authorized";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });

    it("throws an error when guest's deposited tokens is insufficient", async () => {
      try {
        await factory.joinGame(gameId, HAND.Paper, { from: guest });
        assert.fail("cannot join before deposit");
      } catch (e) {
        const expected = "Insufficient tokens deposited in GameBank";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });

    it("throws an error when game status is invalid", async () => {
      await jankenToken.mint(guest, MINT_AMOUNT, { from: master });
      await jankenToken.approve(gameBank.address, BET_AMOUNT, { from: guest });
      await gameBank.depositToken(BET_AMOUNT, { from: guest });
      await factory.joinGame(gameId, HAND.Paper, { from: guest });

      try {
        await factory.joinGame(gameId, HAND.Paper, { from: guest });
        assert.fail('cannot join game that has invalid status');
      } catch (e) {
        const expected = "status is invalid, required Created";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });
  });

  describe("success to join game", () => {
    let gameId;

    beforeEach(async () => {
      await jankenToken.mint(host, MINT_AMOUNT, { from: master });
      await jankenToken.mint(guest, MINT_AMOUNT, { from: master });
      await jankenToken.approve(gameBank.address, BET_AMOUNT, { from: host });
      await jankenToken.approve(gameBank.address, BET_AMOUNT, { from: guest });
      await gameBank.depositToken(BET_AMOUNT, { from: host });
      await gameBank.depositToken(BET_AMOUNT, { from: guest });

      const tx = await factory.createGame(BET_AMOUNT, hostHandHashed, { from: host });
      gameId = tx.logs[0].args.gameId.toNumber();
    });

    it("join the game after deposit", async () => {
      await factory.joinGame(gameId, HAND.Paper, { from: guest });
      const game = await factory._games(gameId);
      const expected = HAND.Paper;
      const actual = game.guestHand.toNumber();
      assert.equal(actual, expected, "hand should be same");
    });

    it("emits the GameJoined event", async () => {
      const tx = await factory.joinGame(gameId, HAND.Paper, { from: guest });
      const actual = tx.logs[0].event;
      const expected = "GameJoined";
      assert.equal(actual, expected, "events should match");
    });

    it("change game status from Created to Joined", async () => {
      const prevStatus = (await factory._games(gameId)).status.toNumber();
      assert.equal(prevStatus, STATUS.Created, "status should be Created");

      await factory.joinGame(gameId, HAND.Paper, { from: guest });

      const nextStatus = (await factory._games(gameId)).status.toNumber();
      assert.equal(nextStatus, STATUS.Joined, "status should be Joined");
    });
  });
});
