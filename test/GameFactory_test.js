const GameFactoryContract = artifacts.require("GameFactory");
const GameContract = artifacts.require("Game");

contract("GameFactory: development", () => {
  it("it has been deployed", async () => {
    const factory = GameFactoryContract.deployed();
    assert(factory, "game factory was not deployed");;
  });
});

contract("GameFactory", accounts => {
  const master = accounts[0];
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

  let factory;
  let game;
  const salt = web3.utils.toHex('Thank you.');
  const hostHand = Hand.Rock;
  beforeEach(async ()=>{
    factory = await GameFactoryContract.deployed();
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
    await factory.createGame(hostHandHashed, { from: host });
    const games = await factory.games();
    game = await GameContract.at(games[0]);
  });

  describe("create game", () => {
    it("create a new game by host", async () => {
      const hostAddress = await game.hostAddress()
      assert.equal(hostAddress, host, "address should be equal to host");
    });
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

    it("join the game by guest", async () => {
      await game.join(Hand.Paper, { from: guest });
      const expected = Hand.Paper;
      const actual = await game.guestHand();
      assert.equal(actual, expected, "hand should be same");
    });

    it("throws an error when status is not Created", async () => {
      const status = await game.status();
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
  });
});
