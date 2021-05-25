const JankenTokenContract = artifacts.require("JankenToken");
const GameBankContract = artifacts.require("GameBank");
const GameFactoryContract = artifacts.require("GameFactory");
const {
  HAND,
  playGame,
  GAME_RESULT,
  setupGame,
} = require("./helper");

contract("JankenGame", accounts => {
  let factory;
  let jankenToken;
  let gameBank;
  let guestHand;
  const master = accounts[0];
  const host = accounts[1];
  const guest = accounts[2];

  beforeEach(async () => {
    jankenToken = await JankenTokenContract.new();
    gameBank = await GameBankContract.new(jankenToken.address);
    factory = await GameFactoryContract.new(gameBank.address);

    await setupGame({ factory, jankenToken, gameBank, master, user: host });
    await setupGame({ factory, jankenToken, gameBank, master, user: guest });
  });

  describe("host submits Rock", () => {
    const hostHand = HAND.Rock;

    it("guest submits Rock", async () => {
      guestHand = HAND.Rock;
    });

    it("guest submits Paper", async () => {
      guestHand = HAND.Paper;
    });

    it("guest submits Scissors", async () => {
      guestHand = HAND.Scissors;
    });

    afterEach(async () => {
      const result = await playGame({ factory, hostHand, guestHand, accounts });
      const expected = GAME_RESULT[hostHand][guestHand];
      assert.equal(result, expected, "result should match");
    });
  });

  describe("host submits Paper", () => {
    const hostHand = HAND.Paper;

    it("guest submits Rock", async () => {
      guestHand = HAND.Rock;
    });

    it("guest submits Paper", async () => {
      guestHand = HAND.Paper;
    });

    it("guest submits Scissors", async () => {
      guestHand = HAND.Scissors;
    });

    afterEach(async () => {
      const result = await playGame({ factory, hostHand, guestHand, accounts });
      const expected = GAME_RESULT[hostHand][guestHand];
      assert.equal(result, expected, "result should match");
    });
  });

  describe("host submits Scissors", () => {
    const hostHand = HAND.Scissors;

    it("guest submits Rock", async () => {
      guestHand = HAND.Rock;
    });

    it("guest submits Paper", async () => {
      guestHand = HAND.Paper;
    });

    it("guest submits Scissors", async () => {
      guestHand = HAND.Scissors;
    });

    afterEach(async () => {
      const result = await playGame({ factory, hostHand, guestHand, accounts });
      const expected = GAME_RESULT[hostHand][guestHand];
      assert.equal(result, expected, "result should match");
    });
  });
});
