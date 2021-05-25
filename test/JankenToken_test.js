const JankenTokenContract = artifacts.require("JankenToken");
const GameBankContract = artifacts.require("GameBank");

contract("JankenToken: deployed", accounts => {
  it("it has been deployed", async () => {
    const jankenToken = await JankenTokenContract.deployed();
    assert(jankenToken, "JankenToken was not deployed");;
  });

  it("100 jkt was distributed to host and guest", async () => {
    const jankenToken = await JankenTokenContract.deployed();
    const host = accounts[1];
    const guest = accounts[2];

    const hostBalance = (await jankenToken.balanceOf(host)).toNumber();
    const guestBalance = (await jankenToken.balanceOf(guest)).toNumber();
    const expected = 100;
    assert.equal(hostBalance, expected, "host should have 100 JKT");;
    assert.equal(guestBalance, expected, "guest should have 100 JKT");;
  })
});

contract("JankenToken", accounts => {
  let jankenToken;
  let gameBank;
  let gameBankAddress;
  const master = accounts[0];
  const host = accounts[1];

  beforeEach(async () => {
    jankenToken = await JankenTokenContract.new();
    gameBank = await GameBankContract.new(jankenToken.address);
    gameBankAddress = gameBank.address;
  });

  describe("minting", () => {
    const mintAmount = 100;

    it("mint when called by master", async () => {
      const currentBalance = (await jankenToken.balanceOf(host)).toNumber();
      await jankenToken.mint(host, mintAmount, { from: master });
      const newBalanece = (await jankenToken.balanceOf(host)).toNumber();

      const actual = newBalanece - currentBalance;
      const expected = mintAmount;
      assert.equal(actual, expected, "balance should increment by amount");
    });

    it("throws an error when called from a non-master", async () => {
      try {
        await jankenToken.mint(host, mintAmount,{ from: host });
        assert.fail("minting was not restricted to master");
      } catch (e) {
        const expected = "Caller is not a admin";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });
  });

  describe("burning", () => {
    const mintAmount = 100;
    const burnAmount = 10;

    beforeEach(async () => {
      await jankenToken.mint(host, mintAmount,{ from: master });
    });

    it("burn when called by master", async () => {
      const currentBalance = (await jankenToken.balanceOf(host)).toNumber();
      await jankenToken.burn(host, burnAmount,{ from: master });

      const actual = (await jankenToken.balanceOf(host)).toNumber();
      const expected = currentBalance - burnAmount;
      assert.equal(actual, expected, "balance should decrement by amount");
    });

    it("throws an error when called from a non-master", async () => {
      try {
        await jankenToken.burn(host, burnAmount,{ from: host });
        assert.fail("burning was not restricted to master");
      } catch (e) {
        const expected = "Caller is not a admin";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });
  });

  describe("approve", () => {
    const approveAmount = 10;

    it("approve", async () => {
      const previousAllowance = (await jankenToken.allowance(host, gameBankAddress)).toNumber();
      await jankenToken.approve(gameBankAddress, approveAmount, { from: host });
      const nextAllowance = (await jankenToken.allowance(host, gameBankAddress)).toNumber();
      const expected = approveAmount;
      const actual = nextAllowance - previousAllowance;
      assert.equal(actual, expected, "approved amount should match");
    });
  });
});
