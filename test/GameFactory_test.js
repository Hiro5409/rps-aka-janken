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


  describe("create game", () => {
    let factory;
    beforeEach(async ()=>{
      factory = await GameFactoryContract.deployed();
      const hostHand = Hand.Rock;
      const salt = 'Thank you';
      await factory.createGame(host, web3.utils.soliditySha3(hostHand, salt));
    });

    it("create a new game by host", async () => {
      const games = await factory.games();
      const game = await GameContract.at(games[0]);
      assert.equal(await game.hostAddress(), host, "address should be equal to host");
    });
  });
});
