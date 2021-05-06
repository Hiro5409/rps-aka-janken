const GameBankContract = artifacts.require("GameBank");
const JankenTokenContract = artifacts.require("JankenToken");
const GameFactoryContract = artifacts.require("GameFactory");
const GameContract = artifacts.require("Game");
const { setupGame, playGame, createGame, BET_AMOUNT } = require("./game_helper");

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
      await jankenToken.mint(host, mintAmount,{ from: master });
      await jankenToken.approve(gameBankAddress, BET_AMOUNT, { from: host });

      const currentBalance = (await jankenToken.balanceOf(gameBankAddress)).toNumber();
      await gameBank.depositToken(BET_AMOUNT, { from: host });
      const newBalanece = (await jankenToken.balanceOf(gameBankAddress)).toNumber();

      const actual = newBalanece - currentBalance;
      const expected = BET_AMOUNT;
      assert.equal(actual, expected, "balance should increment by bet amount");
    });

    it("emits the GameRevealed event", async () => {
      const mintAmount = 100;
      await jankenToken.mint(host, mintAmount,{ from: master });
      await jankenToken.approve(gameBankAddress, BET_AMOUNT, { from: host });

      const tx = await gameBank.depositToken(BET_AMOUNT, { from: host });
      const actual = tx.logs[0].event;
      const expected = "DepositToken";
      assert.equal(actual, expected, "events should match");
    });

    it("throws an error when try to deposit more than approved", async () => {
      const mintAmount = 100;
      await jankenToken.mint(host, mintAmount,{ from: master });
      await jankenToken.approve(gameBankAddress, BET_AMOUNT - 1, { from: host });

      try {
        await gameBank.depositToken(BET_AMOUNT, { from: host });
        assert.fail("exceed amount of allowance");
      } catch (e) {
        const expected = "ERC20: transfer amount exceeds allowance";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });

    it("throws an error when try to deposit more than owned", async () => {
      const mintAmount = 1;
      await jankenToken.mint(host, mintAmount,{ from: master });
      await jankenToken.approve(gameBankAddress, BET_AMOUNT, { from: host });

      try {
        await gameBank.depositToken(BET_AMOUNT, { from: host });
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
        assert.fail("invalid status");
      } catch (e) {
        const expected = "status of this game is invalid";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });

    describe("the game was decided", () => {
      let game;

      beforeEach(async () => {
        const hostHand = Hand.Rock;
        const guestHand = Hand.Paper;
        const { game: _game, winner, status } = await playGame({ factory, hostHand, guestHand, accounts });
        game = _game;
        assert.equal(status.toNumber(), Status.Decided, "status should be Decided");
        assert.equal(winner, guest, "winner should be guest");
      });

      it("throws an error when try to withdraw by loser", async () => {
        try {
          await gameBank.getGameRewards(game.address,{ from: host });
          assert.fail("host cannot to withdraw");
        } catch (e) {
          const expected = "Only winner of this game gets rewards"
          const actual = e.reason;
          assert.equal(actual, expected, "should not be permitted");
        }
      });

      it("throws an error when try to refund", async () => {
        try {
          await gameBank.refundDepositedTokens(game.address,{ from: guest });
          assert.fail("cannot to refund when game is decided");
        } catch (e) {
          const expected = "This game was not tied"
          const actual = e.reason;
          assert.equal(actual, expected, "should not be permitted");
        }
      });

      it("guest's balance of jkt increases and bank's decreases", async () => {
        const withdrawnAmount = BET_AMOUNT * 2;
        const beforeTokenBalanceOfGameBank = (await jankenToken.balanceOf(gameBank.address)).toNumber();
        const beforeTokenBalanceOfGuest = (await jankenToken.balanceOf(guest)).toNumber();
        const beforeHostBalance = (await gameBank.userToBalance(host)).toNumber();
        const beforeGuestBalance = (await gameBank.userToBalance(guest)).toNumber();
        await gameBank.getGameRewards(game.address,{ from: guest });
        const afterTokenBalanceOfGameBank = (await jankenToken.balanceOf(gameBank.address)).toNumber();
        const afterTokenBalanceOfGuest = (await jankenToken.balanceOf(guest)).toNumber();
        const afterHostBalance = (await gameBank.userToBalance(host)).toNumber();
        const afterGuestBalance = (await gameBank.userToBalance(guest)).toNumber();
        assert.equal(beforeTokenBalanceOfGameBank - afterTokenBalanceOfGameBank, withdrawnAmount, "bank's balance of jkt should decreases by withdrawn amount");
        assert.equal(afterTokenBalanceOfGuest - beforeTokenBalanceOfGuest, withdrawnAmount, "guest's balance of jkt should increases by withdrawn amount");
        assert.equal(beforeHostBalance - afterHostBalance, BET_AMOUNT, "balance mapped to host should decreases by bet amount")
        assert.equal(beforeGuestBalance - afterGuestBalance, BET_AMOUNT, "balance mapped to guest should decreases by bet amount")
      });

      it("emits the WithdrawTokens event", async () => {
        const tx = await gameBank.getGameRewards(game.address,{ from: guest });
        const actual = tx.logs[0].event;
        const expected = "WithdrawTokens";
        assert.equal(actual, expected, "events should match");
      });

      it("change game status to paid", async () => {
        await gameBank.getGameRewards(game.address,{ from: guest });
        const actual = (await game.status()).toNumber();
        const expected = Status.Paid;
        assert.equal(actual, expected, "status should be Paid");
      });

      it("fail to withdraw more than 2 times", async () => {
        await gameBank.getGameRewards(game.address,{ from: guest });
        try {
          await gameBank.getGameRewards(game.address,{ from: guest });
        } catch (e) {
          const expected = "status of this game is invalid";
          const actual = e.reason;
          assert.equal(actual, expected, "should not be permitted");
        }
      });
    });
    });
  });
});
