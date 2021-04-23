const GameFactoryContract = artifacts.require("GameFactory");
const GameContract = artifacts.require("Game");

contract("GameFactory: deployed", () => {
  it("it has been deployed", async () => {
    const factory = await GameFactoryContract.deployed();
    assert(factory, "game factory was not deployed");;
  });
});

contract("GameFactory: createGame", accounts => {
  const host = accounts[1];
  const Hand = {
    Rock: 0,
    Paper: 1,
    Scissors: 2,
  };
  const salt = web3.utils.toHex('Thank you.');
  const hostHand = Hand.Rock;
  let factory;
  let game;
  let tx;

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
    tx = await factory.createGame(hostHandHashed, { from: host });
    const games = await factory.games();
    game = await GameContract.at(games[0]);
  });

  it("create new game", async () => {
    assert(game, "instance of Game should be present");;
  });

  it("emits the GameCreated event", async () => {
    const actual = tx.logs[0].event;
    const expected = "GameCreated";
    assert.equal(actual, expected, "events should match");
  });
});
