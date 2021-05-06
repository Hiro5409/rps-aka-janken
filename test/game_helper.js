const GameContract = artifacts.require("Game");

const MINT_AMOUNT = 100;
const BET_AMOUNT = 5;

const setupGame = async ({
  jankenToken,
  gameBank,
  accounts,
}) => {
  const master = accounts[0];
  const host = accounts[1];
  const guest = accounts[2];

  await jankenToken.mint(host, MINT_AMOUNT, { from: master });
  await jankenToken.mint(guest, MINT_AMOUNT, { from: master });
  await jankenToken.approve(gameBank.address, BET_AMOUNT, { from: host });
  await jankenToken.approve(gameBank.address, BET_AMOUNT, { from: guest });
  await gameBank.depositToken(BET_AMOUNT, { from: host });
  await gameBank.depositToken(BET_AMOUNT, { from: guest });
};

const playGame = async ({ hostHand, factory, guestHand, accounts }) => {
  const host = accounts[1];
  const guest = accounts[2];
  const salt = web3.utils.toHex('Thank you.');
  const game = await createGame({ hostHand, factory, host, salt });

  await game.join(guestHand, { from: guest });
  await game.revealHostHand(hostHand, salt, { from: host });

  const winner = await game.winnerAddress();
  const status = await game.status();

  return { winner, status, game };
};

const createGame = async ({ hostHand, factory, host, salt }) => {
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

  await factory.createGame(BET_AMOUNT, hostHandHashed, { from: host });
  const games = await factory.games();
  const gameAddress = games[0];
  const game = await GameContract.at(gameAddress);
  return game;
};

module.exports = {
  setupGame,
  playGame,
  createGame,
};

