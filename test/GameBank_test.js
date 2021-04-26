const GameBankContract = artifacts.require("GameBank");
const JankenTokenContract = artifacts.require("JankenToken");

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
});
