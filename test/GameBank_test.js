const GameBankContract = artifacts.require("GameBank");
const JankenTokenContract = artifacts.require("JankenToken");
const GameFactoryContract = artifacts.require("GameFactory");
const { MINT_AMOUNT, BET_AMOUNT, HAND, SALT, getHashedHand, createGame, setupGame, STATUS } = require("./helper");

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
        await gameBank.depositTokens(factory.address, BET_AMOUNT, { from: host });
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
        await gameBank.depositTokens(factory.address, BET_AMOUNT, { from: host });
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

      const currentJKTBalance = (await jankenToken.balanceOf(gameBankAddress)).toNumber();
      const currentDepositedBalance = (await gameBank._gameUserBalanceDeposited(factory.address, host)).toNumber();
      await gameBank.depositTokens(factory.address, BET_AMOUNT, { from: host });
      const newJKTBalance = (await jankenToken.balanceOf(gameBankAddress)).toNumber();
      const newDepositedBalance = (await gameBank._gameUserBalanceDeposited(factory.address, host)).toNumber();

      const actualJKT = newJKTBalance - currentJKTBalance;
      const expectedJKT = BET_AMOUNT;
      assert.equal(actualJKT, expectedJKT, "balance of jkt should increment by bet amount");

      const actualDepositedBalance = newDepositedBalance - currentDepositedBalance;
      const expectedDepositedBalance = BET_AMOUNT;
      assert.equal(actualDepositedBalance, expectedDepositedBalance, "balance of jkt should increment by bet amount");
    });

    it("emits the DepositTokens event", async () => {
      await jankenToken.mint(host, MINT_AMOUNT, { from: master });
      await jankenToken.approve(gameBankAddress, BET_AMOUNT, { from: host });

      const tx = await gameBank.depositTokens(factory.address, BET_AMOUNT, { from: host });
      const actual = tx.logs[0].event;
      const expected = "DepositTokens";
      assert.equal(actual, expected, "events should match");
    });
  });

  describe("withdraw", () => {
    beforeEach(async () => {
      await jankenToken.mint(host, MINT_AMOUNT, { from: master });
      await jankenToken.approve(gameBankAddress, BET_AMOUNT, { from: host });
      await gameBank.depositTokens(factory.address, BET_AMOUNT, { from: host });
    });

    it("throws an error when withdraw amount exceeds balance", async () => {
      try {
        await gameBank.withdrawTokens(factory.address, BET_AMOUNT + 1, { from: host });
        assert.fail("cannot withdraw");
      } catch (e) {
        const expected = "withdraw amount exceeds balance";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });

    it("withdraw all tokens deposited", async () => {
      const currentDepositedBalance = (await gameBank._gameUserBalanceDeposited(factory.address, host)).toNumber();
      await gameBank.withdrawTokens(factory.address, BET_AMOUNT, { from: host });
      const newDepositedBalance = (await gameBank._gameUserBalanceDeposited(factory.address, host)).toNumber();

      const actual = newDepositedBalance;
      const expected = currentDepositedBalance - BET_AMOUNT;
      assert.equal(actual, expected, "should match balance");
    });

    it("jkt balance of winner increases", async () => {
      const currentJKTBalance = (await jankenToken.balanceOf(host)).toNumber();
      await gameBank.withdrawTokens(factory.address, BET_AMOUNT, { from: host });
      const newJKTBalance = (await jankenToken.balanceOf(host)).toNumber();

      assert.equal(newJKTBalance, currentJKTBalance + BET_AMOUNT, "balance of host jkt should increment by withdraw amount");
    });

    it("jkt balance of game bank decreases", async () => {
      const currentJKTBalance = (await jankenToken.balanceOf(gameBankAddress)).toNumber();
      await gameBank.withdrawTokens(factory.address, BET_AMOUNT, { from: host });
      const newJKTBalance = (await jankenToken.balanceOf(gameBankAddress)).toNumber();

      assert.equal(newJKTBalance, currentJKTBalance - BET_AMOUNT, "balance of game bank jkt should decrement by withdraw amount");
    });

    it("emits the WithdrawTokens event", async () => {
      const tx = await gameBank.withdrawTokens(factory.address, BET_AMOUNT, { from: host });
      const actual = tx.logs[0].event;
      const expected = "WithdrawTokens";
      assert.equal(actual, expected, "events should match");
    });
  });
});
