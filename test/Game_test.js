const GameBankContract = artifacts.require("GameBank");
const JankenTokenContract = artifacts.require("JankenToken");
const GameFactoryContract = artifacts.require("GameFactory");
const GameContract = artifacts.require("Game");

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

contract("Game", accounts => {
  let factory;
  let jankenToken;
  let gameBank;
  let game;
  const master = accounts[0];
  const host = accounts[1];
  const guest = accounts[2];
  const mintAmount = 100;
  const betAmount = 5;
  const salt = web3.utils.toHex('Thank you.');
  const hostHand = Hand.Rock;
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

  beforeEach(async () => {
    jankenToken = await JankenTokenContract.new();
    gameBank = await GameBankContract.new(jankenToken.address);
    factory = await GameFactoryContract.new(gameBank.address);

    await jankenToken.mint(host, mintAmount, { from: master });
    await jankenToken.mint(guest, mintAmount, { from: master });
    await jankenToken.approve(gameBank.address, betAmount, { from: host });
    await jankenToken.approve(gameBank.address, betAmount, { from: guest });
    await gameBank.depositToken(betAmount, { from: host });

    await factory.createGame(betAmount, hostHandHashed, { from: host });
    const games = await factory.games();
    game = await GameContract.at(games[0]);
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

    it("throws an error when guest's deposited tokens is insufficient", async () => {
      try {
        await game.join(Hand.Paper, { from: guest });
        assert.fail("cannot join before deposit");
      } catch (e) {
        const expected = "Insufficient token deposited in GameBank";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });

    it("join the game after deposit", async () => {
      await gameBank.depositToken(betAmount, { from: guest });
      await game.join(Hand.Paper, { from: guest });
      const expected = Hand.Paper;
      const actual = await game.guestHand();
      assert.equal(actual, expected, "hand should be same");
    });

    it("emits the GameJoined event", async () => {
      await gameBank.depositToken(betAmount, { from: guest });
      const tx = await game.join(Hand.Paper, { from: guest });
      const actual = tx.logs[0].event;
      const expected = "GameJoined";
      assert.equal(actual, expected, "events should match");
    });

    it("throws an error when status is not Created", async () => {
      const status = (await game.status()).toNumber();
      assert.equal(status, Status.Created, "status should be Created");
      await gameBank.depositToken(betAmount, { from: guest });
      try {
        await game.join(Hand.Rock, { from: guest });
        await game.join(Hand.Rock, { from: guest });
        assert.fail("cannot join when status is not Created");
      } catch (e) {
        const expected = "status is invalid, required Created";
        const actual = e.reason;
        assert.equal(actual, expected, "should not be permitted");
      }
    });
  });

  describe("reveal host hand", () => {
    beforeEach(async () => {
      await gameBank.depositToken(betAmount, { from: guest });
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
      it("change status from Ready to Done when reveal game", async () => {
        const prevStatus = await game.status();
        await game.revealHostHand(hostHand, salt, { from: host })
        const nextStatus = await game.status();
        assert.equal(prevStatus, Status.Ready, "previous status should be Ready");
        assert.equal(nextStatus, Status.Done, "status should be Done");
      });

      it("emits the GameRevealed event", async () => {
        const tx = await game.revealHostHand(hostHand, salt, { from: host })
        const actual = tx.logs[0].event;
        const expected = "GameRevealed";
        assert.equal(actual, expected, "events should match");
      });

      it("emits the GameJudged event", async () => {
        const tx = await game.revealHostHand(hostHand, salt, { from: host })
        const actual = tx.logs[1].event;
        const expected = "GameJudged";
        assert.equal(actual, expected, "events should match");
      });

      it("winner is guest", async () => {
          await game.revealHostHand(hostHand, salt, { from: host });
          const actual = await game.winnerAddress();
          const expected = guest;
          assert.equal(actual, expected, "winner should be guest");
      });
    });
  });
});

// TODO: Refactor
contract("Game: judgement", accounts => {
  let factory;
  let jankenToken;
  let gameBank;
  const master = accounts[0];
  const host = accounts[1];
  const guest = accounts[2];
  const mintAmount = 100;
  const betAmount = 5;
  const salt = web3.utils.toHex('Thank you.');

  beforeEach(async () => {
    jankenToken = await JankenTokenContract.new();
    gameBank = await GameBankContract.new(jankenToken.address);
    factory = await GameFactoryContract.new(gameBank.address);

    await jankenToken.mint(host, mintAmount, { from: master });
    await jankenToken.mint(guest, mintAmount, { from: master });
    await jankenToken.approve(gameBank.address, betAmount, { from: host });
    await jankenToken.approve(gameBank.address, betAmount, { from: guest });
    await gameBank.depositToken(betAmount, { from: host });
    await gameBank.depositToken(betAmount, { from: guest });
  });

  describe("host submits Rock", () => {
    const hostHand = Hand.Rock;
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

    it("guest submits Rock", async () => {
      const guestHand = Hand.Rock;

      await factory.createGame(betAmount, hostHandHashed, { from: host });
      const games = await factory.games();
      const game = await GameContract.at(games[0]);

      await game.join(guestHand, { from: guest });
      await game.revealHostHand(hostHand, salt, { from: host });
      const actual = await game.winnerAddress();
      const expected = '0x0000000000000000000000000000000000000000';
      assert.equal(actual, expected, "No winner");
    });

    it("guest submits Scissors", async () => {
      const guestHand = Hand.Scissors;

      await factory.createGame(betAmount, hostHandHashed, { from: host });
      const games = await factory.games();
      const game = await GameContract.at(games[0]);

      await game.join(guestHand, { from: guest });
      await game.revealHostHand(hostHand, salt, { from: host });
      const actual = await game.winnerAddress();
      const expected = host;
      assert.equal(actual, expected, "winner should be host");
    });

    it("guest submits Paper", async () => {
      const guestHand = Hand.Paper;

      await factory.createGame(betAmount, hostHandHashed, { from: host });
      const games = await factory.games();
      const game = await GameContract.at(games[0]);

      await game.join(guestHand, { from: guest });
      await game.revealHostHand(hostHand, salt, { from: host });
      const actual = await game.winnerAddress();
      const expected = guest;
      assert.equal(actual, expected, "winner should be guest");
    });
  });

  describe("host submits Scissors", () => {
    const hostHand = Hand.Scissors;
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

    it("guest submits Rock", async () => {
      const guestHand = Hand.Rock;

      await factory.createGame(betAmount, hostHandHashed, { from: host });
      const games = await factory.games();
      const game = await GameContract.at(games[0]);

      await game.join(guestHand, { from: guest });
      await game.revealHostHand(hostHand, salt, { from: host });
      const actual = await game.winnerAddress();
      const expected = guest;
      assert.equal(actual, expected, "winner should be guest");
    });

    it("guest submits Scissors", async () => {
      const guestHand = Hand.Scissors;

      await factory.createGame(betAmount, hostHandHashed, { from: host });
      const games = await factory.games();
      const game = await GameContract.at(games[0]);

      await game.join(guestHand, { from: guest });
      await game.revealHostHand(hostHand, salt, { from: host });
      const actual = await game.winnerAddress();
      const expected = '0x0000000000000000000000000000000000000000';
      assert.equal(actual, expected, "No winner");
    });

    it("guest submits Paper", async () => {
      const guestHand = Hand.Paper;

      await factory.createGame(betAmount, hostHandHashed, { from: host });
      const games = await factory.games();
      const game = await GameContract.at(games[0]);

      await game.join(guestHand, { from: guest });
      await game.revealHostHand(hostHand, salt, { from: host });
      const actual = await game.winnerAddress();
      const expected = host;
      assert.equal(actual, expected, "winner should be host");
    });
  });

  describe("host submits Paper", () => {
    const hostHand = Hand.Paper;
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

    it("guest submits Rock", async () => {
      const guestHand = Hand.Rock;

      await factory.createGame(betAmount, hostHandHashed, { from: host });
      const games = await factory.games();
      const game = await GameContract.at(games[0]);

      await game.join(guestHand, { from: guest });
      await game.revealHostHand(hostHand, salt, { from: host });
      const actual = await game.winnerAddress();
      const expected = host;
      assert.equal(actual, expected, "winner should be host");
    });

    it("guest submits Scissors", async () => {
      const guestHand = Hand.Scissors;

      await factory.createGame(betAmount, hostHandHashed, { from: host });
      const games = await factory.games();
      const game = await GameContract.at(games[0]);

      await game.join(guestHand, { from: guest });
      await game.revealHostHand(hostHand, salt, { from: host });
      const actual = await game.winnerAddress();
      const expected = guest;
      assert.equal(actual, expected, "winner should be guest");
    });

    it("guest submits Paper", async () => {
      const guestHand = Hand.Paper;

      await factory.createGame(betAmount, hostHandHashed, { from: host });
      const games = await factory.games();
      const game = await GameContract.at(games[0]);

      await game.join(guestHand, { from: guest });
      await game.revealHostHand(hostHand, salt, { from: host });
      const actual = await game.winnerAddress();
      const expected = '0x0000000000000000000000000000000000000000';
      assert.equal(actual, expected, "No winner");
    });
  });
});
