const GameBankContract = artifacts.require("GameBank");
const JankenTokenContract = artifacts.require("JankenToken");
const GameFactoryContract = artifacts.require("GameFactory");
const GameContract = artifacts.require("Game");
const { setupGame, playGame, createGame } = require("./game_helper");

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
  Decided: 4,
  Tied: 5,
  Paid: 6,
};

contract("GameBank", accounts => {
  const master = accounts[0];
  const host = accounts[1];

  describe("deposit", () => {
    let jankenToken;
    let gameBank;
    let gameBankAddress;

    beforeEach(async () => {
      jankenToken = await JankenTokenContract.new();
      gameBank = await GameBankContract.new(jankenToken.address);
      gameBankAddress = gameBank.address;
    });

    it("deposit tokens in bank", async () => {
      const mintAmount = 100;
      const betAmount = 5;
      await jankenToken.mint(host, mintAmount,{ from: master });
      await jankenToken.approve(gameBankAddress, betAmount, { from: host });

      const currentBalance = (await jankenToken.balanceOf(gameBankAddress)).toNumber();
      await gameBank.depositToken(betAmount, { from: host });
      const newBalanece = (await jankenToken.balanceOf(gameBankAddress)).toNumber();

      const actual = newBalanece - currentBalance;
      const expected = betAmount;
      assert.equal(actual, expected, "balance should increment by bet amount");
    });

    it("emits the GameRevealed event", async () => {
      const mintAmount = 100;
      const betAmount = 5;
      await jankenToken.mint(host, mintAmount,{ from: master });
      await jankenToken.approve(gameBankAddress, betAmount, { from: host });

      const tx = await gameBank.depositToken(betAmount, { from: host });
      const actual = tx.logs[0].event;
      const expected = "DepositToken";
      assert.equal(actual, expected, "events should match");
    });

    it("throws an error when try to deposit more than approved", async () => {
      const mintAmount = 100;
      const betAmount = 5;
      await jankenToken.mint(host, mintAmount,{ from: master });
      await jankenToken.approve(gameBankAddress, betAmount - 1, { from: host });

      try {
        await gameBank.depositToken(betAmount, { from: host });
        assert.fail("exceed amount of allowance");
      } catch (e) {
        const expected = "ERC20: transfer amount exceeds allowance";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });

    it("throws an error when try to deposit more than owned", async () => {
      const mintAmount = 1;
      const betAmount = 5;
      await jankenToken.mint(host, mintAmount,{ from: master });
      await jankenToken.approve(gameBankAddress, betAmount, { from: host });

      try {
        await gameBank.depositToken(betAmount, { from: host });
        assert.fail("exceed amount of balance");
      } catch (e) {
        const expected = "ERC20: transfer amount exceeds balance";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });
  });

  describe("withdraw", () => {
    let factory;
    let jankenToken;
    let gameBank;
    const host = accounts[1];
    const guest = accounts[2];
    const salt = web3.utils.toHex('Thank you.');

    beforeEach(async () => {
      jankenToken = await JankenTokenContract.new();
      gameBank = await GameBankContract.new(jankenToken.address);
      factory = await GameFactoryContract.new(gameBank.address);

      await setupGame({ jankenToken, gameBank,  accounts });
    });

    it("throws an error when game status was invalid", async () => {
      const hostHand = Hand.Rock;
      const game = await createGame({ hostHand, factory, host, salt });
      try {
        await gameBank.getGameRewards(game.address, { from: guest });
        assert.fail("host cannot withdraw");
      } catch (e) {
        const expected = "Returned error: VM Exception while processing transaction: revert This game was not settled";
        const actual = e.message;
        assert.equal(actual, expected, "should not be permitted");
      }
    });

    describe("the game was decided", () => {
      const hostHand = Hand.Rock;
      it("throws an error when try to withdraw by host", async () => {
        const guestHand = Hand.Paper;
        const { game } = await playGame({ factory, hostHand, guestHand, accounts });
        try {
          await gameBank.getGameRewards(game.address,{ from: host });
        } catch (e) {
          const expected = "Returned error: VM Exception while processing transaction: revert Only winner of this game gets rewards"
          const actual = e.message;
          assert.equal(actual, expected, "should not be permitted");
        }
      });
    });
  });
});
