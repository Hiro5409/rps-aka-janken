const GameBankContract = artifacts.require("GameBank");
const JankenTokenContract = artifacts.require("JankenToken");
const GameFactoryContract = artifacts.require("GameFactory");
const { MINT_AMOUNT, BET_AMOUNT, HAND, SALT, getHashedHand, createGame, setupGame } = require("./helper");

contract("GameBank", accounts => {
  let factory;
  let jankenToken;
  let gameBank;
  let gameBankAddress;
  const master = accounts[0];
  const host = accounts[1];

  beforeEach(async () => {
    jankenToken = await JankenTokenContract.new();
    gameBank = await GameBankContract.new(jankenToken.address);
    gameBankAddress = gameBank.address;
    factory = await GameFactoryContract.new(gameBankAddress);
  });

  describe("deposit", () => {
    it("throws an error when try to deposit more than approved", async () => {
      await jankenToken.mint(host, MINT_AMOUNT, { from: master });
      await jankenToken.approve(gameBankAddress, BET_AMOUNT - 1, { from: host });

      try {
        await gameBank.depositToken(factory.address, BET_AMOUNT, { from: host });
        assert.fail("exceed amount of allowance");
      } catch (e) {
        const expected = "ERC20: transfer amount exceeds allowance";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });

    it("throws an error when try to deposit more than owned", async () => {
      await jankenToken.mint(host, MINT_AMOUNT - (MINT_AMOUNT - 1), { from: master });
      await jankenToken.approve(gameBankAddress, BET_AMOUNT, { from: host });

      try {
        await gameBank.depositToken(factory.address, BET_AMOUNT, { from: host });
        assert.fail("exceed amount of balance");
      } catch (e) {
        const expected = "ERC20: transfer amount exceeds balance";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });

    it("deposit tokens in bank", async () => {
      await jankenToken.mint(host, MINT_AMOUNT, { from: master });
      await jankenToken.approve(gameBankAddress, BET_AMOUNT, { from: host });

      const currentBalance = (await jankenToken.balanceOf(gameBankAddress)).toNumber();
      await gameBank.depositToken(factory.address, BET_AMOUNT, { from: host });
      const newBalanece = (await jankenToken.balanceOf(gameBankAddress)).toNumber();

      const actual = newBalanece - currentBalance;
      const expected = BET_AMOUNT;
      assert.equal(actual, expected, "balance should increment by bet amount");
    });

    it("emits the DepositToken event", async () => {
      await jankenToken.mint(host, MINT_AMOUNT, { from: master });
      await jankenToken.approve(gameBankAddress, BET_AMOUNT, { from: host });

      const tx = await gameBank.depositToken(factory.address, BET_AMOUNT, { from: host });
      const actual = tx.logs[0].event;
      const expected = "DepositToken";
      assert.equal(actual, expected, "events should match");
    });
  });

  describe("withdraw", () => {
    let gameId;
    const guest = accounts[2];
    const hostHand = HAND.Rock;
    const hostHandHashed = getHashedHand(hostHand, SALT);
    const guestHand = HAND.Paper;

    beforeEach(async () => {
      await setupGame({ factory, jankenToken, gameBank, master, user: host });
      await setupGame({ factory, jankenToken, gameBank, master, user: guest });
      gameId = await createGame({ factory, hostHandHashed, host });
      await factory.joinGame(gameId, guestHand, { from: guest });
    });

    it("throws an error when try to get rewards but game status was invalid", async () => {
      try {
        await gameBank.getGameRewards(factory.address, gameId, { from: guest });
        assert.fail("invalid status");
      } catch (e) {
        const expected = "status is invalid, required Decided";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });

    it("throws an error when try to refund but game status was invalid", async () => {
      try {
        await gameBank.getRefundedStake(factory.address, gameId, { from: guest });
        assert.fail("invalid status");
      } catch (e) {
        const expected = "status is invalid, required Tied";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });

    describe("get rewards for winning game", () => {
      beforeEach(async () => {
        await factory.revealHostHand(gameId, hostHand, SALT, { from: host })
      });

      it("throws an error when loser try to get rewards", async () => {
        try {
          await gameBank.getGameRewards(factory.address, gameId, { from: host });
          assert.fail("you are loser");
        } catch (e) {
          const expected = "you are loser";
          const actual = e.reason;
          assert.equal(actual, expected, "should not be permitted");
        }
      });

      it("emits the WithdrawToken event", async () => {
        const tx = await gameBank.getGameRewards(factory.address, gameId, { from: guest });
        const actual = tx.logs[0].event;
        const expected = "WithdrawToken";
        assert.equal(actual, expected, "events should match");
      });

      it("JKT balance of game bank and winner changes correctly", async () => {
        const rewardsAmount = BET_AMOUNT * 2;
        const prevJKTBalanceOfGameBank = (await jankenToken.balanceOf(gameBank.address)).toNumber();
        const prevJKTBalanceOfGuest = (await jankenToken.balanceOf(guest)).toNumber();

        await gameBank.getGameRewards(factory.address, gameId, { from: guest });

        const JKTBalanceOfGameBank = (await jankenToken.balanceOf(gameBank.address)).toNumber();
        assert.equal(JKTBalanceOfGameBank, prevJKTBalanceOfGameBank - rewardsAmount, "jkt balance of bank should match");

        const JKTBalanceOfGuest = (await jankenToken.balanceOf(guest)).toNumber();
        assert.equal(JKTBalanceOfGuest, prevJKTBalanceOfGuest + rewardsAmount, "jkt balance of guest should match");
      });

      it("Deposit of winner and loser changes correctly", async () => {
        const prevJKTBalanceOfHostDepositedInBank = (await gameBank._gameToUserBalance(factory.address, host)).toNumber();
        const prevJKTBalanceOfGuestDepositedInBank = (await gameBank._gameToUserBalance(factory.address, guest)).toNumber();

        await gameBank.getGameRewards(factory.address, gameId, { from: guest });

        const JKTBalanceOfHostDepositedInBank = (await gameBank._gameToUserBalance(factory.address, host)).toNumber();
        assert.equal(JKTBalanceOfHostDepositedInBank, prevJKTBalanceOfHostDepositedInBank - BET_AMOUNT, "host's deposit should match");

        const JKTBalanceOfGuestDepositedInBank = (await gameBank._gameToUserBalance(factory.address, guest)).toNumber();
        assert.equal(JKTBalanceOfGuestDepositedInBank, prevJKTBalanceOfGuestDepositedInBank - BET_AMOUNT, "guest's deposit balance should match");
      });
    });
  });
});
