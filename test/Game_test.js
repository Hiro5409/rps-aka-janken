const GameContract = artifacts.require("Game");

contract("Game", accounts => {
  let game;
  const host = accounts[1];
  const guest = accounts[2];
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
  const salt = web3.utils.toHex('Thank you.');
  const hostHand = Hand.Rock;

  beforeEach(async () => {
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
    game = await GameContract.new(host, hostHandHashed);
  });


  it("create new game", async () => {
    assert(game, "instance of Game should be present");;
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

    describe("join game by host", () => {
      let tx;
      beforeEach(async () => {
        tx = await game.join(Hand.Paper, { from: guest });
      });

      it("join the game by guest", async () => {
        const expected = Hand.Paper;
        const actual = await game.guestHand();
        assert.equal(actual, expected, "hand should be same");
      });

      it("emits the GameJoined event", async () => {
        const actual = tx.logs[0].event;
        const expected = "GameJoined";
        assert.equal(actual, expected, "events should match");
      });

      it("throws an error when status is not Created", async () => {
        const status = (await game.status()).toNumber();
        assert.equal(status, Status.Ready, "status should be Ready");
        try {
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

  describe("reveal host hand", () => {
    beforeEach(async () => {
      await game.join(Hand.Paper, { from: guest });
    });

    describe("invalid hand", () => {
      it("throws an error when called by non host", async () => {
        try {
          await game.revealHostHand(hostHand, salt, { from: guest });
          assert.fail("should be called by host");
        } catch (e) {
          const expected = "only host of this game is authorized";
          const actual = e.reason;
          assert.equal(actual, expected, "should not be permitted");
        }
      });

      it("throws an error when change the hand later out", async () => {
        try {
          const anotherHostHand = Hand.Scissors;
          await game.revealHostHand(anotherHostHand, salt, { from: host });
          assert.fail("invalid hand or salt");
        } catch (e) {
          const expected = "cannot change hand or salt later out"
          const actual = e.reason;
          assert.equal(actual, expected, "should not be permitted");
        }
      });

      it("throws an error when change the salt later out", async () => {
        try {
          const anotherSalt = web3.utils.toHex("Fuck you.");
          await game.revealHostHand(hostHand, anotherSalt, { from: host });
          assert.fail("invalid hand or salt");
        } catch (e) {
          const expected = "cannot change hand or salt later out"
          const actual = e.reason;
          assert.equal(actual, expected, "should not be permitted");
        }
      });
    });

    describe("valid hand", () => {
      let prevStatus;
      let tx;
      beforeEach(async () => {
        prevStatus = await game.status();
        tx = await game.revealHostHand(hostHand, salt, { from: host });
      });

      it("change status to Done when reveal game", async () => {
        const prevExpectedStatus = Status.Ready;
        const nextExpectedStatus = Status.Done;
        const nextStatus = await game.status();
        assert.equal(prevStatus, prevExpectedStatus, "previous status should be Ready");
        assert.equal(nextStatus, nextExpectedStatus, "status should be Done");
      });

      it("emits the GameRevealed event", async () => {
        const actual = tx.logs[0].event;
        const expected = "GameRevealed";
        assert.equal(actual, expected, "events should match");
      });

      it("emits the GameJudged event", async () => {
        const actual = tx.logs[1].event;
        const expected = "GameJudged";
        assert.equal(actual, expected, "events should match");
      });

      it("winner is guest", async () => {
          const actual = await game.winnerAddress();
          const expected = guest;
          assert.equal(actual, expected, "winner should be guest");
      });
    });
  });
});
