const GameBankContract = artifacts.require("GameBank");
const JankenTokenContract = artifacts.require("JankenToken");
const GameFactoryContract = artifacts.require("GameFactory");
const GameContract = artifacts.require("Game");

const Hand = {
  Rock: 0,
  Paper: 1,
  Scissors: 2,
};

const Status = {
  Created: 0,
  Ready: 1,
  Canceled: 2,
  TimedOut: 3,
  Done: 4,
};

contract("Game", accounts => {
  let factory;
  let jankenToken;
  let gameBank;
  let game;
  const master = accounts[0];
  const host = accounts[1];
  const guest = accounts[2];
  const mintAmount = 100;
  const betAmount = 5;
  const salt = web3.utils.toHex('Thank you.');
  const hostHand = Hand.Rock;
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

  beforeEach(async () => {
    jankenToken = await JankenTokenContract.new();
    gameBank = await GameBankContract.new(jankenToken.address);
    factory = await GameFactoryContract.new(gameBank.address);

    await jankenToken.mint(host, mintAmount, { from: master });
    await jankenToken.mint(guest, mintAmount, { from: master });
    await jankenToken.approve(gameBank.address, betAmount, { from: host });
    await jankenToken.approve(gameBank.address, betAmount, { from: guest });
    await gameBank.depositToken(betAmount, { from: host });

    await factory.createGame(betAmount, hostHandHashed, { from: host });
    const games = await factory.games();
    game = await GameContract.at(games[0]);
  });

  describe("join game", () => {
    it("throws an error when called by host", async () => {
      try {
        await game.join(Hand.Paper, { from: host });
        assert.fail("host cannot join");
      } catch (e) {
        const expected = "host of this game is not authorized";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });

    it("throws an error when guest's deposited tokens is insufficient", async () => {
      try {
        await game.join(Hand.Paper, { from: guest });
        assert.fail("cannot join before deposit");
      } catch (e) {
        const expected = "Insufficient token deposited in GameBank";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });

    it("join the game after deposit", async () => {
      await gameBank.depositToken(betAmount, { from: guest });
      await game.join(Hand.Paper, { from: guest });
      const expected = Hand.Paper;
      const actual = await game.guestHand();
      assert.equal(actual, expected, "hand should be same");
    });

    it("emits the GameJoined event", async () => {
      await gameBank.depositToken(betAmount, { from: guest });
      const tx = await game.join(Hand.Paper, { from: guest });
      const actual = tx.logs[0].event;
      const expected = "GameJoined";
      assert.equal(actual, expected, "events should match");
    });

    it("throws an error when status is not Created", async () => {
      const status = (await game.status()).toNumber();
      assert.equal(status, Status.Created, "status should be Created");
      await gameBank.depositToken(betAmount, { from: guest });
      try {
        await game.join(Hand.Rock, { from: guest });
        await game.join(Hand.Rock, { from: guest });
        assert.fail("cannot join when status is not Created");
      } catch (e) {
        const expected = "status is invalid, required Created";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });
  });
});
