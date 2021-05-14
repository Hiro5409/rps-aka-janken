const GameBankContract = artifacts.require("GameBank");
const JankenTokenContract = artifacts.require("JankenToken");
const { MINT_AMOUNT, BET_AMOUNT } = require("./helper");

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

    it("throws an error when try to deposit more than approved", async () => {
      await jankenToken.mint(host, MINT_AMOUNT, { from: master });
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
      await jankenToken.mint(host, MINT_AMOUNT - (MINT_AMOUNT - 1), { from: master });
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

    it("deposit tokens in bank", async () => {
      await jankenToken.mint(host, MINT_AMOUNT, { from: master });
      await jankenToken.approve(gameBankAddress, BET_AMOUNT, { from: host });

      const currentBalance = (await jankenToken.balanceOf(gameBankAddress)).toNumber();
      await gameBank.depositToken(BET_AMOUNT, { from: host });
      const newBalanece = (await jankenToken.balanceOf(gameBankAddress)).toNumber();

      const actual = newBalanece - currentBalance;
      const expected = BET_AMOUNT;
      assert.equal(actual, expected, "balance should increment by bet amount");
    });

    it("emits the DepositToken event", async () => {
      await jankenToken.mint(host, MINT_AMOUNT, { from: master });
      await jankenToken.approve(gameBankAddress, BET_AMOUNT, { from: host });

      const tx = await gameBank.depositToken(BET_AMOUNT, { from: host });
      const actual = tx.logs[0].event;
      const expected = "DepositToken";
      assert.equal(actual, expected, "events should match");
    });
  });
});
