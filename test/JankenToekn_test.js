const JankenTokenContract = artifacts.require("JankenToken");

contract("JankenToken", accounts => {
  let jankenToken;
  const master = accounts[0];
  const host = accounts[1];
  const guest = accounts[2];

  beforeEach(async () => {
    jankenToken = await JankenTokenContract.new()
  });

  describe("minting", () => {
    const mintAmount = 100;

    it("mint when called by master", async () => {
      const currentBalance = (await jankenToken.balanceOf(host)).toNumber();
      await jankenToken.mint(host, mintAmount,{ from: master });
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
        const expected = "Caller is not a minter";
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
        const expected = "Caller is not a burner";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });
  });
});
