const JankenTokenContract = artifacts.require("JankenToken");
const GameBankContract = artifacts.require("GameBank");
const GameFactoryContract = artifacts.require("GameFactory");
const {
  BET_AMOUNT,
  HAND,
  SALT,
  getHashedHand,
  STATUS,
  setupGame,
  FAKE_SALT,
  createGame,
} = require("./helper");

contract("GameFactory", accounts => {
  const master = accounts[0];
  const host = accounts[1];
  const guest = accounts[2];
  const hostHand = HAND.Rock;
  const hostHandHashed = getHashedHand(hostHand, SALT);
  const guestHand = HAND.Paper;

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
      await setupGame({ jankenToken, gameBank, master, user: host });
    });

    it("create new game", async () => {
      const gameId = await createGame({ factory, hostHandHashed, host });
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
      await setupGame({ jankenToken, gameBank, master, user: host });
      gameId = await createGame({ factory, hostHandHashed, host });
    });

    it("throws an error when called by host", async () => {
      try {
        await factory.joinGame(gameId, guestHand, { from: host });
        assert.fail("host cannot join");
      } catch (e) {
        const expected = "host of this game is not authorized";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });

    it("throws an error when guest's deposited tokens is insufficient", async () => {
      try {
        await factory.joinGame(gameId, guestHand, { from: guest });
        assert.fail("cannot join before deposit");
      } catch (e) {
        const expected = "Insufficient tokens deposited in GameBank";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });

    it("throws an error when game status is invalid", async () => {
      await setupGame({ jankenToken, gameBank, master, user: guest });
      await factory.joinGame(gameId, guestHand, { from: guest });

      try {
        await factory.joinGame(gameId, guestHand, { from: guest });
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
      await setupGame({ jankenToken, gameBank, master, user: host });
      await setupGame({ jankenToken, gameBank, master, user: guest });
      gameId = await createGame({ factory, hostHandHashed, host });
    });

    it("join the game after deposit", async () => {
      await factory.joinGame(gameId, guestHand, { from: guest });
      const game = await factory._games(gameId);
      const expected = guestHand;
      const actual = game.guestHand.toNumber();
      assert.equal(actual, expected, "hand should be same");
    });

    it("emits the GameJoined event", async () => {
      const tx = await factory.joinGame(gameId, guestHand, { from: guest });
      const actual = tx.logs[0].event;
      const expected = "GameJoined";
      assert.equal(actual, expected, "events should match");
    });

    it("change game status from Created to Joined", async () => {
      const prevStatus = (await factory._games(gameId)).status.toNumber();
      assert.equal(prevStatus, STATUS.Created, "status should be Created");

      await factory.joinGame(gameId, guestHand, { from: guest });

      const nextStatus = (await factory._games(gameId)).status.toNumber();
      assert.equal(nextStatus, STATUS.Joined, "status should be Joined");
    });
  });

  describe("reveal host hand", () => {
    beforeEach(async () => {
      await setupGame({ jankenToken, gameBank, master, user: host });
      await setupGame({ jankenToken, gameBank, master, user: guest });
      gameId = await createGame({ factory, hostHandHashed, host });
      await factory.joinGame(gameId, guestHand, { from: guest });
    });

    it("throws an error when called by non host", async () => {
      try {
        await factory.revealHostHand(gameId, hostHand, SALT, { from: guest });
        assert.fail("should be called by host");
      } catch (e) {
        const expected = "host of this game is only authorized";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });

    it("throws an error when change the hand later out", async () => {
      try {
        const anotherHostHand = HAND.Scissors;
        await factory.revealHostHand(gameId, anotherHostHand, SALT, { from: host });
        assert.fail("invalid hand or salt");
      } catch (e) {
        const expected = "cannot change hand or salt later out"
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });

    it("throws an error when change the salt later out", async () => {
      try {
        await factory.revealHostHand(gameId, hostHand, FAKE_SALT, { from: host });
        assert.fail("invalid hand or salt");
      } catch (e) {
        const expected = "cannot change hand or salt later out"
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });

    it("emits the GameRevealed event", async () => {
      const tx = await factory.revealHostHand(gameId, hostHand, SALT, { from: host })
      const actual = tx.logs[0].event;
      const expected = "GameRevealed";
      assert.equal(actual, expected, "events should match");
    });

    it("emits the GameRevealed event", async () => {
      const tx = await factory.revealHostHand(gameId, hostHand, SALT, { from: host })
      const actual = tx.logs[1].event;
      const expected = "GameJudged";
      assert.equal(actual, expected, "events should match");
    });
  });

  describe("game is decided", () => {
    beforeEach(async () => {
      await setupGame({ jankenToken, gameBank, master, user: host });
      await setupGame({ jankenToken, gameBank, master, user: guest });
      gameId = await createGame({ factory, hostHandHashed, host });
      await factory.joinGame(gameId, guestHand, { from: guest });
    });

    it("winner is guest and loser is host", async () => {
      await factory.revealHostHand(gameId, hostHand, SALT, { from: host })
      const expectedWinner = guest;
      const expectedLoser = host;
      const actualWinner = (await factory._games(gameId)).winner;
      const actualLoser = (await factory._games(gameId)).loser;
      assert.equal(actualWinner, expectedWinner, "winner should be guest");
      assert.equal(actualLoser, expectedLoser, "loser should be host");
    });

    it("change game status from Joined to Decided", async () => {
      const prevStatus = (await factory._games(gameId)).status.toNumber();
      assert.equal(prevStatus, STATUS.Joined, "previous status should be Joined");
      await factory.revealHostHand(gameId, hostHand, SALT, { from: host })
      const nextStatus = (await factory._games(gameId)).status.toNumber();
      assert.equal(nextStatus, STATUS.Decided, "status should be Decided");
    });
  });

  describe("game is tied", () => {
    beforeEach(async () => {
      await setupGame({ jankenToken, gameBank, master, user: host });
      await setupGame({ jankenToken, gameBank, master, user: guest });
      gameId = await createGame({ factory, hostHandHashed: getHashedHand(guestHand, SALT), host });
      await factory.joinGame(gameId, guestHand, { from: guest });
      await factory.revealHostHand(gameId, guestHand, SALT, { from: host })
    });

    it("winner and loser are zero address", async () => {
      const actualWinner = (await factory._games(gameId)).winner;
      const actualLoser = (await factory._games(gameId)).loser;
      const expected = '0x0000000000000000000000000000000000000000';
      assert.equal(actualWinner, expected, "winner should be zero address");
      assert.equal(actualLoser, expected, "loser should be zero address");
    });

    it("change game status from Joined to Tied", async () => {
      const status = (await factory._games(gameId)).status.toNumber();
      assert.equal(status, STATUS.Tied, "status should be Decided");
    });
  });
});
