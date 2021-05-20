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
const { time } = require("@openzeppelin/test-helpers");

contract("GameFactory: create, join", accounts => {
  const master = accounts[0];
  const host = accounts[1];
  const guest = accounts[2];
  const hostHand = HAND.Rock;
  const hostHandHashed = getHashedHand(hostHand, SALT);
  const guestHand = HAND.Paper;

  let factory;
  let jankenToken;
  let gameBank;
  let gameId;

  beforeEach(async () => {
    jankenToken = await JankenTokenContract.new();
    gameBank = await GameBankContract.new(jankenToken.address, { from: master });
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
      await setupGame({ factory, jankenToken, gameBank, master, user: host });
    });

    it("create new game", async () => {
      const gameId = await createGame({ factory, hostHandHashed, host });
      const game = await factory._games(gameId);
      assert(game, "game should be present");;
    });

    it("decrease deposited balance in bank", async () => {
      const currentDepositedBalance = (await gameBank._gameUserBalanceDeposited(factory.address, host)).toNumber();
      await createGame({ factory, hostHandHashed, host });
      const newDepositedBalance = (await gameBank._gameUserBalanceDeposited(factory.address, host)).toNumber();
      const actual = newDepositedBalance;
      const expected = currentDepositedBalance - BET_AMOUNT;
      assert.equal(actual, expected, "should match balance");
    });

    it("increase game staking balance in bank", async () => {
      const gameId = await createGame({ factory, hostHandHashed, host });
      const newStakeBalance = (await gameBank._gameGameIdUserBalanceStake(factory.address, gameId, host)).toNumber();
      const actual = newStakeBalance;
      const expected = BET_AMOUNT;
      assert.equal(actual, expected, "should match balance");
    });

    it("emits the GameCreated event", async () => {
      const tx = await factory.createGame(BET_AMOUNT, hostHandHashed, { from: host });
      const actual = tx.logs[0].event;
      const expected = "GameCreated";
      assert.equal(actual, expected, "events should match");
    });
  });

  describe("fail to join game", () => {
    beforeEach(async () => {
      await setupGame({ factory, jankenToken, gameBank, master, user: host });
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
      await setupGame({ factory, jankenToken, gameBank, master, user: guest });
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
    beforeEach(async () => {
      await setupGame({ factory, jankenToken, gameBank, master, user: host });
      await setupGame({ factory, jankenToken, gameBank, master, user: guest });
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
});

contract("GameFactory: reveal, judge", accounts => {
  const master = accounts[0];
  const host = accounts[1];
  const guest = accounts[2];
  const hostHand = HAND.Rock;
  const hostHandHashed = getHashedHand(hostHand, SALT);
  const guestHand = HAND.Paper;

  let factory;
  let jankenToken;
  let gameBank;
  let gameId;

  beforeEach(async () => {
    jankenToken = await JankenTokenContract.new();
    gameBank = await GameBankContract.new(jankenToken.address, { from: master });
    factory = await GameFactoryContract.new(gameBank.address);
    await setupGame({ factory, jankenToken, gameBank, master, user: host });
    await setupGame({ factory, jankenToken, gameBank, master, user: guest });
  });

  describe("reveal host hand", () => {
    beforeEach(async () => {
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

contract("GameFactory: timedOut", accounts => {
  const master = accounts[0];
  const host = accounts[1];
  const guest = accounts[2];
  const hostHand = HAND.Rock;
  const hostHandHashed = getHashedHand(hostHand, SALT);
  const guestHand = HAND.Paper;
  const DEFAULT_TIMEOUT_SECONDS = 216000;
  const TIMEOUT_SECONDS = 1;

  let factory;
  let jankenToken;
  let gameBank;
  let gameId;

  beforeEach(async () => {
    jankenToken = await JankenTokenContract.new();
    gameBank = await GameBankContract.new(jankenToken.address, { from: master });
    factory = await GameFactoryContract.new(gameBank.address);
    await setupGame({ factory, jankenToken, gameBank, master, user: host });
    await setupGame({ factory, jankenToken, gameBank, master, user: guest });
  });

  describe("timed out", () => {
    it("throws an error when try to change timeout seconds by non game master", async () => {
      try {
        await factory.changeTimeoutSeconds(TIMEOUT_SECONDS, { from: host });
        assert.fail("you are not master");
      } catch (e) {
        const expected = "Caller is not a game master";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });

    it("change time out seconds", async () => {
      const prevTimeoutSec = await factory._timeoutSeconds();
      await factory.changeTimeoutSeconds(TIMEOUT_SECONDS, { from: master });
      const currentTimeoutSec = await factory._timeoutSeconds();

      assert.equal(prevTimeoutSec, DEFAULT_TIMEOUT_SECONDS, "should not be permitted");
      assert.equal(currentTimeoutSec, TIMEOUT_SECONDS, "should not be permitted");
    });

    it("cannot reveal host hand because of time out", async () => {
      await factory.changeTimeoutSeconds(TIMEOUT_SECONDS, { from: master });
      gameId = await createGame({ factory, hostHandHashed, host });
      await factory.joinGame(gameId, guestHand, { from: guest });
      await time.increase(TIMEOUT_SECONDS);
      try {
        await factory.revealHostHand(gameId, hostHand, SALT, { from: host });
      } catch (e) {
        const expected = "this game was timed out";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });
  });

  describe("judge timed out game", () => {
    beforeEach(async () => {
      await factory.changeTimeoutSeconds(TIMEOUT_SECONDS, { from: master });
      gameId = await createGame({ factory, hostHandHashed, host });
      await factory.joinGame(gameId, guestHand, { from: guest });
    });

    it("throws an error when try to judge game not timed out", async () => {
      try {
        await factory.judgeTimedOutGame(gameId, { from: guest });
        assert.fail("the game was not timed out");
      } catch (e) {
        const expected = "this game was not timed out";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });

    it("throws an error when try to call by non guest", async () => {
      await time.increase(TIMEOUT_SECONDS);
      try {
        await factory.judgeTimedOutGame(gameId, { from: host });
        assert.fail("you are not guest");
      } catch (e) {
        const expected = "guest of this game is only authorized";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });

    it("judge timed out game by guest", async () => {
      await time.increase(TIMEOUT_SECONDS);
      await factory.judgeTimedOutGame(gameId, { from: guest });

      const { winner, loser } = await factory.getResult(gameId);
      assert.equal(winner, guest, "winner should be guest");
      assert.equal(loser, host, "loser should be host");

      const status = (await factory._games(gameId)).status.toNumber();
      assert.equal(status, STATUS.Decided, "status should be Decided");
    });

    it("emits the GameJudged event", async () => {
      await time.increase(TIMEOUT_SECONDS);
      const tx = await factory.judgeTimedOutGame(gameId, { from: guest });
      const actual = tx.logs[0].event;
      const expected = "GameJudged";
      assert.equal(actual, expected, "event should match");
    });
  });
});
